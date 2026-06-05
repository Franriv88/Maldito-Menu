const { onRequest }  = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const { initializeApp }    = require("firebase-admin/app");
const { getFirestore, FieldValue, Timestamp } = require("firebase-admin/firestore");
const { getAuth }    = require("firebase-admin/auth");
const sgMail         = require("@sendgrid/mail");
const axios          = require("axios");

initializeApp();
setGlobalOptions({ maxInstances: 10, region: "us-central1" });

const db   = getFirestore();
const auth = getAuth();

// ── Enviar código OTP por email ───────────────────────────────

exports.sendOTP = onRequest(
    { cors: true, secrets: ["SENDGRID_API_KEY"] },
    async (req, res) => {
        if (req.method !== "POST") { res.status(405).send("Method Not Allowed"); return; }

        const { email } = req.body;
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            res.status(400).json({ error: "Email inválido" }); return;
        }

        const code      = String(Math.floor(1000 + Math.random() * 9000));
        const expiresAt = Timestamp.fromDate(new Date(Date.now() + 10 * 60 * 1000));

        await db.collection("otpCodes").doc(email).set({ code, expiresAt, attempts: 0 });

        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        await sgMail.send({
            to:   email,
            from: { email: "noreply@cubierto.menu", name: "Cubierto" },
            subject: "Tu código de verificación — Cubierto",
            html: `
            <div style="font-family:sans-serif;max-width:420px;margin:0 auto;padding:2rem;background:#f9f6f0;border-radius:14px;text-align:center">
                <img src="https://maldito-cafe.web.app/img/logo-email.png" alt="Cubierto" style="height:40px;margin-bottom:1.2rem" onerror="this.style.display='none'">
                <h2 style="color:#5c4a30;margin:0 0 .8rem;font-size:1.3rem">Verificá tu email</h2>
                <p style="color:#7c6c5c;margin:0 0 1.5rem;font-size:.95rem">Ingresá este código en la pantalla de registro:</p>
                <div style="font-size:2.8rem;font-weight:700;letter-spacing:.6rem;color:#3a2a1a;background:#fff;padding:1rem 2rem;border-radius:10px;display:inline-block;border:2px solid #c8b89a">${code}</div>
                <p style="color:#bbb;font-size:.78rem;margin:1.5rem 0 0">Válido por 10 minutos.<br>Si no solicitaste esto, ignorá este mensaje.</p>
            </div>`,
        });

        res.json({ success: true });
    }
);

// ── Verificar OTP y crear sesión ──────────────────────────────

exports.verifyOTPAndSignIn = onRequest(
    { cors: true },
    async (req, res) => {
        if (req.method !== "POST") { res.status(405).send("Method Not Allowed"); return; }

        const { email, code } = req.body;
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

// ── Webhook de Mercado Pago ───────────────────────────────────

exports.mpWebhook = onRequest(
    { secrets: ["MP_ACCESS_TOKEN"] },
    async (req, res) => {
        res.status(200).send("OK"); // Responder siempre 200 a MP inmediatamente

        try {
            const { type, data } = req.body || {};
            if (type !== "payment" || !data?.id) return;

            // Verificar el pago con la API de MP
            const { data: payment } = await axios.get(
                `https://api.mercadopago.com/v1/payments/${data.id}`,
                { headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` } }
            );

            if (payment.status !== "approved") return;

            // Buscar plan por monto
            const plansSnap = await db.collection("appConfig").doc("plans").get();
            const plans = plansSnap.exists ? (plansSnap.data().list || []) : [];
            const plan  = plans.find(p => Number(p.price) === Number(payment.transaction_amount));
            if (!plan) return;

            // Buscar usuario con pago pendiente para ese plan (más reciente)
            const usersSnap = await db.collection("users")
                .where("subscription.status",   "==", "pending_payment")
                .where("subscription.planType",  "==", plan.id)
                .get();

            if (usersSnap.empty) return;

            let targetDoc = null;
            let latestTime = 0;
            usersSnap.forEach(doc => {
                const t = doc.data().subscription?.paymentInitiated?.seconds || 0;
                if (t > latestTime) { latestTime = t; targetDoc = doc; }
            });
            if (!targetDoc) return;

            const paidUntil = new Date();
            paidUntil.setDate(paidUntil.getDate() + (plan.durationDays || 30));

            await targetDoc.ref.set({
                subscription: {
                    status:      "active",
                    planType:    plan.id,
                    paidUntil:   Timestamp.fromDate(paidUntil),
                    paidAt:      FieldValue.serverTimestamp(),
                    mpPaymentId: String(data.id),
                }
            }, { merge: true });

        } catch (err) {
            console.error("MP webhook error:", err.message);
        }
    }
);
