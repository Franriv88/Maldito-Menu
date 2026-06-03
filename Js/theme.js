// theme.js — toggle claro/oscuro + helper de íconos Lucide

(function () {
    if (localStorage.getItem('theme') === 'light') document.body.classList.add('light');
})();

// Genera un SVG de Lucide como string (para insertar en innerHTML)
function licon(name, size = 16) {
    if (typeof lucide === 'undefined') return '';
    const el = lucide.createElement(name);
    el.setAttribute('width', size);
    el.setAttribute('height', size);
    el.setAttribute('stroke-width', '1.75');
    el.style.cssText = 'display:inline-block;vertical-align:middle;flex-shrink:0;pointer-events:none';
    return el.outerHTML;
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
