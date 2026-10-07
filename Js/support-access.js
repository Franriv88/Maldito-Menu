// support-access.js — acceso de soporte con código del cliente (ver supportGrants en functions/index.js)
// El dueño genera un código (vale 24 h, lo puede revocar) y se lo pasa al superadmin; recién con ese código
// el superadmin puede modificar el restaurante. Lo hacen cumplir las reglas de Firestore (supportActive).
// Usado en dashboard (dueño), superadmin (canjear), admin y pedidos (modo soporte).

const SupportAccess = (() => {
    const FN = 'https://us-central1-maldito-cafe.cloudfunctions.net';
    const ms = v => v?.toMillis?.() ?? 0;

    // Estado del acceso de un restaurante: null (sin código vigente) o { active, expiresAt, redeemedAt }
    async function grant(restaurantId) {
        try {
            const d = await db.collection('supportGrants').doc(restaurantId).get();
            const g = d.exists ? d.data() : null;
            if (!g || ms(g.expiresAt) <= Date.now()) return null;
            return { active: g.active === true, expiresAt: ms(g.expiresAt), redeemedAt: ms(g.redeemedAt) || null };
        } catch { return null; }
    }

    async function call(name, body) {
        const token = await auth.currentUser.getIdToken();
        const r = await fetch(`${FN}/${name}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(body),
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.error || 'No se pudo completar la operación.');
        return data;
    }

    const when = t => new Date(t).toLocaleString('es-AR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

    return {
        grant,
        create:  r => call('createSupportCode', { r }),
        revoke:  r => call('revokeSupportCode', { r }),
        redeem:  code => call('redeemSupportCode', { code }),
        call,                                   // otras functions con el token del usuario (ej. adminDeleteAccount)
        when,
    };
})();
