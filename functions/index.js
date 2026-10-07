const { onRequest }  = require("firebase-functions/v2/https");
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { setGlobalOptions } = require("firebase-functions/v2");
const { initializeApp }    = require("firebase-admin/app");
const { getFirestore, FieldValue, Timestamp } = require("firebase-admin/firestore");
const { getAuth }    = require("firebase-admin/auth");
const sgMail         = require("@sendgrid/mail");
const axios          = require("axios");
const crypto         = require("crypto");

initializeApp();
setGlobalOptions({ maxInstances: 10, region: "us-central1" });

const db   = getFirestore();
const auth = getAuth();

const SUPERADMIN_EMAIL = "frivasv2388@gmail.com";
const APP_URL          = "https://cubierto.menu";

// ── Helpers ───────────────────────────────────────────────────

// Verifica el ID token de Firebase enviado como "Authorization: Bearer <token>"
async function requireUser(req, res) {
    const match = (req.headers.authorization || "").match(/^Bearer (.+)$/);
    if (!match) { res.status(401).json({ error: "No autenticado" }); return null; }
    try {
        return await auth.verifyIdToken(match[1]);
    } catch {
        res.status(401).json({ error: "Sesión inválida. Volvé a iniciar sesión." });
        return null;
    }
}

// ══════════════════════════════════════════════════════════════
//  PLANES = niveles × períodos (appConfig/plans). Misma lógica que Js/benefits-config.js
//  { tiers: [{ id, label, monthlyPrice, benefits, recommended }],
//    periods: { monthly|quarterly|annual|biennial: { discount (%), enabled } } }
// ══════════════════════════════════════════════════════════════
const PERIODS_DEFAULT = {
    monthly:   { label: "Mensual",    months: 1,  discount: 0,  enabled: true },
    quarterly: { label: "Trimestral", months: 3,  discount: 10, enabled: true },
    annual:    { label: "Anual",      months: 12, discount: 20, enabled: true },
    biennial:  { label: "Bienal",     months: 24, discount: 30, enabled: true },
};
const PERIOD_ORDER = ["monthly", "quarterly", "annual", "biennial"];
const TRIAL_DAYS   = 14;
const MONTH_MS     = 30 * 24 * 3600 * 1000;
const MIN_CHARGE   = 100;   // ARS: una mejora más barata que esto se aplica sin cobrar

function normalizePlans(data) {
    data = data || {};
    let tiers = Array.isArray(data.tiers) ? data.tiers : (data.list || [])
        .filter(p => !p.durationDays || Number(p.durationDays) <= 31)
        .map(p => ({ id: p.id, label: p.label, monthlyPrice: Number(p.price) || 0, benefits: p.benefits || null, recommended: !!p.recommended }));
    tiers = tiers.map(t => ({ ...t, monthlyPrice: Number(t.monthlyPrice) || 0 }));
    const periods = {};
    PERIOD_ORDER.forEach(id => {
        const d = PERIODS_DEFAULT[id], c = (data.periods || {})[id] || {};
        periods[id] = {
            label: d.label, months: d.months,
            discount: Math.min(Math.max(Number(c.discount ?? d.discount) || 0, 0), 90),
            enabled: id === "monthly" ? true : (c.enabled ?? d.enabled) !== false,
        };
    });
    return { tiers, periods };
}

async function getPlanConfig() {
    const snap = await db.collection("appConfig").doc("plans").get();
    return normalizePlans(snap.exists ? snap.data() : {});
}

const periodPrice = (tier, periodId, cfg) => {
    const p = cfg.periods[periodId] || cfg.periods.monthly;
    return Math.round(tier.monthlyPrice * p.months * (1 - p.discount / 100));
};
const addMonths = (ms, n) => { const d = new Date(ms); d.setMonth(d.getMonth() + n); return d.getTime(); };

// Débito automático: si un cobro falla (o el primero todavía no llegó), el plan sigue activo
// estos días después del vencimiento mientras la suscripción de MP siga autorizada.
const GRACE_MS = 5 * 24 * 3600 * 1000;

// Suscripción efectiva: un cambio programado (downgrade / cambio de período) rige desde su fecha
function effectiveSub(sub, now) {
    sub = sub || {};
    const ms = v => v?.toMillis?.() || 0;
    let planType = sub.planType, period = sub.period || "monthly", scheduled = sub.scheduled || null, due = false;
    if (scheduled && ms(scheduled.startsAt) <= now) { planType = scheduled.planType; period = scheduled.period || period; scheduled = null; due = true; }
    const paidUntil = ms(sub.paidUntil), trialEndsAt = ms(sub.trialEndsAt);
    const billingOn = sub.billing?.status === "authorized";
    // Vencido hace menos de 5 días con débito automático activo: en gracia (esperando el cobro)
    const inGrace   = billingOn && sub.status === "active" && paidUntil <= now && paidUntil + GRACE_MS > now;
    // Terminó la prueba con la suscripción ya autorizada: activo mientras llega el primer cobro
    const trialToPaid = billingOn && sub.status === "trial" && trialEndsAt <= now && trialEndsAt + GRACE_MS > now;
    return {
        active: (sub.status === "active" && paidUntil > now) || inGrace || trialToPaid,
        trial:  sub.status === "trial" && trialEndsAt > now,
        pastDue: inGrace || trialToPaid, billingOn,
        planType, period, scheduled, scheduledDue: due, paidUntil: trialToPaid ? trialEndsAt : paidUntil, trialEndsAt,
        scheduledStart: scheduled ? ms(scheduled.startsAt) : 0,
    };
}

// Qué significa comprar tierId + periodId para esta suscripción y cuánto cuesta:
//  - sin plan / en prueba / vencido → "new": arranca ya (o al terminar la prueba)
//  - activo y nivel más caro        → "upgrade": rige ya; paga la diferencia por los días que le quedan
//  - activo y mismo nivel o más barato, o cambio de período → "renew": se suma al final; si cambia
//    de nivel o período, el cambio queda programado para cuando termina lo ya pagado
function quotePurchase(sub, cfg, tierId, periodId, now) {
    const tier = cfg.tiers.find(t => t.id === tierId);
    if (!tier || !(tier.monthlyPrice > 0)) return { error: "Plan inexistente" };
    const per = cfg.periods[periodId];
    if (!per || !per.enabled) return { error: "Período no disponible" };
    const e = effectiveSub(sub, now);
    if (e.active) {
        const cur    = cfg.tiers.find(t => t.id === e.planType);
        const curEnd = e.scheduled ? e.scheduledStart : e.paidUntil;  // hasta cuándo dura el nivel actual
        const eq     = t => t.monthlyPrice * (1 - (cfg.periods[e.period]?.discount || 0) / 100);
        if (cur && tierId !== e.planType && eq(tier) > eq(cur)) {
            const amount = Math.round((eq(tier) - eq(cur)) * Math.max(0, curEnd - now) / MONTH_MS);
            return { kind: "upgrade", tier, period: e.period, amount, until: curEnd };
        }
        if (e.scheduled && (e.scheduled.planType !== tierId || (e.scheduled.period || e.period) !== periodId)) {
            return { error: "Ya tenés un cambio de plan programado. Podés renovar con ese mismo plan o escribirnos desde Soporte." };
        }
        return { kind: "renew", tier, period: periodId, amount: periodPrice(tier, periodId, cfg), startsAt: e.paidUntil };
    }
    const startsAt = e.trial ? Math.max(now, e.trialEndsAt) : now;   // en prueba: lo pago empieza cuando termina la prueba
    return { kind: "new", tier, period: periodId, amount: periodPrice(tier, periodId, cfg), startsAt };
}

// Campos de subscription a escribir (merge) para aplicar una compra ya pagada (o un cupón)
function purchaseFields(sub, q, now) {
    const e = effectiveSub(sub, now);
    const del = FieldValue.delete();
    if (q.kind === "upgrade") {
        return {
            status: "active", planType: q.tier.id, period: e.period, paidUntil: Timestamp.fromMillis(e.paidUntil),
            ...(e.scheduledDue && { scheduled: del }),
        };
    }
    const months = PERIODS_DEFAULT[q.period].months;
    if (q.kind === "renew" && e.active) {
        const base = e.paidUntil;
        const change = !e.scheduled && (q.tier.id !== e.planType || q.period !== e.period);
        return {
            status: "active", planType: e.planType, period: e.period,
            paidUntil: Timestamp.fromMillis(addMonths(base, months)),
            ...(change ? { scheduled: { planType: q.tier.id, period: q.period, startsAt: Timestamp.fromMillis(base) } }
                       : e.scheduledDue ? { scheduled: del } : {}),
        };
    }
    // Nuevo (o "renovación" de algo que ya venció)
    const start = e.trial ? Math.max(now, e.trialEndsAt) : now;
    return {
        status: "active", planType: q.tier.id, period: q.period,
        paidUntil: Timestamp.fromMillis(addMonths(start, months)), scheduled: del,
    };
}

// ── Enviar código OTP por email ───────────────────────────────

exports.sendOTP = onRequest(
    { cors: true, secrets: ["SENDGRID_API_KEY"], invoker: "public" },
    async (req, res) => {
        if (req.method !== "POST") { res.status(405).send("Method Not Allowed"); return; }

        const email = String(req.body?.email || "").trim().toLowerCase();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            res.status(400).json({ error: "Email inválido" }); return;
        }

        // Anti-spam: un código por minuto por email
        const ref  = db.collection("otpCodes").doc(email);
        const prev = await ref.get();
        const sentAt = prev.exists ? prev.data().sentAt?.toMillis?.() || 0 : 0;
        if (Date.now() - sentAt < 60 * 1000) {
            res.status(429).json({ error: "Esperá un minuto antes de pedir otro código." }); return;
        }

        const code      = String(crypto.randomInt(1000, 10000));
        const expiresAt = Timestamp.fromDate(new Date(Date.now() + 10 * 60 * 1000));

        await ref.set({ code, expiresAt, attempts: 0, sentAt: FieldValue.serverTimestamp() });

        try {
            sgMail.setApiKey(process.env.SENDGRID_API_KEY);
            await sgMail.send({
                to:   email,
                from: { email: "noreply@cubierto.menu", name: "Cubierto" },
                subject: "Tu código de verificación — Cubierto",
                html: `
                <div style="font-family:sans-serif;max-width:420px;margin:0 auto;padding:2rem;background:#f9f6f0;border-radius:14px;text-align:center">
                    <img src="${APP_URL}/img/logo-email.png" alt="Cubierto" style="height:40px;margin-bottom:1.2rem" onerror="this.style.display='none'">
                    <h2 style="color:#5c4a30;margin:0 0 .8rem;font-size:1.3rem">Verificá tu email</h2>
                    <p style="color:#7c6c5c;margin:0 0 1.5rem;font-size:.95rem">Ingresá este código en la pantalla de registro:</p>
                    <div style="font-size:2.8rem;font-weight:700;letter-spacing:.6rem;color:#3a2a1a;background:#fff;padding:1rem 2rem;border-radius:10px;display:inline-block;border:2px solid #c8b89a">${code}</div>
                    <p style="color:#bbb;font-size:.78rem;margin:1.5rem 0 0">Válido por 10 minutos.<br>Si no solicitaste esto, ignorá este mensaje.</p>
                </div>`,
            });
        } catch (err) {
            console.error("SendGrid error:", err.response?.body || err.message);
            await ref.delete();
            res.status(502).json({ error: "No pudimos enviar el email. Intentá de nuevo." }); return;
        }

        res.json({ success: true });
    }
);

