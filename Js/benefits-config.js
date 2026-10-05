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

// Devuelve el objeto benefits del plan que coincide con planType, o null si no se encuentra
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
