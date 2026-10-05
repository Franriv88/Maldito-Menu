// Js/restrictions.js — Restricciones alimentarias que el comensal puede marcar al pedir.
// Compartido entre el menú (table-ordering.js) y el tablero de cocina (pedidos.js).
// La lista de ids válidos se repite en functions/index.js (RESTRICTIONS): mantener ambas iguales.
// icon = nombre del ícono de Lucide v0.309 (PascalCase).

const RESTRICTIONS = [
    { id: 'sin_tacc',         label: 'Sin TACC',                icon: 'WheatOff' },
    { id: 'sin_lactosa',      label: 'Sin lactosa',             icon: 'MilkOff' },
    { id: 'vegano',           label: 'Vegano',                  icon: 'Vegan' },
    { id: 'vegetariano',      label: 'Vegetariano',             icon: 'Salad' },
    { id: 'sin_azucar',       label: 'Sin azúcar',              icon: 'CandyOff' },
    { id: 'sin_frutos_secos', label: 'Sin frutos secos',        icon: 'NutOff' },
    { id: 'sin_huevo',        label: 'Sin huevo',               icon: 'EggOff' },
    { id: 'sin_pescado',      label: 'Sin pescado ni mariscos', icon: 'FishOff' },
];

// SVG del ícono como string ('' si Lucide no cargó)
function restrictionIcon(id, size = 16) {
    const r = RESTRICTIONS.find(x => x.id === id);
    const def = r && typeof lucide !== 'undefined' ? lucide[r.icon] : null;
    if (!def) return '';
    const el = lucide.createElement(def);
    el.setAttribute('width', size);
    el.setAttribute('height', size);
    el.setAttribute('stroke-width', '1.75');
    el.style.cssText = 'display:inline-block;vertical-align:middle;flex-shrink:0;pointer-events:none';
    return el.outerHTML;
}