// ── Verificar OTP y crear sesión ──────────────────────────────

exports.verifyOTPAndSignIn = onRequest(
    { cors: true, invoker: "public" },
    async (req, res) => {
        if (req.method !== "POST") { res.status(405).send("Method Not Allowed"); return; }

        const email = String(req.body?.email || "").trim().toLowerCase();
        const code  = req.body?.code;
        if (!email || !code) { res.status(400).json({ error: "Faltan datos" }); return; }

        const doc = await db.collection("otpCodes").doc(email).get();
        if (!doc.exists) {
            res.status(400).json({ error: "Código no encontrado o expirado" }); return;
        }

        const data = doc.data();

        if (data.expiresAt.toDate() < new Date()) {
            await doc.ref.delete();
            res.status(400).json({ error: "El código expiró. Pedí uno nuevo." }); return;
        }
        if ((data.attempts || 0) >= 5) {
            await doc.ref.delete();
            res.status(400).json({ error: "Demasiados intentos fallidos. Pedí un nuevo código." }); return;
        }
        if (data.code !== String(code)) {
            await doc.ref.update({ attempts: FieldValue.increment(1) });
            res.status(400).json({ error: "Código incorrecto" }); return;
        }

        await doc.ref.delete();

        // Crear o recuperar usuario en Firebase Auth
        let uid;
        try {
            const existing = await auth.getUserByEmail(email);
            uid = existing.uid;
        } catch {
            const newUser = await auth.createUser({ email, emailVerified: true });
            uid = newUser.uid;
        }

        const customToken = await auth.createCustomToken(uid);
        res.json({ success: true, token: customToken });
    }
);

// ══════════════════════════════════════════════════════════════
//  SUSCRIPCIONES (Mercado Pago + cupones)
//  La suscripción solo la escribe el servidor: las reglas de
//  Firestore impiden que el cliente modifique users/{uid}.subscription
// ══════════════════════════════════════════════════════════════

// Activa, renueva o mejora la suscripción a partir de un pago aprobado de MP. Idempotente.
// external_reference = "uid|q|quoteId" (cotización guardada en paymentQuotes al crear el pago).
// Formato viejo "uid|planId": se toma como plan mensual de ese nivel.
async function activateFromPayment(payment) {
    if (payment.status !== "approved") return { ok: false, reason: "not_approved" };

    const parts = String(payment.external_reference || "").split("|");
    const uid   = parts[0];
    // Débito de una suscripción (preapproval): lo maneja applyRecurringCharge
    const preId = payment.metadata?.preapproval_id || payment.point_of_interaction?.transaction_data?.subscription_id;
    if (parts[1] === "s" || (!parts[1] && preId)) {
        return applyRecurringCharge({ subId: parts[1] === "s" ? parts[2] : null, preapprovalId: preId, paymentId: payment.id, amount: payment.transaction_amount });
    }
    const cfg   = await getPlanConfig();
    let quote = null, quoteRef = null;
    if (parts[1] === "q" && parts[2]) {
        quoteRef = db.collection("paymentQuotes").doc(parts[2]);
        const qs = await quoteRef.get();
        if (qs.exists && qs.data().uid === uid) quote = qs.data();
    } else if (parts[1]) {
        quote = { tierId: parts[1], period: "monthly", kind: "auto", amount: null };
    }
    const tier = quote && cfg.tiers.find(t => t.id === quote.tierId);

    const unmatched = async reason => {
        await db.collection("unmatchedPayments").doc(String(payment.id)).set({
            paymentId: String(payment.id),
            amount:    payment.transaction_amount,
            payerEmail: payment.payer?.email || null,
            externalReference: payment.external_reference || null,
            reason, createdAt: FieldValue.serverTimestamp(),
        }, { merge: true });
        console.warn("MP: pago sin aplicar", payment.id, reason);
        return { ok: false, reason };
    };
    if (!uid || !quote || !tier) return unmatched(!uid ? "sin_external_reference" : "plan_inexistente");

    const expected = quote.amount ?? periodPrice(tier, quote.period, cfg);
    if (Number(payment.transaction_amount) + 0.01 < Number(expected)) {
        console.warn(`MP: monto ${payment.transaction_amount} menor al cotizado (${expected})`);
        return { ok: false, reason: "amount_mismatch" };
    }

    const userRef = db.collection("users").doc(uid);
    const result = await db.runTransaction(async tx => {
        const snap = await tx.get(userRef);
        const used = quoteRef ? (await tx.get(quoteRef)).data()?.paymentId : null;
        if (!snap.exists) return { ok: false, reason: "user_not_found" };
        const sub = snap.data().subscription || {};
        // Idempotente: el mismo pago (webhook + checkPayment, o reintentos de MP) se aplica una sola vez
        if (sub.mpPaymentId === String(payment.id) || used === String(payment.id)) return { ok: true, already: true, plan: tier.label };
        if (used) return { ok: false, reason: "cotizacion_ya_usada" };

        const now = Date.now();
        const e   = effectiveSub(sub, now);
        // La cotización dice qué se pagó; si la situación cambió (ej. una mejora que se paga
        // después de que venció el plan), se registra para revisarla a mano.
        let q;
        if (quote.kind === "upgrade") {
            if (!e.active) return { ok: false, reason: "upgrade_sin_plan_activo" };
            q = { kind: "upgrade", tier, period: e.period };
        } else {
            q = { kind: e.active ? "renew" : "new", tier, period: quote.period };
        }
        const fields = purchaseFields(sub, q, now);
        tx.set(userRef, { subscription: { ...fields, paidAt: FieldValue.serverTimestamp(), mpPaymentId: String(payment.id) } }, { merge: true });
        if (quoteRef) tx.set(quoteRef, { usedAt: FieldValue.serverTimestamp(), paymentId: String(payment.id) }, { merge: true });
        return { ok: true, plan: tier.label, kind: q.kind, period: q.period, paidUntil: fields.paidUntil?.toMillis?.() || null };
    });
    if (!result.ok && ["upgrade_sin_plan_activo", "cotizacion_ya_usada"].includes(result.reason)) return unmatched(result.reason);
    // Después de una mejora, los próximos débitos automáticos pasan al precio del plan nuevo
    if (result.ok && result.kind === "upgrade" && !result.already) await syncBillingAmount(uid).catch(err => console.warn("syncBillingAmount", err.response?.data || err.message));
    return result;
}

async function fetchMpPayment(paymentId) {
    const { data } = await axios.get(
        `https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`,
        { headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` } }
    );
    return data;
}

// ── Crear preferencia de pago (Checkout Pro) ──────────────────
// Body: { planId (nivel), period }. El servidor decide si es alta, renovación o mejora y
// calcula el monto (nunca viene del cliente). La cotización queda en paymentQuotes/{id}
// y el external_reference "uid|q|id" la vincula con el pago.
// Con { preview: true } solo devuelve la cotización (para mostrarla antes de pagar).

exports.createPayment = onRequest(
    { cors: true, secrets: ["MP_ACCESS_TOKEN"], invoker: "public" },
    async (req, res) => {
        if (req.method !== "POST") { res.status(405).send("Method Not Allowed"); return; }
        const user = await requireUser(req, res);
        if (!user) return;

        const cfg     = await getPlanConfig();
        const userRef = db.collection("users").doc(user.uid);
        const sub     = (await userRef.get()).data()?.subscription || {};
        if (sub.status === "blocked") { res.status(403).json({ error: "Tu cuenta está suspendida. Escribinos desde Soporte." }); return; }

        const now = Date.now();
        const q = quotePurchase(sub, cfg, String(req.body?.planId || ""), String(req.body?.period || "monthly"), now);
        if (q.error) { res.status(400).json({ error: q.error }); return; }
        const summary = { kind: q.kind, plan: q.tier.label, period: q.period, amount: q.amount,
                          startsAt: q.startsAt || null, until: q.until || null };
        if (req.body?.preview) { res.json(summary); return; }
        // Altas, renovaciones y cambios van por débito automático (subscribe); acá solo se cobra la diferencia de una mejora
        if (q.kind !== "upgrade") { res.status(400).json({ error: "Elegí el plan con la suscripción automática.", code: "use_subscribe" }); return; }

        // Mejora de pocos pesos (le quedan muy pocos días): se aplica sin cobrar
        if (q.kind === "upgrade" && q.amount < MIN_CHARGE) {
            await db.runTransaction(async tx => {
                const s = (await tx.get(userRef)).data()?.subscription || {};
                tx.set(userRef, { subscription: purchaseFields(s, { kind: "upgrade", tier: q.tier }, Date.now()) }, { merge: true });
            });
            await syncBillingAmount(user.uid).catch(err => console.warn("syncBillingAmount", err.response?.data || err.message));
            res.json({ applied: true, ...summary }); return;
        }

        try {
            const quoteRef = db.collection("paymentQuotes").doc();
            await quoteRef.set({ uid: user.uid, tierId: q.tier.id, period: q.period, kind: q.kind, amount: q.amount, createdAt: FieldValue.serverTimestamp() });
            const periodLabel = PERIODS_DEFAULT[q.period].label.toLowerCase();
            const { data: pref } = await axios.post(
                "https://api.mercadopago.com/checkout/preferences",
                {
                    items: [{
                        id:          `${q.tier.id}-${q.period}`,
                        title:       q.kind === "upgrade" ? `Cubierto — Mejora a plan ${q.tier.label}` : `Cubierto — Plan ${q.tier.label} (${periodLabel})`,
                        quantity:    1,
                        currency_id: "ARS",
                        unit_price:  Number(q.amount),
                    }],
                    payer:              user.email ? { email: user.email } : undefined,
                    external_reference: `${user.uid}|q|${quoteRef.id}`,
                    back_urls: {
                        success: `${APP_URL}/checkout.html`,
                        pending: `${APP_URL}/checkout.html`,
                        failure: `${APP_URL}/checkout.html`,
                    },
                    auto_return: "approved",
                    statement_descriptor: "CUBIERTO",
                },
                { headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` } }
            );

            await userRef.set({ subscription: { paymentInitiated: FieldValue.serverTimestamp() } }, { merge: true });
            res.json({ url: pref.init_point, ...summary });
        } catch (err) {
            console.error("MP createPayment:", err.response?.data || err.message);
            res.status(502).json({ error: "No se pudo iniciar el pago. Intentá de nuevo." });
        }
    }
);

