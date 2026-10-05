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

async function getPlans() {
    const snap = await db.collection("appConfig").doc("plans").get();
    return snap.exists ? (snap.data().list || []) : [];
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

// Activa (o extiende) la suscripción a partir de un pago de MP. Idempotente.
async function activateFromPayment(payment) {
    if (payment.status !== "approved") return { ok: false, reason: "not_approved" };

    const [uid, planId] = String(payment.external_reference || "").split("|");
    const plans = await getPlans();
    const plan  = plans.find(p => p.id === planId);

    if (!uid || !plan) {
        await db.collection("unmatchedPayments").doc(String(payment.id)).set({
            paymentId: String(payment.id),
            amount:    payment.transaction_amount,
            payerEmail: payment.payer?.email || null,
            externalReference: payment.external_reference || null,
            reason:    !uid ? "sin_external_reference" : "plan_inexistente",
            createdAt: FieldValue.serverTimestamp(),
        }, { merge: true });
        console.warn("MP: pago sin usuario/plan identificable", payment.id);
        return { ok: false, reason: "unmatched" };
    }

    if (Number(payment.transaction_amount) + 0.01 < Number(plan.price)) {
        console.warn(`MP: monto ${payment.transaction_amount} menor al plan ${plan.id} (${plan.price})`);
        return { ok: false, reason: "amount_mismatch" };
    }

    const userRef = db.collection("users").doc(uid);
    return db.runTransaction(async tx => {
        const snap = await tx.get(userRef);
        if (!snap.exists) return { ok: false, reason: "user_not_found" };
        const sub = snap.data().subscription || {};
        if (sub.mpPaymentId === String(payment.id)) return { ok: true, already: true };

        // Si todavía tiene días pagos, el nuevo período se suma al final
        const now  = new Date();
        const prev = sub.status === "active" && sub.paidUntil?.toDate ? sub.paidUntil.toDate() : null;
        const base = prev && prev > now ? prev : now;
        const paidUntil = new Date(base);
        paidUntil.setDate(paidUntil.getDate() + (plan.durationDays || 30));

        tx.set(userRef, {
            subscription: {
                status:      "active",
                planType:    plan.id,
                paidUntil:   Timestamp.fromDate(paidUntil),
                paidAt:      FieldValue.serverTimestamp(),
                mpPaymentId: String(payment.id),
            },
        }, { merge: true });
        return { ok: true, plan: plan.label, days: plan.durationDays || 30 };
    });
}

async function fetchMpPayment(paymentId) {
    const { data } = await axios.get(
        `https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`,
        { headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` } }
    );
    return data;
}

// ── Crear preferencia de pago (Checkout Pro) ──────────────────
// El precio sale de appConfig/plans (nunca del cliente) y el
// external_reference "uid|planId" identifica al usuario y al plan.

exports.createPayment = onRequest(
    { cors: true, secrets: ["MP_ACCESS_TOKEN"], invoker: "public" },
    async (req, res) => {
        if (req.method !== "POST") { res.status(405).send("Method Not Allowed"); return; }
        const user = await requireUser(req, res);
        if (!user) return;

        const plan = (await getPlans()).find(p => p.id === req.body?.planId);
        if (!plan) { res.status(400).json({ error: "Plan inexistente" }); return; }

        try {
            const { data: pref } = await axios.post(
                "https://api.mercadopago.com/checkout/preferences",
                {
                    items: [{
                        id:          plan.id,
                        title:       `Cubierto — Plan ${plan.label}`,
                        quantity:    1,
                        currency_id: "ARS",
                        unit_price:  Number(plan.price),
                    }],
                    payer:              user.email ? { email: user.email } : undefined,
                    external_reference: `${user.uid}|${plan.id}`,
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

            await db.collection("users").doc(user.uid).set({
                subscription: { planType: plan.id, paymentInitiated: FieldValue.serverTimestamp() },
            }, { merge: true });

            res.json({ url: pref.init_point });
        } catch (err) {
            console.error("MP createPayment:", err.response?.data || err.message);
            res.status(502).json({ error: "No se pudo iniciar el pago. Intentá de nuevo." });
        }
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

            const type = req.body?.type || req.query?.type;
            if (type !== "payment" || !dataId) { res.status(200).send("OK"); return; }

            // La API de MP es la fuente de verdad (no el body de la notificación)
            const payment = await fetchMpPayment(dataId);
            const result  = await activateFromPayment(payment);
            console.log("MP webhook", dataId, payment.status, JSON.stringify(result));
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

        const plans      = await getPlans();
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

                const plan = plans.find(p => p.id === coupon.planId);
                const days = plan?.durationDays || 30;
                const paidUntil = new Date();
                paidUntil.setDate(paidUntil.getDate() + days);

                list[idx] = {
                    ...coupon,
                    usesCount:  (coupon.usesCount || 0) + 1,
                    redeemedBy: [...(coupon.redeemedBy || []), user.uid],
                };
                tx.set(couponsRef, { list }, { merge: true });
                tx.set(userRef, {
                    email: uSnap.data()?.email || user.email || null,
                    subscription: {
                        status:    "active",
                        planType:  coupon.planId,
                        paidUntil: Timestamp.fromDate(paidUntil),
                        paidAt:    FieldValue.serverTimestamp(),
                        coupon:    code,
                    },
                }, { merge: true });
                return { ok: true, plan: plan?.label || coupon.planId, days };
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

// ¿El plan del dueño incluye pedidos en mesa?
async function ownerHasTableOrders(ownerId) {
    const uSnap = await db.collection("users").doc(ownerId).get();
    const u = uSnap.data() || {};
    if (u.email === SUPERADMIN_EMAIL) return true;
    const sub = u.subscription || {};
    if (sub.status !== "active") return false;
    if (sub.paidUntil?.toDate && sub.paidUntil.toDate() < new Date()) return false;
    const plan = (await getPlans()).find(p => p.id === sub.planType);
    if (!plan) return false;
    return !plan.benefits || plan.benefits.table_orders === true;
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

        // ── Verificación de presencia ──
        const now        = Date.now();
        const useSession = cfg.tableSessions !== false;
        const useWifi    = cfg.wifiCheck !== false;
        const useGeo     = !!(cfg.geo?.enabled && typeof cfg.geo.lat === "number" && typeof cfg.geo.lng === "number");

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

        try {
            const number = await db.runTransaction(async tx => {
                const priv = (await tx.get(privRef)).data() || {};

                // Límite: 15 pedidos cada 10 minutos por mesa (alcanza para un grupo grande
                // donde cada uno pide desde su celular)
                const recent = ((priv.rate || {})[mesa] || []).filter(t => now - t < 10 * 60 * 1000);
                if (recent.length >= 15) throw Object.assign(new Error("rate"), { code: "rate" });

                // Número de pedido diario (se reinicia cada día, hora Argentina)
                const today = new Date(now - 3 * 3600 * 1000).toISOString().slice(0, 10);
                const next  = priv.counterDay === today ? (priv.counter || 0) + 1 : 1;

                tx.set(privRef, { counter: next, counterDay: today, rate: { [mesa]: [...recent, now] } }, { merge: true });
                tx.set(orderRef, {
                    number:     next,
                    mesaId:     mesa,
                    mesaLabel:  table.label || mesa,
                    items:      lines,
                    total:      lines.reduce((s, l) => s + l.precio * l.qty, 0),
                    note:       String(note || "").slice(0, 300),
                    restrictions: [...new Set(Array.isArray(restrictions) ? restrictions : [])]
                        .filter(id => RESTRICTIONS[id]).map(id => ({ id, label: RESTRICTIONS[id] })),
                    customerName: String(name || "").slice(0, 60),
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
                res.status(429).json({ error: "Se hicieron muchos pedidos desde esta mesa. Llamá al mozo." }); return;
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
        `MESA: ${o.mesaLabel}`,
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
        <text lang="es"/><text dw="true" dh="true"/><text>PEDIDO #${job.data().number}&#10;MESA ${xmlEsc(job.data().mesaLabel)}&#10;</text><text dw="false" dh="false"/>
        ${text}
        <cut type="feed"/>
      </epos-print>
    </PrintData>
  </ePOSPrint>
</PrintRequestInfo>`);
    }
);

