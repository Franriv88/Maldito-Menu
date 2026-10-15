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
        // Busca cada palabra por separado (en cualquier orden): "cambiar plan" encuentra "cambio de plan".
        // Las palabras se comparan por su comienzo (cambi… = cambiar, cambio) y se ignoran las muy comunes.
        const STOP = new Set(['de', 'del', 'el', 'la', 'los', 'las', 'un', 'una', 'mi', 'mis', 'como', 'que', 'en', 'y', 'o', 'a', 'al', 'para', 'por', 'con', 'se', 'me', 'es', 'lo']);
        const words = q => norm(q).split(/[^a-z0-9ñ]+/).filter(w => w.length > 1 && !STOP.has(w)).map(w => w.length > 5 ? w.slice(0, 5) : w);
        search.addEventListener('input', () => {
            const ws = words(search.value);
            let shown = 0;
            items.forEach(d => {
                const all = norm(d.textContent + ' ' + (d.dataset.k || ''));
                const hit = !ws.length || ws.every(w => all.includes(w));
                d.hidden = !hit;
                if (hit) shown++;
                const title = norm(d.querySelector('summary').textContent + ' ' + (d.dataset.k || ''));
                if (ws.length && hit) d.open = ws.every(w => title.includes(w)) || d.open;
            });
            document.querySelectorAll('.faq-group').forEach(g => { g.hidden = !g.querySelector('details:not([hidden])'); });
            if (empty) empty.hidden = shown > 0;
        });
    }
    // Búsqueda que llega desde el panel (ayuda.html?q=cambiar plan)
    const q0 = new URLSearchParams(location.search).get('q');
    if (search && q0) { search.value = q0; search.dispatchEvent(new Event('input')); }

    // Link directo a una pregunta (ayuda.html#cambiar-plan): abrirla
    const openHash = () => {
        const el = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
        if (el?.tagName === 'DETAILS') { el.open = true; el.scrollIntoView(); }
    };
    openHash();
    window.addEventListener('hashchange', openHash);
})();