// ══════════════════════════════════════════════════════════════
//  COBRO AUTOMÁTICO — Mercado Pago Suscripciones (preapproval)
//  billingSubs/{id}: { uid, preapprovalId, tierId, period, amount, startAt, status }
//  users/{uid}.subscription.billing: { subId, preapprovalId, status, tierId, period, amount,
//                                      lastChargeAt, lastFailureAt }
//  external_reference del preapproval = "uid|s|billingSubId"
//  - Cada cobro aprobado extiende paidUntil un período (desde el vencimiento anterior).
//  - Downgrade con el mismo período: solo cambia el monto del próximo débito.
//  - Cambio de período: suscripción nueva que arranca al terminar lo pagado; al autorizarla
//    se cancela la anterior.
// ══════════════════════════════════════════════════════════════
const MP_API    = "https://api.mercadopago.com";
const mpHeaders = () => ({ Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` });
const tsMs      = v => v?.toMillis?.() || 0;

const mpGetPreapproval    = async id => (await axios.get(`${MP_API}/preapproval/${encodeURIComponent(id)}`, { headers: mpHeaders() })).data;
const mpUpdatePreapproval = async (id, body) => (await axios.put(`${MP_API}/preapproval/${encodeURIComponent(id)}`, body, { headers: mpHeaders() })).data;

// Ajusta el monto de los próximos débitos al plan que corresponde (después de un upgrade)
async function syncBillingAmount(uid) {
    const userRef = db.collection("users").doc(uid);
    const sub = (await userRef.get()).data()?.subscription || {};
    const b = sub.billing;
    if (b?.status !== "authorized" || !b.preapprovalId) return;
    const cfg = await getPlanConfig();
    // El próximo débito es del plan programado (si hay) o del actual
    const target = sub.scheduled ? { planType: sub.scheduled.planType, period: sub.scheduled.period || sub.period } : { planType: sub.planType, period: sub.period };
    const tier = cfg.tiers.find(t => t.id === target.planType);
    if (!tier || (target.period || "monthly") !== b.period) return;
    const amount = periodPrice(tier, b.period, cfg);
    if (amount === b.amount && tier.id === b.tierId) return;
    await mpUpdatePreapproval(b.preapprovalId, { auto_recurring: { transaction_amount: amount, currency_id: "ARS" } });
    await userRef.set({ subscription: { billing: { amount, tierId: tier.id } } }, { merge: true });
}

// La suscripción de MP cambió de estado (autorizada, pausada, cancelada)
async function applyPreapproval(pre) {
    const [uid, tag, subId] = String(pre.external_reference || "").split("|");
    if (tag !== "s" || !uid || !subId) return { ok: false, reason: "no_es_de_cubierto" };
    const bsRef   = db.collection("billingSubs").doc(subId);
    const userRef = db.collection("users").doc(uid);
    let cancelOld = null;
    const result = await db.runTransaction(async tx => {
        const [bs, us] = await Promise.all([tx.get(bsRef), tx.get(userRef)]);
        if (!bs.exists || bs.data().uid !== uid || !us.exists) return { ok: false, reason: "suscripcion_desconocida" };
        const d = bs.data(), sub = us.data().subscription || {}, b = sub.billing || {};
        const status = String(pre.status || "");
        tx.set(bsRef, { status, preapprovalId: pre.id, updatedAt: FieldValue.serverTimestamp() }, { merge: true });

        if (status === "authorized") {
            if (b.subId === subId && b.status === "authorized") return { ok: true, already: true, status };
            const now = Date.now();
            const e   = effectiveSub(sub, now);
            if (b.preapprovalId && b.preapprovalId !== pre.id && b.status === "authorized") cancelOld = b.preapprovalId;
            const fields = { billing: {
                provider: "mp", subId, preapprovalId: pre.id, status: "authorized",
                tierId: d.tierId, period: d.period, amount: d.amount, startAt: d.startAt,
                authorizedAt: FieldValue.serverTimestamp(), lastFailureAt: FieldValue.delete(),
            } };
            if (e.trial) {
                // Arranca cuando termina la prueba (ese día es el primer débito)
                fields.planType = d.tierId; fields.period = d.period;
            } else if (e.active && !e.pastDue) {
                // Ya tiene un período pagado: el plan elegido rige desde que termina
                if (d.tierId !== e.planType || d.period !== e.period) {
                    fields.scheduled = { planType: d.tierId, period: d.period, startsAt: Timestamp.fromMillis(e.paidUntil) };
                }
            } else {
                // Sin plan, vencido o en gracia: activo ya, esperando el primer cobro (gracia de 5 días)
                fields.status = "active"; fields.planType = d.tierId; fields.period = d.period;
                fields.paidUntil = Timestamp.fromMillis(e.pastDue && e.paidUntil ? e.paidUntil : Math.max(now, tsMs(d.startAt)));
                fields.scheduled = FieldValue.delete();
            }
            tx.set(userRef, { subscription: fields }, { merge: true });
            return { ok: true, status };
        }
        if ((status === "cancelled" || status === "paused") && b.preapprovalId === pre.id) {
            tx.set(userRef, { subscription: { billing: { status } } }, { merge: true });
        }
        return { ok: true, status };
    });
    if (cancelOld) await mpUpdatePreapproval(cancelOld, { status: "cancelled" }).catch(err => console.warn("No se pudo cancelar la suscripción anterior", cancelOld, err.response?.data || err.message));
    return result;
}

// Un débito automático aprobado: extiende el plan un período. Idempotente por id de pago.
async function applyRecurringCharge({ subId, preapprovalId, paymentId, amount }) {
    let bs = null;
    if (subId) bs = await db.collection("billingSubs").doc(String(subId)).get();
    if ((!bs || !bs.exists) && preapprovalId) {
        const q = await db.collection("billingSubs").where("preapprovalId", "==", String(preapprovalId)).limit(1).get();
        bs = q.docs[0] || null;
    }
    if (!bs || !bs.exists) {
        await db.collection("unmatchedPayments").doc(String(paymentId)).set({
            paymentId: String(paymentId), amount: amount ?? null, preapprovalId: preapprovalId || null,
            reason: "debito_sin_suscripcion", createdAt: FieldValue.serverTimestamp() }, { merge: true });
        return { ok: false, reason: "debito_sin_suscripcion" };
    }
    const d = bs.data();
    const userRef = db.collection("users").doc(d.uid);
    const procRef = db.collection("processedPayments").doc(String(paymentId));
    const cfg = await getPlanConfig();
    return db.runTransaction(async tx => {
        const [proc, us] = await Promise.all([tx.get(procRef), tx.get(userRef)]);
        if (proc.exists) return { ok: true, already: true };
        const sub = us.data()?.subscription || {};
        const now = Date.now();
        const months = PERIODS_DEFAULT[d.period]?.months || 1;
        // El período nuevo empieza donde terminó el anterior (o al terminar la prueba)
        let base = sub.status === "trial" ? tsMs(sub.trialEndsAt) : tsMs(sub.paidUntil);
        if (!base || base < now - 10 * 24 * 3600 * 1000) base = now;   // estuvo vencido mucho tiempo
        let planType = sub.planType || d.tierId, period = sub.period || d.period;
        const fields = {
            status: "active", paidAt: FieldValue.serverTimestamp(), mpPaymentId: String(paymentId),
            billing: { lastChargeAt: FieldValue.serverTimestamp(), lastFailureAt: FieldValue.delete() },
        };
        // El plan programado (downgrade / cambio de período) rige desde este cobro
        if (sub.scheduled && tsMs(sub.scheduled.startsAt) <= base + 60 * 1000) {
            planType = sub.scheduled.planType; period = sub.scheduled.period || period; fields.scheduled = FieldValue.delete();
        }
        if (sub.status === "trial") { planType = d.tierId; period = d.period; }
        fields.planType  = planType;
        fields.period    = period;
        fields.paidUntil = Timestamp.fromMillis(addMonths(base, PERIODS_DEFAULT[period]?.months || months));
        tx.set(userRef, { subscription: fields }, { merge: true });
        tx.set(procRef, { uid: d.uid, subId: bs.id, amount: amount ?? null, at: FieldValue.serverTimestamp() });
        return { ok: true, plan: cfg.tiers.find(t => t.id === planType)?.label || planType, paidUntil: fields.paidUntil.toMillis() };
    });
}

// Un débito automático rechazado: se marca para avisar en el dashboard (la gracia la da el vencimiento)
async function markChargeFailure(preapprovalId) {
    const q = await db.collection("billingSubs").where("preapprovalId", "==", String(preapprovalId)).limit(1).get();
    if (q.empty) return;
    await db.collection("users").doc(q.docs[0].data().uid).set({ subscription: { billing: { lastFailureAt: FieldValue.serverTimestamp() } } }, { merge: true });
}

// ── Suscribirse / cambiar de plan con débito automático ──────
// Body: { planId, period, payerEmail?, preview? }
//  - Mejora (nivel más caro): se rechaza acá → createPayment cobra la diferencia.
//  - Ya tiene débito automático con el mismo período: solo cambia el monto del próximo débito.
//  - Si no: suscripción nueva en MP que arranca ya, al terminar la prueba o al terminar lo pagado.
exports.subscribe = onRequest(
    { cors: true, secrets: ["MP_ACCESS_TOKEN"], invoker: "public" },
    async (req, res) => {
        if (req.method !== "POST") { res.status(405).send("Method Not Allowed"); return; }
        const user = await requireUser(req, res);
        if (!user) return;

        const cfg     = await getPlanConfig();
        const userRef = db.collection("users").doc(user.uid);
        const sub     = (await userRef.get()).data()?.subscription || {};
        if (sub.status === "blocked") { res.status(403).json({ error: "Tu cuenta está suspendida. Escribinos desde Soporte." }); return; }

        const now = Date.now();
        const tierId = String(req.body?.planId || ""), periodId = String(req.body?.period || "monthly");
        const q = quotePurchase({ ...sub, scheduled: null }, cfg, tierId, periodId, now);
        if (q.error) { res.status(400).json({ error: q.error }); return; }
        if (q.kind === "upgrade") { res.status(400).json({ error: "Para pasar a un plan superior usá «Mejorar ahora».", code: "use_upgrade" }); return; }

        const e = effectiveSub(sub, now);
        const b = sub.billing || {};
        const months = PERIODS_DEFAULT[periodId].months;
        const amount = periodPrice(q.tier, periodId, cfg);

        // 1) Débito automático activo con el mismo período → cambia el monto del próximo débito
        if (b.status === "authorized" && b.period === periodId && b.preapprovalId) {
            const startsAt = e.paidUntil || now;
            const summary = { mode: "change", plan: q.tier.label, period: periodId, amount, months, startsAt };
            if (req.body?.preview) { res.json(summary); return; }
            const sameAsNow = tierId === e.planType;
            try {
                await mpUpdatePreapproval(b.preapprovalId, { auto_recurring: { transaction_amount: amount, currency_id: "ARS" } });
            } catch (err) {
                console.error("MP update preapproval:", err.response?.data || err.message);
                res.status(502).json({ error: "No se pudo cambiar el plan en Mercado Pago. Intentá de nuevo." }); return;
            }
            await userRef.set({ subscription: {
                billing: { amount, tierId },
                scheduled: sameAsNow ? FieldValue.delete() : { planType: tierId, period: periodId, startsAt: Timestamp.fromMillis(startsAt) },
            } }, { merge: true });
            res.json({ changed: true, ...summary }); return;
        }

        // 2) Suscripción nueva en MP
        const startsAt = Math.max(now + 2 * 60 * 1000, e.active && !e.pastDue ? e.paidUntil : 0, e.trial ? e.trialEndsAt : 0);
        const summary = { mode: "subscribe", plan: q.tier.label, period: periodId, amount, months, startsAt, firstChargeNow: startsAt < now + 10 * 60 * 1000 };
        if (req.body?.preview) { res.json(summary); return; }

        const payerEmail = String(req.body?.payerEmail || user.email || "").trim().toLowerCase();
        if (!/^[^@\s]+@[^@\s]+[.][^@\s]+$/.test(payerEmail)) { res.status(400).json({ error: "Ingresá el email de tu cuenta de Mercado Pago." }); return; }

        const bsRef = db.collection("billingSubs").doc();
        try {
            const periodLabel = PERIODS_DEFAULT[periodId].label.toLowerCase();
            const { data: pre } = await axios.post(`${MP_API}/preapproval`, {
                reason: `Cubierto — Plan ${q.tier.label} (${periodLabel})`,
                external_reference: `${user.uid}|s|${bsRef.id}`,
                payer_email: payerEmail,
                auto_recurring: {
                    frequency: months, frequency_type: "months",
                    start_date: new Date(startsAt).toISOString(),
                    transaction_amount: amount, currency_id: "ARS",
                },
                back_url: `${APP_URL}/checkout.html?sub=${bsRef.id}`,
                status: "pending",
            }, { headers: mpHeaders() });
            await bsRef.set({
                uid: user.uid, preapprovalId: pre.id, tierId, period: periodId, amount, payerEmail,
                startAt: Timestamp.fromMillis(startsAt), status: pre.status || "pending", createdAt: FieldValue.serverTimestamp(),
            });
            res.json({ url: pre.init_point, ...summary });
        } catch (err) {
            console.error("MP preapproval:", err.response?.data || err.message);
            res.status(502).json({ error: "No se pudo iniciar la suscripción en Mercado Pago. Revisá que el email sea el de tu cuenta de Mercado Pago e intentá de nuevo." });
        }
    }
);

// ── Al volver de autorizar la suscripción en MP ───────────────
// Respaldo del webhook: consulta el estado real en MP y lo aplica.
exports.checkSubscription = onRequest(
    { cors: true, secrets: ["MP_ACCESS_TOKEN"], invoker: "public" },
    async (req, res) => {
        if (req.method !== "POST") { res.status(405).send("Method Not Allowed"); return; }
        const user = await requireUser(req, res);
        if (!user) return;
        const bs = await db.collection("billingSubs").doc(String(req.body?.subId || "_")).get();
        if (!bs.exists || bs.data().uid !== user.uid) { res.status(404).json({ error: "Suscripción no encontrada" }); return; }
        try {
            const pre = await mpGetPreapproval(bs.data().preapprovalId);
            const result = await applyPreapproval(pre);
            const cfg = await getPlanConfig();
            res.json({ status: pre.status, ok: !!result.ok, plan: cfg.tiers.find(t => t.id === bs.data().tierId)?.label || bs.data().tierId,
                       period: bs.data().period, amount: bs.data().amount, startsAt: tsMs(bs.data().startAt) });
        } catch (err) {
            console.error("MP checkSubscription:", err.response?.data || err.message);
            res.status(502).json({ error: "No se pudo verificar la suscripción" });
        }
    }
);

// ── Cancelar la renovación automática ─────────────────────────
// El plan sigue hasta el vencimiento de lo ya pagado.
exports.cancelSubscription = onRequest(
    { cors: true, secrets: ["MP_ACCESS_TOKEN"], invoker: "public" },
    async (req, res) => {
        if (req.method !== "POST") { res.status(405).send("Method Not Allowed"); return; }
        const user = await requireUser(req, res);
        if (!user) return;
        const userRef = db.collection("users").doc(user.uid);
        const b = (await userRef.get()).data()?.subscription?.billing;
        if (!b?.preapprovalId || b.status !== "authorized") { res.status(400).json({ error: "No tenés una renovación automática activa." }); return; }
        try {
            await mpUpdatePreapproval(b.preapprovalId, { status: "cancelled" });
        } catch (err) {
            console.error("MP cancel preapproval:", err.response?.data || err.message);
            res.status(502).json({ error: "No se pudo cancelar en Mercado Pago. Intentá de nuevo." }); return;
        }
        await userRef.set({ subscription: { billing: { status: "cancelled", cancelledAt: FieldValue.serverTimestamp() }, scheduled: FieldValue.delete() } }, { merge: true });
        res.json({ ok: true });
    }
);

// ── Prueba gratis de 14 días ──────────────────────────────────
// Una sola vez por cuenta, y solo si nunca tuvo un plan pago.
exports.startTrial = onRequest(
    { cors: true, invoker: "public" },
    async (req, res) => {
        if (req.method !== "POST") { res.status(405).send("Method Not Allowed"); return; }
        const user = await requireUser(req, res);
        if (!user) return;
        const userRef = db.collection("users").doc(user.uid);
        const result = await db.runTransaction(async tx => {
            const snap = await tx.get(userRef);
            const sub  = snap.data()?.subscription || {};
            const eligible = !sub.trialUsed && !sub.paidUntil && !["active", "trial", "blocked", "pending_payment"].includes(sub.status);
            if (!eligible) return null;
            const now = Date.now(), ends = now + TRIAL_DAYS * 24 * 3600 * 1000;
            tx.set(userRef, {
                email: snap.data()?.email || user.email || null,
                subscription: { status: "trial", trialUsed: true, trialStartedAt: Timestamp.fromMillis(now), trialEndsAt: Timestamp.fromMillis(ends) },
            }, { merge: true });
            return { status: "trial", trialUsed: true, trialEndsAt: ends };
        });
        res.json(result ? { subscription: result } : { subscription: null });
    }
);

// ── Verificar un pago al volver de MP ─────────────────────────
// Respaldo del webhook: activa en el momento sin esperar la notificación.

exports.checkPayment = onRequest(
    { cors: true, secrets: ["MP_ACCESS_TOKEN"], invoker: "public" },
    async (req, res) => {
        if (req.method !== "POST") { res.status(405).send("Method Not Allowed"); return; }
        const user = await requireUser(req, res);
        if (!user) return;

        const paymentId = String(req.body?.paymentId || "");
        if (!/^\d+$/.test(paymentId)) { res.status(400).json({ error: "Pago inválido" }); return; }

        try {
            const payment = await fetchMpPayment(paymentId);
            if (String(payment.external_reference || "").split("|")[0] !== user.uid) {
                res.status(403).json({ error: "El pago no corresponde a esta cuenta" }); return;
            }
            if (payment.status === "approved") {
                const result = await activateFromPayment(payment);
                res.json({ status: result.ok ? "active" : "error", ...result }); return;
            }
            if (payment.status === "pending" || payment.status === "in_process") {
                await db.collection("users").doc(user.uid).set({
                    subscription: { status: "pending_payment" },
                }, { merge: true });
            }
            res.json({ status: payment.status });
        } catch (err) {
            console.error("MP checkPayment:", err.response?.data || err.message);
            res.status(502).json({ error: "No se pudo verificar el pago" });
        }
    }
);

// ── Webhook de Mercado Pago ───────────────────────────────────

exports.mpWebhook = onRequest(
    { secrets: ["MP_ACCESS_TOKEN", "MP_WEBHOOK_SECRET"], invoker: "public" },
    async (req, res) => {
        try {
            // Verificar firma de MP: si hay secreto configurado, la firma es obligatoria
            const secret = process.env.MP_WEBHOOK_SECRET;
            const dataId = String(req.query?.["data.id"] || req.body?.data?.id || "");
            if (secret) {
                const xSignature = req.headers["x-signature"] || "";
                const xRequestId = req.headers["x-request-id"] || "";
                const ts = (xSignature.match(/ts=([^,]+)/) || [])[1];
                const v1 = (xSignature.match(/v1=([^,]+)/) || [])[1];
                if (!ts || !v1) {
                    console.warn("MP webhook: sin firma, ignorando");
                    res.status(401).send("Unauthorized"); return;
                }
                // MP firma el id en minúsculas si es alfanumérico
                const manifest = `id:${dataId.toLowerCase()};request-id:${xRequestId};ts:${ts};`;
                const expected = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
                const a = Buffer.from(expected), b = Buffer.from(v1);
                if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
                    console.warn("MP webhook: firma inválida, ignorando");
                    res.status(401).send("Unauthorized"); return;
                }
            }

            const type = req.body?.type || req.query?.type || req.query?.topic;
            if (!dataId) { res.status(200).send("OK"); return; }

            // La API de MP es la fuente de verdad (no el body de la notificación)
            if (type === "payment") {
                const payment = await fetchMpPayment(dataId);
                const result  = await activateFromPayment(payment);
                console.log("MP webhook payment", dataId, payment.status, JSON.stringify(result));
            } else if (type === "subscription_preapproval" || type === "preapproval") {
                // La suscripción se autorizó, pausó o canceló
                const pre    = await mpGetPreapproval(dataId);
                const result = await applyPreapproval(pre);
                console.log("MP webhook preapproval", dataId, pre.status, JSON.stringify(result));
            } else if (type === "subscription_authorized_payment" || type === "authorized_payment") {
                // Un débito automático: aprobado → extiende el plan; rechazado → aviso (con 5 días de gracia)
                const { data: ap } = await axios.get(`${MP_API}/authorized_payments/${encodeURIComponent(dataId)}`, { headers: mpHeaders() });
                if (ap.payment?.status === "approved") {
                    const result = await applyRecurringCharge({ preapprovalId: ap.preapproval_id, paymentId: ap.payment.id, amount: ap.transaction_amount });
                    console.log("MP webhook débito", dataId, JSON.stringify(result));
                } else if (ap.payment?.status === "rejected" || ap.status === "recycling") {
                    await markChargeFailure(ap.preapproval_id);
                    console.log("MP webhook débito rechazado", dataId, ap.status, ap.payment?.status_detail);
                }
            }
            res.status(200).send("OK");
        } catch (err) {
            console.error("MP webhook error:", err.response?.data || err.message);
            res.status(500).send("Error"); // MP reintenta
        }
    }
);

// ── Canjear cupón ─────────────────────────────────────────────
// Los cupones ya no son legibles desde el cliente (ver firestore.rules).

exports.redeemCoupon = onRequest(
    { cors: true, invoker: "public" },
    async (req, res) => {
        if (req.method !== "POST") { res.status(405).send("Method Not Allowed"); return; }
        const user = await requireUser(req, res);
        if (!user) return;

        const code = String(req.body?.code || "").trim().toUpperCase();
        if (!code) { res.status(400).json({ error: "Ingresá un código" }); return; }

        const cfg        = await getPlanConfig();
        const couponsRef = db.collection("appConfig").doc("coupons");
        const userRef    = db.collection("users").doc(user.uid);

        try {
            const result = await db.runTransaction(async tx => {
                const [cSnap, uSnap] = await Promise.all([tx.get(couponsRef), tx.get(userRef)]);
                const list = cSnap.exists ? (cSnap.data().list || []) : [];
                const idx  = list.findIndex(c => c.code === code && c.active);
                if (idx === -1) return { error: "Código inválido o ya utilizado." };

                const coupon = list[idx];
                if (coupon.usesMax > 0 && (coupon.usesCount || 0) >= coupon.usesMax) {
                    return { error: "Este cupón ya alcanzó su límite de usos." };
                }
                if ((coupon.redeemedBy || []).includes(user.uid)) {
                    return { error: "Ya usaste este cupón." };
                }

                // El cupón regala un nivel por un período (mensual si no dice otro). Si ya tiene un plan
                // activo, se suma al final como una renovación.
                const tier   = cfg.tiers.find(t => t.id === coupon.planId);
                const period = PERIODS_DEFAULT[coupon.period] ? coupon.period : "monthly";
                if (!tier) return { error: "El plan de este cupón ya no existe. Escribinos desde Soporte." };
                const now = Date.now();
                const sub = uSnap.data()?.subscription || {};
                const e   = effectiveSub(sub, now);
                if (e.active && e.scheduled && (e.scheduled.planType !== tier.id || (e.scheduled.period || e.period) !== period)) {
                    return { error: "Ya tenés un cambio de plan programado. Escribinos desde Soporte para aplicar el cupón." };
                }
                const fields = purchaseFields(sub, { kind: e.active ? "renew" : "new", tier, period }, now);

                list[idx] = {
                    ...coupon,
                    usesCount:  (coupon.usesCount || 0) + 1,
                    redeemedBy: [...(coupon.redeemedBy || []), user.uid],
                };
                tx.set(couponsRef, { list }, { merge: true });
                tx.set(userRef, {
                    email: uSnap.data()?.email || user.email || null,
                    subscription: { ...fields, paidAt: FieldValue.serverTimestamp(), coupon: code },
                }, { merge: true });
                return { ok: true, plan: tier.label, period, months: PERIODS_DEFAULT[period].months };
            });

            if (result.error) { res.status(400).json(result); return; }
            res.json(result);
        } catch (err) {
            console.error("redeemCoupon:", err.message);
            res.status(500).json({ error: "Error al aplicar el cupón. Intentá de nuevo." });
        }
    }
);

// ══════════════════════════════════════════════════════════════
//  PEDIDOS DESDE LA MESA
//  restaurants/{r}/config/ordering   → público: enabled, approvalMode, tableSessions, wifiCheck,
//                                      geo, tables, printMode
//  restaurants/{r}/mesas/{tableId}   → público: { open, openedAt, lastActivityAt } (mesa abierta)
//  restaurants/{r}/private/ordering  → privado: printerKey, webhook, counter, rate, knownIps
//  restaurants/{r}/pedidos/{id}      → los crea solo el servidor
//
//  Verificación de presencia (de más fuerte a más débil):
//   1. Mesa abierta por el mozo (vence tras 6 h sin actividad)
//   2. Mismo Wi-Fi que el tablero del local (IP pública registrada por registerDevice)
//   3. GPS (solo se pide si 1 y 2 no alcanzan)
// ══════════════════════════════════════════════════════════════

// Restricciones alimentarias que el comensal puede marcar (misma lista que Js/restrictions.js)
const RESTRICTIONS = {
    sin_tacc: "Sin TACC", sin_lactosa: "Sin lactosa", vegano: "Vegano", vegetariano: "Vegetariano",
    sin_azucar: "Sin azúcar", sin_frutos_secos: "Sin frutos secos", sin_huevo: "Sin huevo",
    sin_pescado: "Sin pescado ni mariscos",
};

const TABLE_SESSION_TTL = 6 * 3600 * 1000;   // mesa abierta sin actividad → se considera cerrada
const KNOWN_IP_TTL      = 30 * 60 * 1000;    // IP del local válida si el tablero la reportó hace < 30 min

function distanceMeters(lat1, lng1, lat2, lng2) {
    const R = 6371000, rad = x => x * Math.PI / 180;
    const dLat = rad(lat2 - lat1), dLng = rad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
}

// IP pública del cliente. El front-end de Google AGREGA la IP real al final de
// X-Forwarded-For; las entradas anteriores las puede inventar el cliente, así que
// se usa la última. (pedidos.html muestra la IP detectada para verificarlo.)
function clientIp(req) {
    const xff = String(req.headers["x-forwarded-for"] || "").split(",").map(s => s.trim()).filter(Boolean);
    return xff[xff.length - 1] || req.ip || "";
}

// Clave de red: IPv4 completa; IPv6 solo el prefijo /64 (cada celular tiene su propia IPv6,
// pero todos los dispositivos de la misma red Wi-Fi comparten el prefijo)
function networkKey(ip) {
    ip = String(ip || "").trim().replace(/^::ffff:/i, "");
    if (!ip) return null;
    if (!ip.includes(":")) return /^\d{1,3}(\.\d{1,3}){3}$/.test(ip) ? `v4_${ip}` : null;
    const [head, tail = ""] = ip.split("::");
    const h = head ? head.split(":") : [], t = tail ? tail.split(":") : [];
    const full = ip.includes("::") ? [...h, ...Array(Math.max(0, 8 - h.length - t.length)).fill("0"), ...t] : h;
    if (full.length !== 8 || full.some(x => !/^[0-9a-f]{1,4}$/i.test(x))) return null;
    return "v6_" + full.slice(0, 4).map(x => parseInt(x, 16).toString(16)).join("_");
}

const isTableOpen = (mesaData, now = Date.now()) => !!mesaData?.open &&
    now - (mesaData.lastActivityAt?.toMillis?.() || mesaData.openedAt?.toMillis?.() || 0) < TABLE_SESSION_TTL;

// ── Límite de pedidos (config/ordering.limits) y pausa (config/ordering.pause) ──
// limits: { enabled, max, period: 'day' | 'week' | 'hours', hours, message }
//   day/week: día o semana (lunes) calendario, hora Argentina (UTC−3, sin horario de verano)
//   hours:    ventana móvil de las últimas N horas
// El mensaje puede incluir {hasta}, que se reemplaza por la fecha en que se vuelve a recibir pedidos.
const AR_OFFSET = 3 * 3600 * 1000;
const DAY_MS    = 24 * 3600 * 1000;

function capacityWindow(limits, now) {
    if (limits.period === "hours") {
        const h = Math.min(Math.max(Number(limits.hours) || 1, 1), 24 * 30);
        return { start: now - h * 3600 * 1000, rolling: h * 3600 * 1000 };
    }
    const local    = now - AR_OFFSET;                       // "hora Argentina" expresada como UTC
    const dayStart = Math.floor(local / DAY_MS) * DAY_MS;
    if (limits.period === "week") {
        const dow = (new Date(dayStart).getUTCDay() + 6) % 7; // lunes = 0
        const start = dayStart - dow * DAY_MS + AR_OFFSET;
        return { start, end: start + 7 * DAY_MS };
    }
    const start = dayStart + AR_OFFSET;
    return { start, end: start + DAY_MS };
}

// "miércoles 7 de octubre a las 00:00 h" (hora Argentina, 24 h). Igual en table-ordering.js y pedidos.js.
function formatArDate(ms) {
    const p = Object.fromEntries(new Intl.DateTimeFormat("es-AR", {
        timeZone: "America/Argentina/Buenos_Aires", weekday: "long", day: "numeric", month: "long",
        hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(new Date(ms)).map(x => [x.type, x.value]));
    return `${p.weekday} ${p.day} de ${p.month} a las ${p.hour}:${p.minute} h`;
}

const DEFAULT_CAPACITY_MSG = "Por ahora no podemos recibir más pedidos. Vas a poder volver a pedir desde el {hasta}.";
const DEFAULT_PAUSE_MSG    = "Por ahora no estamos tomando pedidos. Volvemos el {hasta}.";
const fillUntil = (msg, ms) => String(msg || "").split("{hasta}").join(formatArDate(ms));

// ¿El plan del dueño incluye pedidos en mesa?
async function ownerHasTableOrders(ownerId) {
    const uSnap = await db.collection("users").doc(ownerId).get();
    const u = uSnap.data() || {};
    if (u.email === SUPERADMIN_EMAIL) return true;
    const e = effectiveSub(u.subscription, Date.now());
    if (e.trial) return true;                 // la prueba de 14 días incluye todo
    if (!e.active) return false;
    const tier = (await getPlanConfig()).tiers.find(t => t.id === e.planType);
    if (!tier) return false;
    return !tier.benefits || tier.benefits.table_orders === true;
}

// ── Registrar el Wi-Fi del local ──────────────────────────────
// El tablero (pedidos.html) llama cada 5 min: la IP desde la que llega es la del local.

exports.registerDevice = onRequest(
    { cors: true, invoker: "public" },
    async (req, res) => {
        if (req.method !== "POST") { res.status(405).send("Method Not Allowed"); return; }
        const user = await requireUser(req, res);
        if (!user) return;

        const restRef  = db.collection("restaurants").doc(String(req.body?.r || "_"));
        const restSnap = await restRef.get();
        if (!restSnap.exists || (restSnap.data().ownerId !== user.uid && user.email !== SUPERADMIN_EMAIL)) {
            res.status(403).json({ error: "Sin permiso" }); return;
        }

        const ip  = clientIp(req);
        const key = networkKey(ip);
        if (!key) { res.json({ ok: false, ip }); return; }

        const privRef = restRef.collection("private").doc("ordering");
        const now     = Date.now();
        const known   = (await privRef.get()).data()?.knownIps || {};
        const fresh   = Object.fromEntries(Object.entries(known).filter(([, v]) => now - (v.at || 0) < 24 * 3600 * 1000));
        fresh[key]    = { at: now, ip };
        await privRef.set({ knownIps: fresh }, { mergeFields: ["knownIps"] });
        res.json({ ok: true, ip });
    }
);

exports.placeOrder = onRequest(
    { cors: true, invoker: "public" },
    async (req, res) => {
        if (req.method !== "POST") { res.status(405).send("Method Not Allowed"); return; }
        const { r, mesa, items, note, name, coords, restrictions } = req.body || {};
        if (typeof r !== "string" || typeof mesa !== "string" || !Array.isArray(items) || !items.length) {
            res.status(400).json({ error: "Pedido inválido" }); return;
        }
        if (items.length > 40) { res.status(400).json({ error: "Demasiados productos en un pedido" }); return; }
        // Cada pedido sale con el nombre de quien lo hizo (obligatorio)
        if (!String(name || "").trim()) { res.status(400).json({ error: "Escribí tu nombre para enviar el pedido." }); return; }

        const restRef = db.collection("restaurants").doc(r);
        const privRef = restRef.collection("private").doc("ordering");
        const mesaRef = restRef.collection("mesas").doc(mesa);
        const [restSnap, cfgSnap, privSnap, mesaSnap] = await Promise.all([
            restRef.get(),
            restRef.collection("config").doc("ordering").get(),
            privRef.get(),
            mesaRef.get(),
        ]);
        if (!restSnap.exists) { res.status(404).json({ error: "Restaurante inexistente" }); return; }
        const cfg = cfgSnap.data() || {};
        if (!cfg.enabled) { res.status(403).json({ error: "Este restaurante no toma pedidos desde la mesa." }); return; }
        if (!(await ownerHasTableOrders(restSnap.data().ownerId))) {
            res.status(403).json({ error: "Los pedidos desde la mesa no están disponibles en este momento." }); return;
        }

        const table = (cfg.tables || []).find(t => t.id === mesa);
        if (!table) { res.status(400).json({ error: "Mesa no reconocida. Escaneá el código de tu mesa." }); return; }

        // Catering / pedidos a distancia: cada "mesa" es un cliente con su link; no se verifica presencia
        const isCatering = cfg.businessType === "catering";
        const now        = Date.now();

        // ── Pausa manual ("no recibir pedidos hasta…") ──
        const pauseUntil = cfg.pause?.until?.toMillis?.() || 0;
        if (pauseUntil > now) {
            res.status(403).json({ error: fillUntil(cfg.pause.message || DEFAULT_PAUSE_MSG, pauseUntil), code: "closed", until: pauseUntil }); return;
        }

        // ── Verificación de presencia ──
        const useSession = !isCatering && cfg.tableSessions !== false;
        const useWifi    = !isCatering && cfg.wifiCheck !== false;
        const useGeo     = !isCatering && !!(cfg.geo?.enabled && typeof cfg.geo.lat === "number" && typeof cfg.geo.lng === "number");

        const tableOpen = useSession && isTableOpen(mesaSnap.data(), now);
        const netKey    = networkKey(clientIp(req));
        const knownIp   = netKey && privSnap.data()?.knownIps?.[netKey];
        const wifiMatch = useWifi && !!knownIp && now - (knownIp.at || 0) < KNOWN_IP_TTL;

        // GPS: solo si la mesa abierta y el Wi-Fi no alcanzaron
        let distance = null, gpsOk = false;
        if (useGeo && !tableOpen && !wifiMatch) {
            const lat = Number(coords?.lat), lng = Number(coords?.lng), acc = Number(coords?.accuracy) || 0;
            if (coords == null || !isFinite(lat) || !isFinite(lng)) {
                res.status(403).json({ error: "Necesitamos tu ubicación para confirmar que estás en el local.", code: "need_location" }); return;
            }
            if (acc > 1000) {
                res.status(403).json({ error: "Tu ubicación es muy imprecisa. Activá el GPS e intentá de nuevo.", code: "low_accuracy" }); return;
            }
            distance = Math.round(distanceMeters(lat, lng, cfg.geo.lat, cfg.geo.lng));
            const radius = Number(cfg.geo.radius) || 150;
            if (distance - Math.min(acc, 200) > radius) {
                res.status(403).json({ error: "Parece que no estás en el local. Los pedidos solo se pueden hacer desde la mesa.", code: "out_of_range" }); return;
            }
            gpsOk = true;
        }

        // ¿Directo a cocina?
        //  - Mesa abierta: siempre (el mozo ya validó la mesa al abrirla).
        //  - Modo "direct": si la presencia está verificada (Wi-Fi o GPS), o si el
        //    restaurante no activó ninguna verificación.
        //  - Si no: queda "pendiente" y el mozo lo acepta (y eso abre la mesa).
        const anyCheck = useSession || useWifi || useGeo;
        const direct   = tableOpen ||
            (cfg.approvalMode === "direct" && (wifiMatch || gpsOk || !anyCheck));

        // Precios y nombres salen de Firestore, nunca del cliente
        const ids   = [...new Set(items.map(i => String(i.id || "")))].filter(Boolean).slice(0, 40);
        const prods = await Promise.all(ids.map(id => restRef.collection("productos").doc(id).get()));
        const byId  = Object.fromEntries(prods.filter(s => s.exists).map(s => [s.id, s.data()]));

        const lines = [];
        for (const it of items) {
            const p = byId[String(it.id)];
            if (!p) continue;
            const qty = Math.min(Math.max(parseInt(it.qty) || 1, 1), 20);
            const price = Number(String(p.precio ?? "").replace(/[^\d.,]/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", ".")) || 0;
            lines.push({
                productId: String(it.id),
                nombre:    p.nombre || "",
                categoria: p.categoria || "",
                qty,
                precio:    price,
                nota:      String(it.note || "").slice(0, 140),
            });
        }
        if (!lines.length) { res.status(400).json({ error: "Los productos ya no están disponibles." }); return; }

        const orderRef = restRef.collection("pedidos").doc();
        const limits   = cfg.limits || {};
        const maxOrders = limits.enabled ? Math.floor(Number(limits.max) || 0) : 0;

        try {
            const number = await db.runTransaction(async tx => {
                const priv = (await tx.get(privRef)).data() || {};

                // Límite: 15 pedidos cada 10 minutos por mesa (alcanza para un grupo grande
                // donde cada uno pide desde su celular)
                const recent = ((priv.rate || {})[mesa] || []).filter(t => now - t < 10 * 60 * 1000);
                if (recent.length >= 15) throw Object.assign(new Error("rate"), { code: "rate" });

                // Límite de pedidos del local (por día, semana o cada N horas). Los rechazados no cuentan.
                let fullUntil = null;
                if (maxOrders > 0) {
                    const win  = capacityWindow(limits, now);
                    const snap = await tx.get(restRef.collection("pedidos").where("createdAt", ">=", Timestamp.fromMillis(win.start)));
                    const times = snap.docs.map(d => d.data()).filter(o => o.status !== "rechazado")
                        .map(o => o.createdAt?.toMillis?.() || now).sort((a, b) => a - b);
                    // Ventana móvil: se libera un lugar cuando el pedido más viejo que sobra sale de la ventana
                    const untilFor = list => win.rolling ? list[list.length - maxOrders] + win.rolling : win.end;
                    if (times.length >= maxOrders) throw Object.assign(new Error("capacity"), { code: "capacity", until: untilFor(times) });
                    if (times.length + 1 >= maxOrders) fullUntil = untilFor([...times, now]);
                }
                if (fullUntil) {
                    // Así el menú muestra el aviso antes de que alguien arme otro pedido
                    tx.set(restRef.collection("config").doc("ordering"), { capacityFullUntil: Timestamp.fromMillis(fullUntil) }, { merge: true });
                }

                // Número de pedido diario (se reinicia cada día, hora Argentina)
                const today = new Date(now - 3 * 3600 * 1000).toISOString().slice(0, 10);
                const next  = priv.counterDay === today ? (priv.counter || 0) + 1 : 1;

                tx.set(privRef, { counter: next, counterDay: today, rate: { [mesa]: [...recent, now] } }, { merge: true });
                tx.set(orderRef, {
                    number:     next,
                    kind:       isCatering ? "catering" : "mesa",
                    mesaId:     mesa,
                    mesaLabel:  table.label || mesa,
                    items:      lines,
                    total:      lines.reduce((s, l) => s + l.precio * l.qty, 0),
                    note:       String(note || "").slice(0, 300),
                    restrictions: [...new Set(Array.isArray(restrictions) ? restrictions : [])]
                        .filter(id => RESTRICTIONS[id]).map(id => ({ id, label: RESTRICTIONS[id] })),
                    customerName: String(name || "").trim().slice(0, 60),
                    status:     direct ? "en_cocina" : "pendiente",
                    printStatus: direct ? "queued" : "none",
                    distance,
                    verification: { tableOpen, wifi: wifiMatch, gps: gpsOk },
                    createdAt:  FieldValue.serverTimestamp(),
                    ...(direct && { sentToKitchenAt: FieldValue.serverTimestamp() }),
                });

                // Mesa abierta: cada pedido extiende la sesión; si entró verificado a cocina, la abre
                if (useSession && (tableOpen || direct)) {
                    tx.set(mesaRef, {
                        open: true,
                        lastActivityAt: FieldValue.serverTimestamp(),
                        ...(!tableOpen && { openedAt: FieldValue.serverTimestamp(), openedBy: "auto" }),
                    }, { merge: true });
                }
                return next;
            });
            res.json({ ok: true, orderId: orderRef.id, number, status: direct ? "en_cocina" : "pendiente" });
        } catch (err) {
            if (err.code === "rate") {
                res.status(429).json({ error: isCatering
                    ? "Se hicieron muchos pedidos seguidos. Esperá unos minutos e intentá de nuevo."
                    : "Se hicieron muchos pedidos desde esta mesa. Llamá al mozo." }); return;
            }
            if (err.code === "capacity") {
                res.status(403).json({ error: fillUntil(limits.message || DEFAULT_CAPACITY_MSG, err.until), code: "capacity", until: err.until }); return;
            }
            console.error("placeOrder:", err.message);
            res.status(500).json({ error: "No se pudo enviar el pedido. Intentá de nuevo." });
        }
    }
);

// ── Pedidos de la mesa (vista compartida para los comensales) ─
// Devuelve los pedidos de la "visita" actual de la mesa, para que todos los de la
// mesa vean lo pedido y puedan dividir la cuenta. La visita empieza cuando se
// CERRÓ la mesa por última vez (el grupo anterior pagó) — no cuando se abrió,
// porque el primer pedido de un grupo llega con la mesa cerrada y al aceptarlo se abre.
//  - sin cierre registrado → últimas 6 horas
//  - sin "mesa abierta" activado → últimas 3 horas
// Nunca más de 6 horas atrás.

exports.tableOrders = onRequest(
    { cors: true, invoker: "public" },
    async (req, res) => {
        if (req.method !== "POST") { res.status(405).send("Method Not Allowed"); return; }
        const { r, mesa } = req.body || {};
        if (typeof r !== "string" || typeof mesa !== "string") { res.status(400).json({ error: "Datos inválidos" }); return; }

        const restRef = db.collection("restaurants").doc(r);
        const [cfgSnap, mesaSnap] = await Promise.all([
            restRef.collection("config").doc("ordering").get(),
            restRef.collection("mesas").doc(mesa).get(),
        ]);
        const cfg = cfgSnap.data() || {};
        if (!cfg.enabled || !(cfg.tables || []).some(t => t.id === mesa)) {
            res.status(404).json({ error: "Mesa no disponible" }); return;
        }

        const now = Date.now();
        const m   = mesaSnap.data() || {};
        let since = cfg.tableSessions !== false
            ? (m.closedAt?.toMillis?.() || 0)
            : now - 3 * 3600 * 1000;
        since = Math.max(since, now - 6 * 3600 * 1000);

        // Requiere índice compuesto pedidos(mesaId, createdAt) — ver firestore.indexes.json
        const snap = await restRef.collection("pedidos")
            .where("mesaId", "==", mesa)
            .where("createdAt", ">=", Timestamp.fromMillis(since))
            .orderBy("createdAt", "asc")
            .limit(60)
            .get();

        res.json({
            orders: snap.docs.map(d => {
                const o = d.data();
                return {
                    id:           d.id,
                    number:       o.number,
                    status:       o.status,
                    customerName: o.customerName || "",
                    items:        (o.items || []).map(i => ({ nombre: i.nombre, qty: i.qty, precio: i.precio })),
                    total:        o.total || 0,
                    restrictions: o.restrictions || [],
                    createdAt:    o.createdAt?.toMillis?.() || null,
                };
            }),
        });
    }
);

// ── Traducción automática del menú (inglés, alemán, francés) ─────────
// El comensal elige el idioma en la guía del menú. Los textos se toman de Firestore (nunca del
// pedido: así nadie puede usar esta función como traductor gratis), se traducen con Cloud
// Translation y se guardan en restaurants/{r}/translations/{lang} ({ t: { sha1: texto } }):
// cada texto se traduce una sola vez y de nuevo solo si el restaurante lo cambia.
const MENU_LANGS = ["en", "de", "fr"];
// Tope para no pagar nunca: Google regala 500 000 caracteres por mes (mes calendario en hora del
// Pacífico) y cobra desde ahí. Contamos lo que mandamos en serverState/translationUsage (solo servidor)
// y dejamos margen. Si se llega al tope, lo que falta se muestra en español hasta el mes/día siguiente.
const TR_MONTH_CAP = 400000;
const TR_DAY_CAP   = 25000;

// Reserva hasta `wanted` caracteres dentro del tope; devuelve cuántos se pueden usar
async function reserveTranslationChars(wanted) {
    const ref = db.collection("serverState").doc("translationUsage");
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles",
        year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date()).map(x => [x.type, x.value]));
    const month = `${parts.year}-${parts.month}`, day = `${month}-${parts.day}`;
    return db.runTransaction(async tx => {
        const u = (await tx.get(ref)).data() || {};
        const monthChars = u.month === month ? u.monthChars || 0 : 0;
        const dayChars   = u.day === day ? u.dayChars || 0 : 0;
        const allowed = Math.max(0, Math.min(wanted, TR_MONTH_CAP - monthChars, TR_DAY_CAP - dayChars));
        if (allowed > 0) tx.set(ref, { month, day, monthChars: monthChars + allowed, dayChars: dayChars + allowed,
            updatedAt: FieldValue.serverTimestamp() });
        return { allowed, month, day };
    });
}
async function refundTranslationChars({ month, day }, n) {
    if (!n) return;
    const ref = db.collection("serverState").doc("translationUsage");
    await db.runTransaction(async tx => {
        const u = (await tx.get(ref)).data() || {};
        if (u.month !== month) return;
        tx.set(ref, { monthChars: Math.max(0, (u.monthChars || 0) - n),
            ...(u.day === day ? { dayChars: Math.max(0, (u.dayChars || 0) - n) } : {}) }, { merge: true });
    }).catch(() => {});
}
const menuTrMemo = new Map();   // `${r}|${lang}` → { at, map } (instancia caliente, 60 s)
let gcpTokenCache = null;

async function gcpAccessToken() {
    if (gcpTokenCache && gcpTokenCache.exp > Date.now() + 60000) return gcpTokenCache.token;
    const r = await axios.get("http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token",
        { headers: { "Metadata-Flavor": "Google" }, timeout: 5000 });
    gcpTokenCache = { token: r.data.access_token, exp: Date.now() + r.data.expires_in * 1000 };
    return gcpTokenCache.token;
}

async function googleTranslate(texts, target) {
    const token = await gcpAccessToken();
    const out = [];
    for (let i = 0; i < texts.length;) {
        // Lotes de hasta 100 textos y ~25 000 caracteres (límites de la API v2)
        const batch = [];
        let chars = 0;
        while (i < texts.length && batch.length < 100 && (chars + texts[i].length <= 25000 || !batch.length)) {
            chars += texts[i].length; batch.push(texts[i++]);
        }
        const r = await axios.post("https://translation.googleapis.com/language/translate/v2",
            { q: batch, source: "es", target, format: "text" },
            { headers: { Authorization: `Bearer ${token}` }, timeout: 20000 });
        out.push(...r.data.data.translations.map(t => t.translatedText));
    }
    return out;
}

exports.translateMenu = onRequest(
    { cors: true, invoker: "public", timeoutSeconds: 60 },
    async (req, res) => {
        if (req.method !== "POST") { res.status(405).send("Method Not Allowed"); return; }
        const { r, lang } = req.body || {};
        if (typeof r !== "string" || !/^[\w-]{1,128}$/.test(r) || !MENU_LANGS.includes(lang)) {
            res.status(400).json({ error: "Datos inválidos" }); return;
        }
        const memoKey = `${r}|${lang}`;
        const memo = menuTrMemo.get(memoKey);
        if (memo && Date.now() - memo.at < 60000) { res.json({ map: memo.map }); return; }

        const restRef = db.collection("restaurants").doc(r);
        const [restSnap, prods, titlesSnap, footerSnap, cacheSnap] = await Promise.all([
            restRef.get(),
            restRef.collection("productos").get(),
            restRef.collection("config").doc("categoryTitles").get(),
            restRef.collection("config").doc("footer").get(),
            restRef.collection("translations").doc(lang).get(),
        ]);
        if (!restSnap.exists) { res.status(404).json({ error: "Restaurante no encontrado" }); return; }

        // Mismos textos que muestra Js/menu-viewers.js (la clave es el texto sin espacios de los bordes)
        const sources = new Set();
        const add = s => {
            const v = String(s ?? "").trim();
            if (v && v.length <= 3000 && /\p{L}/u.test(v) && sources.size < 3000) sources.add(v);
        };
        prods.forEach(d => {
            const p = d.data();
            add(p.nombre); add(p.descripcion);
            if (p.categoria && !String(p.categoria).startsWith("c_")) add(p.categoria); // categorías viejas sin título guardado
        });
        Object.values(titlesSnap.data() || {}).forEach(add);
        add((footerSnap.data() || {}).notice);

        const hash = s => crypto.createHash("sha1").update(s).digest("hex").slice(0, 24);
        const cached = (cacheSnap.data() || {}).t || {};
        const list = [...sources];
        let missing = list.filter(s => typeof cached[hash(s)] !== "string");
        let capped = false;
        if (missing.length) {
            // Solo lo que entra en el tope gratuito (el resto queda en español por ahora)
            const wanted = missing.reduce((n, s) => n + s.length, 0);
            const quota = await reserveTranslationChars(wanted);
            if (quota.allowed < wanted) {
                capped = true;
                let room = quota.allowed;
                missing = missing.filter(s => (room >= s.length ? ((room -= s.length), true) : false));
                await refundTranslationChars(quota, room);   // lo reservado que no se usó
                console.warn(`translateMenu: tope gratuito alcanzado (${r}/${lang}); se traducen ${missing.length} textos`);
            }
        }
        if (missing.length) {
            let translated;
            try {
                translated = await googleTranslate(missing, lang);
            } catch (err) {
                console.error("translateMenu:", err.response?.status, JSON.stringify(err.response?.data || err.message).slice(0, 500));
                // Si Google no tradujo, no cobra: se devuelve lo reservado
                const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles",
                    year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date()).map(x => [x.type, x.value]));
                await refundTranslationChars({ month: `${parts.year}-${parts.month}`, day: `${parts.year}-${parts.month}-${parts.day}` },
                    missing.reduce((n, s) => n + s.length, 0));
                res.status(503).json({ error: "La traducción no está disponible en este momento." }); return;
            }
            missing.forEach((s, i) => { cached[hash(s)] = translated[i]; });
            // Solo se guardan los textos actuales (los que el restaurante borró o cambió se descartan)
            const t = Object.fromEntries(list.filter(s => typeof cached[hash(s)] === "string").map(s => [hash(s), cached[hash(s)]]));
            await restRef.collection("translations").doc(lang).set({ t, updatedAt: FieldValue.serverTimestamp() });
        }
        const map = Object.fromEntries(list.filter(s => typeof cached[hash(s)] === "string").map(s => [s, cached[hash(s)]]));
        if (!capped) menuTrMemo.set(memoKey, { at: Date.now(), map });
        res.json({ map, ...(capped ? { partial: true } : {}) });
    }
);

// ── Integración genérica (POS / sistemas externos) ───────────
// Cuando un pedido pasa a cocina, se envía por POST al webhook configurado,
// firmado con HMAC-SHA256 en el header X-Cubierto-Signature.

exports.onOrderWritten = onDocumentWritten(
    // Los triggers de Firestore deben estar en la región de la base de datos
    { document: "restaurants/{r}/pedidos/{orderId}", region: "southamerica-west1" },
    async event => {
        const after  = event.data?.after?.data();
        const before = event.data?.before?.data();

        // Aviso para las comanderas en la nube: "hay algo para imprimir".
        // printerPoll lee solo este campo mientras no haya trabajos (1 lectura por consulta).
        if (after?.printStatus === "queued" && before?.printStatus !== "queued") {
            await db.collection("restaurants").doc(event.params.r).collection("private").doc("ordering")
                .set({ printHintAt: Date.now() }, { merge: true });
        }

        if (!after || after.status !== "en_cocina" || before?.status === "en_cocina") return;
        if (after.webhookSentAt) return;

        const priv = (await db.collection("restaurants").doc(event.params.r)
            .collection("private").doc("ordering").get()).data() || {};
        if (!priv.webhookUrl || !/^https:\/\//.test(priv.webhookUrl)) return;

        const body = JSON.stringify({
            event:        "order.sent_to_kitchen",
            restaurantId: event.params.r,
            orderId:      event.params.orderId,
            number:       after.number,
            table:        { id: after.mesaId, label: after.mesaLabel },
            kind:         after.kind || "mesa",   // "catering": label es el nombre del cliente
            items:        after.items,
            total:        after.total,
            note:         after.note,
            customerName: after.customerName,
            restrictions: after.restrictions || [],
            createdAt:    after.createdAt?.toDate?.().toISOString() || null,
        });
        const signature = crypto.createHmac("sha256", priv.webhookSecret || "").update(body).digest("hex");

        try {
            const r = await axios.post(priv.webhookUrl, body, {
                headers: { "Content-Type": "application/json", "X-Cubierto-Signature": signature },
                timeout: 10000,
            });
            await event.data.after.ref.update({ webhookSentAt: FieldValue.serverTimestamp(), webhookStatus: r.status });
        } catch (err) {
            console.error("Order webhook:", err.message);
            await event.data.after.ref.update({ webhookStatus: err.response?.status || "error" });
        }
    }
);

// ── Comanderas en la nube (sin PC) ────────────────────────────
// Epson TM (Server Direct Print) y Star (CloudPRNT) consultan esta URL
// periódicamente: printerPoll?r={restaurantId}&k={printerKey}&t=epson|star

function ticketLines(o, width = 42) {
    const line = "-".repeat(width);
    const out  = [
        `PEDIDO #${o.number}`,
        o.kind === "catering" ? `CLIENTE: ${o.mesaLabel}` : `MESA: ${o.mesaLabel}`,
        new Date((o.createdAt?.toDate?.() || new Date()).getTime() - 3 * 3600 * 1000)
            .toISOString().slice(11, 16) + (o.customerName ? `  ${o.customerName}` : ""),
        line,
    ];
    // Restricciones bien visibles arriba del ticket
    if (o.restrictions?.length) {
        out.push(`*** ${o.restrictions.map(x => x.label.toUpperCase()).join(" / ")} ***`, line);
    }
    for (const it of o.items || []) {
        out.push(`${it.qty} x ${it.nombre}`.slice(0, width));
        if (it.nota) out.push(`   > ${it.nota}`);
    }
    if (o.note) out.push(line, `NOTA: ${o.note}`);
    out.push(line, "", "", "");
    return out;
}

