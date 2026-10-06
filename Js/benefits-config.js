// Js/benefits-config.js — Definición de beneficios por plan (compartido entre admin, superadmin, checkout, dashboard)

const BENEFITS_CONFIG = [
    { id: 'restaurants',    label: 'Restaurantes',              type: 'number', options: [1, 3, 5] },
    { id: 'menu_bg',        label: 'Imagen de fondo del menú',  type: 'bool' },
    { id: 'page_bg',        label: 'Imagen de fondo de página', type: 'bool' },
    { id: 'extra_fonts',    label: 'Tipografías premium',       type: 'bool' },
    { id: 'descriptions',   label: 'Descripción de productos',  type: 'bool' },
    { id: 'extra_sections', label: 'Secciones adicionales',     type: 'bool' },
    { id: 'socials',        label: 'Redes sociales',            type: 'bool' },
    // optIn: solo habilitado si el plan lo marca explícitamente (los planes viejos no lo heredan)
    { id: 'table_orders',   label: 'Pedidos desde la mesa (QR/NFC)', type: 'bool', optIn: true },
    { id: 'section_layouts', label: 'Diseños de sección (texto + texto, imagen a lo ancho)', type: 'bool', optIn: true },
];

// ══════════════════════════════════════════════════════════════
//  PLANES = niveles × períodos  (appConfig/plans)
//  { tiers:   [{ id, label, monthlyPrice, benefits, recommended }],
//    periods: { monthly|quarterly|annual|biennial: { discount (%), enabled } } }
//  Precio de un período = precio mensual × meses × (1 − descuento).
//  La misma lógica está en functions/index.js (el servidor es el que cobra).
// ══════════════════════════════════════════════════════════════
const PERIODS_DEFAULT = {
    monthly:   { label: 'Mensual',    months: 1,  discount: 0,  enabled: true },
    quarterly: { label: 'Trimestral', months: 3,  discount: 10, enabled: true },
    annual:    { label: 'Anual',      months: 12, discount: 20, enabled: true },
    biennial:  { label: 'Bienal',     months: 24, discount: 30, enabled: true },
};
const PERIOD_ORDER = ['monthly', 'quarterly', 'annual', 'biennial'];
const TRIAL_DAYS = 14;

// Acepta el formato nuevo (tiers) o el viejo (list con precio y duración por plan)
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
            enabled: id === 'monthly' ? true : (c.enabled ?? d.enabled) !== false,
        };
    });
    return { tiers, periods };
}
const periodPrice   = (tier, periodId, cfg) => { const p = cfg.periods[periodId] || cfg.periods.monthly; return Math.round(tier.monthlyPrice * p.months * (1 - p.discount / 100)); };
const periodMonthly = (tier, periodId, cfg) => Math.round(periodPrice(tier, periodId, cfg) / (cfg.periods[periodId] || cfg.periods.monthly).months);
const periodSavings = (tier, periodId, cfg) => tier.monthlyPrice * (cfg.periods[periodId] || cfg.periods.monthly).months - periodPrice(tier, periodId, cfg);

// Estado efectivo de users/{uid}.subscription:
//  trial (14 días con todo) · active (con su nivel; un cambio programado se aplica al llegar su fecha)
//  · expired · none (nunca tuvo plan) · pending (pago en proceso) · blocked
function subscriptionInfo(sub, cfg, now = Date.now()) {
    sub = sub || {};
    const ms = v => v?.toMillis?.() ?? (v?.seconds != null ? v.seconds * 1000 : (typeof v === 'number' ? v : 0));
    const days = until => Math.max(0, Math.ceil((until - now) / 864e5));
    if (sub.status === 'blocked') return { state: 'blocked' };
    if (sub.status === 'pending_payment') return { state: 'pending' };
    if (sub.status === 'trial') {
        const until = ms(sub.trialEndsAt);
        return until > now ? { state: 'trial', until, daysLeft: days(until), benefits: null } : { state: 'expired', wasTrial: true, until };
    }
    if (sub.status === 'active') {
        const until = ms(sub.paidUntil);
        if (until && until <= now) return { state: 'expired', until, tierId: sub.planType, tier: cfg.tiers.find(t => t.id === sub.planType) || null };
        let tierId = sub.planType, period = sub.period || 'monthly', scheduled = sub.scheduled || null;
        if (scheduled && ms(scheduled.startsAt) <= now) { tierId = scheduled.planType; period = scheduled.period || period; scheduled = null; }
        const tier = cfg.tiers.find(t => t.id === tierId) || null;
        return {
            state: 'active', until, daysLeft: until ? days(until) : null, tierId, tier, period,
            scheduled: scheduled ? { ...scheduled, startsAt: ms(scheduled.startsAt), tier: cfg.tiers.find(t => t.id === scheduled.planType) || null } : null,
            benefits: tier ? (tier.benefits || null) : null, coupon: sub.coupon || null,
        };
    }
    return { state: 'none', trialAvailable: !sub.trialUsed };
}

// Pide al servidor la prueba gratis de 14 días (solo una vez por cuenta). Devuelve la suscripción nueva o null.
async function startTrialIfAvailable(user) {
    try {
        const token = await user.getIdToken();
        const r = await fetch('https://us-central1-maldito-cafe.cloudfunctions.net/startTrial', {
            method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: '{}',
        });
        const data = await r.json().catch(() => ({}));
        return r.ok && data.subscription ? data.subscription : null;
    } catch { return null; }
}

// Devuelve el objeto benefits del plan que coincide con planType, o null si no se encuentra
// (plans puede ser la lista de niveles o la lista vieja)
function getPlanBenefits(plans, planType) {
    if (!plans || !planType) return null;
    const plan = plans.find(p => p.id === planType);
    return plan?.benefits ?? null;
}

// true si el beneficio está habilitado (benefits=null = acceso total, ej: superadmin)
function hasBenefit(benefits, id) {
    if (!benefits) return true;
    if (id === 'restaurants') return benefits.restaurants || 1;
    if (BENEFITS_CONFIG.find(b => b.id === id)?.optIn) return benefits[id] === true;
    return benefits[id] !== false;
}

// Límite de restaurantes para el plan (Infinity si no hay benefits definidos)
function getRestaurantLimit(benefits) {
    if (!benefits) return Infinity;
    return benefits.restaurants || 1;
}
