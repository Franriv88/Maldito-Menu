// theme.js — toggle claro/oscuro compartido entre páginas

(function () {
    if (localStorage.getItem('theme') === 'light') document.body.classList.add('light');
})();

function initThemeToggle(btnId) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    function update() {
        const isLight = document.body.classList.contains('light');
        btn.textContent = isLight ? '🌙' : '☀️';
        btn.title = isLight ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro';
    }
    update();
    btn.addEventListener('click', () => {
        document.body.classList.toggle('light');
        localStorage.setItem('theme', document.body.classList.contains('light') ? 'light' : 'dark');
        update();
    });
}