const xmlEsc = s => String(s).replace(/[<>&'"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", "\"": "&quot;" }[c]));

async function authPrinter(req) {
    const r = String(req.query.r || ""), k = String(req.query.k || "");
    if (!r || !k) return null;
    const privRef = db.collection("restaurants").doc(r).collection("private").doc("ordering");
    const priv = (await privRef.get()).data();
    if (!priv?.printerKey || priv.printerKey !== k) return null;
    return { restRef: db.collection("restaurants").doc(r), privRef, priv };
}

// Ahorro de lecturas: las impresoras consultan cada pocos segundos. Si no hubo
// pedidos nuevos para imprimir desde el último chequeo, se responde "nada" sin
// consultar la colección de pedidos. Cada 2 min (por instancia) se hace un
// chequeo completo igual, para recuperar trabajos trabados.
const lastFullCheck = new Map();
const FULL_CHECK_EVERY = 2 * 60 * 1000;

function printerIdle({ restRef, priv }) {
    const hint    = priv.printHintAt || 0;
    const checked = priv.printCheckedAt || 0;
    const recent  = Date.now() - (lastFullCheck.get(restRef.id) || 0) < FULL_CHECK_EVERY;
    return hint <= checked && recent;
}

// Llamar cuando la cola quedó vacía: marca hasta qué aviso ya se revisó
async function markQueueEmpty({ restRef, privRef, priv }) {
    lastFullCheck.set(restRef.id, Date.now());
    if ((priv.printHintAt || 0) > (priv.printCheckedAt || 0)) {
        await privRef.set({ printCheckedAt: priv.printHintAt }, { merge: true });
    }
}

// Toma el pedido en cola más antiguo y lo marca como "printing"
async function claimNextJob(restRef) {
    const snap = await restRef.collection("pedidos").where("printStatus", "==", "queued").limit(20).get();
    if (snap.empty) return null;
    const oldest = snap.docs.sort((a, b) =>
        (a.data().createdAt?.toMillis?.() || 0) - (b.data().createdAt?.toMillis?.() || 0))[0];
    await oldest.ref.update({ printStatus: "printing", printClaimedAt: FieldValue.serverTimestamp() });
    return oldest;
}

exports.printerPoll = onRequest(
    { invoker: "public" },
    async (req, res) => {
        const printer = await authPrinter(req);
        if (!printer) { res.status(403).send("Forbidden"); return; }
        const { restRef } = printer;
        const isStar = req.query.t === "star";

        // Confirmaciones de impresión (Star DELETE / Epson SetResponse) se procesan siempre;
        // las consultas "¿hay algo?" se responden sin leer pedidos si no hubo avisos nuevos.
        const isAck = req.method === "DELETE" || req.body?.ConnectionType === "SetResponse";
        if (!isAck && printerIdle(printer)) {
            if (isStar && req.method === "POST") res.json({ jobReady: false });
            else if (isStar) res.status(404).send("");
            else res.status(200).send("");
            return;
        }

        // Pedidos "trabados" en printing por más de 2 minutos vuelven a la cola
        let printingLeft = 0;
        if (!isAck) {
            const stale = await restRef.collection("pedidos").where("printStatus", "==", "printing").limit(20).get();
            const expired = stale.docs.filter(d => Date.now() - (d.data().printClaimedAt?.toMillis?.() || 0) > 2 * 60 * 1000);
            printingLeft = stale.size - expired.length;
            await Promise.all(expired.map(d => d.ref.update({ printStatus: "queued" })));
        }
        const noMoreWork = () => printingLeft === 0 ? markQueueEmpty(printer) : null;

        // ── Star CloudPRNT ──
        if (isStar) {
            if (req.method === "POST") {
                const next = await restRef.collection("pedidos").where("printStatus", "==", "queued").limit(1).get();
                if (next.empty) await noMoreWork();
                res.json(next.empty ? { jobReady: false } : { jobReady: true, mediaTypes: ["text/plain"] });
                return;
            }
            if (req.method === "GET") {
                const job = await claimNextJob(restRef);
                if (!job) { await noMoreWork(); res.status(404).send(""); return; }
                res.set("X-Star-Cut", "full; feed=true");
                res.type("text/plain").send(ticketLines(job.data(), 42).join("\n"));
                return;
            }
            if (req.method === "DELETE") {
                const code = String(req.query.code || "");
                const printing = await restRef.collection("pedidos").where("printStatus", "==", "printing").limit(5).get();
                await Promise.all(printing.docs.map(d => d.ref.update({
                    printStatus: code.startsWith("2") ? "printed" : "queued",
                    ...(code.startsWith("2") && { printedAt: FieldValue.serverTimestamp() }),
                })));
                res.status(200).send("");
                return;
            }
        }

        // ── Epson Server Direct Print ──
        const connType = req.body?.ConnectionType;
        if (connType === "SetResponse") {
            const xml = String(req.body?.ResponseFile || "");
            const ids = [...xml.matchAll(/<printjobid>([^<]+)<\/printjobid>/g)].map(m => m[1]);
            const ok  = /success="true"/.test(xml);
            await Promise.all(ids.map(id => restRef.collection("pedidos").doc(id).update({
                printStatus: ok ? "printed" : "queued",
                ...(ok && { printedAt: FieldValue.serverTimestamp() }),
            }).catch(() => {})));
            res.status(200).send("");
            return;
        }

        const job = await claimNextJob(restRef);
        if (!job) { await noMoreWork(); res.status(200).send(""); return; }
        // Las 2 primeras líneas (pedido y mesa) ya van arriba en letra doble
        const text = ticketLines(job.data(), 42).slice(2).map(l => `<text>${xmlEsc(l)}&#10;</text>`).join("");
        res.type("text/xml; charset=utf-8").send(
            `<?xml version="1.0" encoding="utf-8"?>
<PrintRequestInfo Version="2.00">
  <ePOSPrint>
    <Parameter><devid>local_printer</devid><timeout>10000</timeout><printjobid>${job.id}</printjobid></Parameter>
    <PrintData>
      <epos-print xmlns="http://www.epson-pos.com/schemas/2011/03/epos-print">
        <text lang="es"/><text dw="true" dh="true"/><text>PEDIDO #${job.data().number}&#10;${job.data().kind === "catering" ? "CLIENTE" : "MESA"} ${xmlEsc(job.data().mesaLabel)}&#10;</text><text dw="false" dh="false"/>
        ${text}
        <cut type="feed"/>
      </epos-print>
    </PrintData>
  </ePOSPrint>
</PrintRequestInfo>`);
    }
);

