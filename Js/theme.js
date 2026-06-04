// theme.js — toggle claro/oscuro + helper de íconos Lucide

(function () {
    if (localStorage.getItem('theme') === 'light') document.body.classList.add('light');
})();

// Aliases para íconos renombrados en versiones recientes de Lucide
const _LICON_ALIASES = {
    'check-circle-2': 'circle-check-big',
    'x-circle':       'circle-x',
    'alert-triangle': 'triangle-alert',
};

// Genera un SVG de Lucide como string (para insertar en innerHTML)
function licon(name, size = 16) {
    if (typeof lucide === 'undefined') return '';
    const resolved = _LICON_ALIASES[name] || name;
    try {
        const el = lucide.createElement(resolved);
        el.setAttribute('width', size);
        el.setAttribute('height', size);
        el.setAttribute('stroke-width', '1.75');
        el.style.cssText = 'display:inline-block;vertical-align:middle;flex-shrink:0;pointer-events:none';
        return el.outerHTML;
    } catch(_) { return ''; }
}

function initThemeToggle(btnId) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    function update() {
        const isLight = document.body.classList.contains('light');
        btn.innerHTML = isLight ? licon('moon', 15) : licon('sun', 15);
        btn.title = isLight ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro';
    }
    update();
    btn.addEventListener('click', () => {
        document.body.classList.toggle('light');
        localStorage.setItem('theme', document.body.classList.contains('light') ? 'light' : 'dark');
        update();
    });
}
