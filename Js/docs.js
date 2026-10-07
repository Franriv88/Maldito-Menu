// docs.js — Términos, Privacidad y Preguntas frecuentes
// - Contacto: el mismo de "Soporte" del dashboard (appConfig/support, lectura pública), sin cargar Firebase
// - Preguntas frecuentes: buscador y apertura de la pregunta enlazada con #id

(function () {
    const FALLBACK_EMAIL = 'frivasv2388@gmail.com';   // igual que DEFAULT_EMAIL en Js/dashboard.js
    const URL = 'https://firestore.googleapis.com/v1/projects/maldito-cafe/databases/(default)/documents/appConfig/support';
    const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    function fillContact(c) {
        const email = c.email || FALLBACK_EMAIL;
        document.querySelectorAll('[data-contact-email]').forEach(el => {
            el.innerHTML = `<a href="mailto:${esc(email)}">${esc(email)}</a>`;
        });
        document.querySelectorAll('[data-contact-whatsapp]').forEach(el => {
            el.hidden = !c.whatsapp;
            if (c.whatsapp) el.querySelector('a')?.setAttribute('href', `https://wa.me/${encodeURIComponent(c.whatsapp)}`);
        });
    }
    fillContact({});
    fetch(URL).then(r => r.ok ? r.json() : null).then(d => {
        const f = d?.fields || {};
        fillContact({ email: f.email?.stringValue, whatsapp: f.whatsapp?.stringValue });
    }).catch(() => {});

    // ── Buscador de preguntas frecuentes ──
    const search = document.getElementById('faqSearch');
    if (search) {
        const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        const items = [...document.querySelectorAll('.faq details')];
        const empty = document.getElementById('faqEmpty');
        search.addEventListener('input', () => {
            const q = norm(search.value.trim());
            let shown = 0;
            items.forEach(d => {
                const hit = !q || norm(d.textContent + ' ' + (d.dataset.k || '')).includes(q);
                d.hidden = !hit;
                if (hit) shown++;
                if (q && hit) d.open = norm(d.querySelector('summary').textContent + ' ' + (d.dataset.k || '')).includes(q) || d.open;
            });
            document.querySelectorAll('.faq-group').forEach(g => { g.hidden = !g.querySelector('details:not([hidden])'); });
            if (empty) empty.hidden = shown > 0;
        });
    }
    // Link directo a una pregunta (ayuda.html#cambiar-plan): abrirla
    const openHash = () => {
        const el = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
        if (el?.tagName === 'DETAILS') { el.open = true; el.scrollIntoView(); }
    };
    openHash();
    window.addEventListener('hashchange', openHash);
})();
