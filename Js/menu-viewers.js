// menu-viewers.js — vista pública del menú (multi-tenant)

const SOCIAL_NETS = {
    instagram: { label:'Instagram', color:'#E1306C', path:'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z' },
    facebook:  { label:'Facebook',  color:'#1877F2', path:'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z' },
    tiktok:    { label:'TikTok',    color:'#010101', path:'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z' },
    twitter:   { label:'X',         color:'#000000', path:'M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z' },
    youtube:   { label:'YouTube',   color:'#FF0000', path:'M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z' },
    whatsapp:  { label:'WhatsApp',  color:'#25D366', path:'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z' },
    linkedin:  { label:'LinkedIn',  color:'#0A66C2', path:'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z' },
    email:     { label:'Email',     color:'#5B6B7B', path:'M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z' },
};

function socialSvg(network, color, size = 22) {
    const n = SOCIAL_NETS[network];
    if (!n) return '';
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color || n.color}"><path d="${n.path}"/></svg>`;
}

// Alto de las imágenes de sección: img_height es el alto con 344 px de ancho (ancho de la
// columna en escritorio). El recuadro conserva esa proporción en cualquier pantalla, así la
// imagen se ve igual en un celular, solo más chica. Mismo valor que IMG_REF_WIDTH en script.js.
const IMG_REF_WIDTH = 344;
const IMG_REF_WIDE  = 860; // "Imagen a lo ancho": referencia = ancho completo del menú

// Descripción de producto: respeta los saltos de línea y convierte las líneas que
// empiezan con "-", "•" o "*" en una lista con viñetas. Escapa HTML.
function formatDescription(text) {
    const escHtml = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    let html = '', inList = false;
    for (const raw of String(text || '').split(/\r?\n/)) {
        const line = raw.trim();
        const item = line.match(/^(?:[-*]\s+|•\s*)(.+)$/);
        if (item) {
            if (!inList) { html += '<ul class="desc-list">'; inList = true; }
            html += `<li>${escHtml(item[1])}</li>`;
            continue;
        }
        if (inList) { html += '</ul>'; inList = false; }
        if (line) html += `<span class="desc-line">${escHtml(line)}</span>`;
    }
    if (inList) html += '</ul>';
    return html;
}

function safeUrl(url) {
    if (/^mailto:[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/i.test(url)) return url;
    try {
        const u = new URL(url);
        return (u.protocol === 'http:' || u.protocol === 'https:') ? url : '#';
    } catch { return '#'; }
}

// ── Guía de bienvenida (primera visita) ───────────────────────
// Ventana con los colores y tipografías del menú que explica cómo usarlo. Se muestra una sola
// vez por restaurante y por tipo: 'view' (solo mirar) u 'order' (pedir desde la mesa / catering).
// table-ordering.js decide cuál corresponde cuando la URL trae ?mesa=.
window.MenuGuide = (() => {
    const T = (es, v) => window.MenuI18n ? MenuI18n.t(es, v) : (v ? es.replace(/\{(\w+)\}/g, (m, k) => k in v ? v[k] : m) : es);
    const STEPS = {
        view: [
            ['Tocá un producto', 'para ver su descripción. Volvé a tocarlo para cerrarla.'],
            ['Recorré las secciones', 'deslizando hacia abajo.'],
            ['Compartí el menú', 'con el botón Compartir.'],
        ],
        order: [
            ['Tocá un producto', 'para ver su descripción.'],
            ['Agregalo con +', 'y quitalo con −. Podés sumar varios.'],
            ['Revisá tu pedido', 'en la barra de abajo, escribí tu nombre y tocá Enviar pedido.'],
            ['Seguí el estado', 'en Pedidos: ahí ves tus pedidos y los de toda la mesa.'],
        ],
    };
    let open = false, waiters = [], last = null;
    const seenKey = kind => `menu_guide_${kind}_${new URLSearchParams(location.search).get('r')}`;
    const seen = kind => { try { return localStorage.getItem(seenKey(kind)) === '1'; } catch { return true; } };
    const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    // Contenido de la tarjeta en el idioma actual (se vuelve a dibujar al cambiar de idioma)
    function cardHTML({ kind, title, steps }) {
        const list = steps || STEPS[kind] || STEPS.view;
        const cur = window.MenuI18n?.lang() || 'es';
        const st  = window.MenuI18n?.contentState();
        const note = cur === 'es' ? '' : st === 'loading' ? T('Traduciendo el menú…')
            : st === 'error' ? T('La traducción automática no está disponible ahora: el menú se muestra en español.')
            : T('Menú traducido automáticamente.');
        return `
            ${window.MenuI18n && MenuI18n.langs().length > 1 ? `
            <div class="mg-langs n${MenuI18n.langs().length}" role="radiogroup" aria-label="${esc(T('Idioma'))}">
                ${MenuI18n.langs().map(l => `<button type="button" class="mg-lang${l.id === cur ? ' on' : ''}" data-lang="${l.id}"
                    role="radio" aria-checked="${l.id === cur}" lang="${l.id}">${l.label}</button>`).join('')}
            </div>
            <p class="mg-lang-note${st === 'error' ? ' err' : ''}" aria-live="polite">${esc(note)}</p>` : ''}
            <h2 id="mgTitle">${esc(title ? T(title) : T(kind === 'order' ? '¿Cómo pedir?' : 'Bienvenido a nuestro menú'))}</h2>
            <ol class="mg-steps">${list.map(([b, t], i) => `
                <li><span class="mg-num">${i + 1}</span><span><b>${esc(T(b))}</b> ${esc(T(t))}</span></li>`).join('')}
            </ol>
            <button type="button" class="mg-ok">${esc(T('Entendido'))}</button>`;
    }

    // force: abrirla aunque ya se haya visto (botón de ayuda/idioma)
    async function show(kind, { title, steps, force } = {}) {
        last = { kind, title, steps };
        mountReopen();
        if (open || document.querySelector('.mg-backdrop') || (!force && seen(kind))) return;
        open = true;
        if (!force) {
            // Esperar a que el menú esté dibujado (con sus colores) antes de mostrarla
            for (let i = 0; i < 40 && !document.querySelector('#menu-container .menu-section'); i++) await new Promise(r => setTimeout(r, 150));
            await new Promise(r => setTimeout(r, 500));
        }
        const el = document.createElement('div');
        el.className = 'mg-backdrop';
        el.innerHTML = `<div class="mg-card" role="dialog" aria-modal="true" aria-labelledby="mgTitle"></div>`;
        const card = el.querySelector('.mg-card');
        const draw = () => { card.innerHTML = cardHTML(last); };
        draw();
        document.body.appendChild(el);
        requestAnimationFrame(() => el.classList.add('show'));
        const onLang = () => draw();
        document.addEventListener('menulang', onLang);
        const close = () => {
            try { localStorage.setItem(seenKey(kind), '1'); } catch { /* modo privado */ }
            document.removeEventListener('menulang', onLang);
            el.classList.remove('show');
            setTimeout(() => el.remove(), 250);
            open = false;
            waiters.splice(0).forEach(fn => fn());
        };
        card.addEventListener('click', e => {
            const lb = e.target.closest('.mg-lang');
            if (lb) { window.MenuI18n?.setLang(lb.dataset.lang); draw(); card.querySelector(`.mg-lang[data-lang="${lb.dataset.lang}"]`)?.focus({ preventScroll: true }); return; }
            if (e.target.closest('.mg-ok')) close();
        });
        el.addEventListener('click', e => { if (e.target === el) close(); });
        card.querySelector('.mg-ok').focus({ preventScroll: true });
    }

    // Panel retráctil en el borde derecho (como el de modo oscuro de la presentación): cerrado solo
    // asoma una pestañita; al entrar se despliega unos segundos y se esconde solo. Tiene los idiomas
    // del restaurante y "?" para volver a ver la guía.
    let panel = null, panelTimer = null, peeked = false;
    const PANEL_OPEN_MS = 5000;
    const iconSvg = (name, size) => {
        const def = typeof lucide !== 'undefined' ? lucide[name] : null;
        if (!def) return '';
        const ic = lucide.createElement(def); ic.setAttribute('width', size); ic.setAttribute('height', size); ic.setAttribute('stroke-width', '1.75');
        return ic.outerHTML;
    };
    function openPanel(ms = PANEL_OPEN_MS) {
        if (!panel) return;
        panel.classList.add('open');
        panel.querySelector('.mg-tab').setAttribute('aria-expanded', 'true');
        clearTimeout(panelTimer);
        panelTimer = setTimeout(closePanel, ms);
    }
    function closePanel() {
        if (!panel) return;
        clearTimeout(panelTimer);
        panel.classList.remove('open');
        panel.querySelector('.mg-tab').setAttribute('aria-expanded', 'false');
    }
    function paintPanel() {
        if (!panel) return;
        const langs = window.MenuI18n?.langs() || [];
        const cur = window.MenuI18n?.lang() || 'es';
        const multi = langs.length > 1;
        const tab = panel.querySelector('.mg-tab');
        tab.innerHTML = iconSvg(multi ? 'Languages' : 'HelpCircle', 15);
        tab.setAttribute('aria-label', T(multi ? 'Ver instrucciones y cambiar idioma' : 'Ver instrucciones'));
        panel.querySelector('.mg-panel-body').innerHTML =
            (multi ? langs.map(l => `<button type="button" class="mg-plang${l.id === cur ? ' on' : ''}" data-lang="${l.id}" lang="${l.id}"
                aria-pressed="${l.id === cur}" title="${l.label}">${l.id.toUpperCase()}</button>`).join('') : '')
            + `<button type="button" class="mg-phelp" aria-label="${esc(T('Ver instrucciones'))}" title="${esc(T('Ver instrucciones'))}">${iconSvg('HelpCircle', 16) || '?'}</button>`;
    }
    function mountReopen() {
        if (panel) return;
        panel = document.createElement('div');
        panel.id = 'mgPanel';
        panel.className = 'mg-panel';
        panel.innerHTML = `<button type="button" class="mg-tab" aria-expanded="false" aria-controls="mgPanelBody"></button>
            <div class="mg-panel-body" id="mgPanelBody"></div>`;
        // Va dentro del menú, a la altura del logo: se desplaza con el encabezado y no tapa títulos ni botones
        const wrapper = document.querySelector('.page-wrapper');
        const header  = document.getElementById('restaurant-header');
        (wrapper || document.body).appendChild(panel);
        const place = () => {
            if (!wrapper || !header) return;
            const wr = wrapper.getBoundingClientRect(), hr = header.getBoundingClientRect();
            const logo = header.querySelector('img, h1');
            const ref = logo && logo.getBoundingClientRect().height ? logo.getBoundingClientRect() : hr;
            panel.style.top = `${Math.max(8, ref.top - wr.top + ref.height / 2 - 23)}px`;
        };
        place();
        if (header && 'ResizeObserver' in window) new ResizeObserver(place).observe(header);
        new MutationObserver(place).observe(header || document.body, { childList: true, subtree: true });
        window.addEventListener('resize', place);
        document.addEventListener('load', e => { if (e.target.tagName === 'IMG' && header?.contains(e.target)) place(); }, true);
        paintPanel();
        document.addEventListener('menulang', paintPanel);
        panel.addEventListener('click', e => {
            if (e.target.closest('.mg-tab')) { panel.classList.contains('open') ? closePanel() : openPanel(); return; }
            const lb = e.target.closest('.mg-plang');
            if (lb) { window.MenuI18n?.setLang(lb.dataset.lang); openPanel(); return; }
            if (e.target.closest('.mg-phelp')) { closePanel(); if (last) show(last.kind, { ...last, force: true }); }
        });
        // Tocar fuera lo esconde
        document.addEventListener('click', e => { if (panel.classList.contains('open') && !panel.contains(e.target)) closePanel(); });
        peekOnce();
    }
    // Al entrar: con el menú dibujado y la guía cerrada, se asoma el panel y se vuelve a esconder
    async function peekOnce() {
        if (peeked) return;
        peeked = true;
        for (let i = 0; i < 40 && !document.querySelector('#menu-container .menu-section'); i++) await new Promise(r => setTimeout(r, 150));
        await new Promise(r => setTimeout(r, 1200));
        await whenClosed();
        await new Promise(r => setTimeout(r, 500));
        if (document.querySelector('.mg-backdrop')) await whenClosed();
        openPanel(3500);
    }

    // Para no tapar la demostración del acordeón: espera a que se cierre la guía
    const whenClosed = () => open ? new Promise(r => waiters.push(r)) : Promise.resolve();
    return { show, whenClosed, isOpen: () => open };
})();

document.addEventListener('DOMContentLoaded', () => {
    const restaurantId  = new URLSearchParams(location.search).get('r');
    const menuContainer = document.getElementById('menu-container');

    if (!restaurantId) {
        menuContainer.innerHTML = '<div class="error-state">URL inválida. Pedile el link al restaurante.</div>';
        return;
    }

    if (typeof db === 'undefined') {
        menuContainer.innerHTML = '<div class="error-state">Error de conexión.</div>';
        return;
    }

    const restRef = db.collection('restaurants').doc(restaurantId);

    let lastSnapshot  = null;
    // Idioma: textos fijos (T) y del restaurante (TC, traducción automática); ver Js/menu-i18n.js
    const T  = (es, v) => window.MenuI18n ? MenuI18n.t(es, v) : (v ? es.replace(/\{(\w+)\}/g, (m, k) => k in v ? v[k] : m) : es);
    const TC = text => window.MenuI18n ? MenuI18n.tc(text) : text;
    const escT = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    // Traducido: se escapa (el original se muestra como siempre)
    const TCH = text => { const out = TC(text); return out === text ? text : escT(out); };
    document.addEventListener('menulang', () => {
        if (lastSnapshot) renderMenu();
        renderFooter();
        renderStaticTexts();
    });
    function renderStaticTexts() {
        const p = document.querySelector('#menu-disclaimer p');
        if (p) p.textContent = T('FUERA DE CARTA EN PIZARRA');
        window._menuShareLabel?.();
    }
    let imageConfig   = {};
    let imageData     = {};   // imageData/{imgN}.src: cada imagen de sección en su propio documento
    let restData      = {};
    let stylesConfig  = {};
    let footerConfig  = {};
    let catTitles     = {};

    // ── Listener 1: info del restaurante ───────────────────────
    restRef.onSnapshot(doc => {
        if (!doc.exists) {
            menuContainer.innerHTML = '<div class="error-state">Menú no encontrado.</div>';
            return;
        }
        restData = doc.data();
        document.title = restData.nombre || 'Menú';
        renderHeader();
        renderFooter();
        updateShareMeta();
    }, err => console.error('Error restaurante:', err));

    // ── Listener 2: configuración de imágenes ──────────────────
    restRef.collection('config').doc('images').onSnapshot(doc => {
        imageConfig = doc.exists ? doc.data() : {};
        if (lastSnapshot !== null) renderMenu();
    }, err => console.error('Error config:', err));

    // ── Listener: imágenes de sección (una por documento; las viejas siguen en config/images) ──
    restRef.collection('imageData').onSnapshot(snap => {
        imageData = {};
        snap.forEach(d => { imageData[d.id] = d.data()?.src; });
        if (lastSnapshot !== null) renderMenu();
    }, err => console.error('Error imágenes:', err));

    // ── Listener: footer (redes sociales, dirección, aviso) ───
    restRef.collection('config').doc('footer').onSnapshot(doc => {
        footerConfig = doc.exists ? doc.data() : {};
        renderFooter();
    }, err => console.error('Error footer:', err));

    // ── Listener: títulos de categorías ───────────────────────
    restRef.collection('config').doc('categoryTitles').onSnapshot(doc => {
        catTitles = doc.exists ? doc.data() : {};
        if (lastSnapshot) renderMenu();
    }, err => console.error('Error categoryTitles:', err));

    // ── Listener 3b: estilos ───────────────────────────────────
    restRef.collection('config').doc('styles').onSnapshot(doc => {
        stylesConfig = doc.exists ? doc.data() : {};
        window.MenuI18n?.setAllowed(stylesConfig.menuLangs);   // idiomas que ofrece el restaurante
        applyStyles(stylesConfig);
        if (Object.keys(restData).length) renderHeader();
        updateShareMeta();
    }, err => console.error('Error estilos:', err));

    // ── Listener 3: productos ──────────────────────────────────
    restRef.collection('productos')
        .orderBy('orden', 'asc')
        .orderBy('ordenProducto', 'asc')
        .onSnapshot(snapshot => {
            if (snapshot.empty) {
                menuContainer.innerHTML = '<div class="error-state">El menú no está disponible todavía.</div>';
                return;
            }
            lastSnapshot = snapshot;
            renderMenu();
        }, err => console.error('Error productos:', err));

    // ── Estilos dinámicos ──────────────────────────────────────
    function applyStyles(cfg) {
        const r = document.documentElement;
        // Fuentes con nombre viejo (ej. Cormorant Garant) → nombre actual en Google Fonts
        if (typeof normalizeFontCss === 'function') { cfg = { ...cfg, fontFamily: cfg.fontFamily && normalizeFontCss(cfg.fontFamily), titleFontFamily: cfg.titleFontFamily && normalizeFontCss(cfg.titleFontFamily) }; }
        if (cfg.fontFamily)      r.style.setProperty('--main-font-family',  cfg.fontFamily);
        if (cfg.titleFontFamily) r.style.setProperty('--title-font-family', cfg.titleFontFamily);
        if (cfg.titleColor)      r.style.setProperty('--title-color',       cfg.titleColor);
        if (cfg.textColor)       r.style.setProperty('--text-color',        cfg.textColor);
        if (cfg.bgPage)          document.body.style.backgroundColor = cfg.bgPage;
        if (cfg.bgMenu)          r.style.setProperty('--primary-color',     cfg.bgMenu);
        document.body.style.backgroundImage      = cfg.pageBgImage ? `url('${cfg.pageBgImage}')` : '';
        document.body.style.backgroundSize       = cfg.pageBgImage ? 'cover' : '';
        document.body.style.backgroundAttachment = cfg.pageBgImage ? 'fixed' : '';
        applyMenuBackground(cfg);
        if (cfg.fontSize)        r.style.setProperty('--base-font-size',    cfg.fontSize + 'px');
        if (cfg.titleFontSize)   r.style.setProperty('--title-font-size',   cfg.titleFontSize + 'px');
        r.style.setProperty('--title-font-weight', cfg.titleBold === false ? '400' : '700');
        r.style.setProperty('--title-font-style',  cfg.titleItalic ? 'italic' : 'normal');
        // Solo se descargan las tipografías que usa este menú (catálogo en Js/fonts.js)
        if (typeof loadMenuFonts === 'function') loadMenuFonts(cfg.fontFamily, cfg.titleFontFamily);
        if (cfg.logoSize)        r.style.setProperty('--logo-size',         cfg.logoSize + 'px');
        if (cfg.logoOpacity != null) r.style.setProperty('--logo-opacity',  (cfg.logoOpacity / 100).toString());
        // El favicon es siempre el de Cubierto (no se reemplaza por el del restaurante)
    }

    // ── Fondo del menú (imagen + blur + overlay) ──────────────────
    function applyMenuBackground(cfg) {
        const pageWrapper = document.querySelector('.page-wrapper');
        if (!pageWrapper) return;

        let wrap = pageWrapper.querySelector('.menu-bg-wrap');

        if (!cfg.menuBgImage) {
            wrap?.remove();
            document.documentElement.classList.remove('has-menu-bg');
            return;
        }

        if (!wrap) {
            wrap = document.createElement('div');
            wrap.className = 'menu-bg-wrap';
            wrap.innerHTML = '<div class="menu-bg-img"></div><div class="menu-bg-overlay"></div>';
            pageWrapper.prepend(wrap);
        }

        const imgEl = wrap.querySelector('.menu-bg-img');
        const ovlEl = wrap.querySelector('.menu-bg-overlay');

        imgEl.style.backgroundImage = `url('${cfg.menuBgImage}')`;
        imgEl.style.filter          = `blur(${cfg.menuBgBlur || 0}px)`;

        const ovlOpacity = (cfg.menuBgOverlayOpacity ?? 0) / 100;
        ovlEl.style.backgroundColor = cfg.menuBgOverlayColor || 'transparent';
        ovlEl.style.opacity         = ovlOpacity;

        document.documentElement.classList.add('has-menu-bg');
    }

    // ── Meta tags para compartir (og:image, og:title) ──────────
    function updateShareMeta() {
        const nombre  = restData.nombre || 'Menú';

        const setMeta = (prop, val, isName) => {
            const attr = isName ? 'name' : 'property';
            let el = document.querySelector(`meta[${attr}="${prop}"]`);
            if (!el) {
                el = document.createElement('meta');
                el.setAttribute(attr, prop);
                document.head.appendChild(el);
            }
            el.setAttribute('content', val);
        };

        document.title = nombre;
        setMeta('og:title',        nombre);
        setMeta('og:description',  `Mirá el menú de ${nombre}`);
        setMeta('og:url',          location.href);
        setMeta('twitter:title',   nombre, true);
        // og:image necesita URL HTTP real (no data URL) para WhatsApp, Windows Share, etc.
        const ogImgUrl = stylesConfig.logoStorageUrl || stylesConfig.faviconStorageUrl || '';
        if (ogImgUrl) {
            setMeta('og:image',      ogImgUrl);
            setMeta('twitter:image', ogImgUrl, true);
        }
    }

    // ── Header ─────────────────────────────────────────────────
    function renderHeader() {
        const header = document.getElementById('restaurant-header');
        if (!header) return;
        const logoSrc = stylesConfig.logoBase64 || restData.logoUrl;
        const mode    = stylesConfig.headerMode || (logoSrc ? 'logo' : 'text');
        if (mode === 'logo' && logoSrc) {
            header.innerHTML = `<img src="${logoSrc}" alt="${restData.nombre || ''}" style="max-width:var(--logo-size,200px);opacity:var(--logo-opacity,1)">`;
        } else {
            header.innerHTML = `<h1>${restData.nombre || ''}</h1>`;
        }
        // "Fuera de carta en pizarra": opcional (visible salvo que el admin lo desactive)
        const disclaimer = document.getElementById('menu-disclaimer');
        if (disclaimer) disclaimer.style.display = stylesConfig.showDisclaimer === false ? 'none' : 'block';
        renderStaticTexts();
    }

    // ── Footer ─────────────────────────────────────────────────
    function renderFooter() {
        const footer = document.getElementById('restaurant-footer');
        if (!footer) return;

        const socials = footerConfig.socials || [];
        const notice  = (footerConfig.notice  || '').trim();
        const address = (footerConfig.address || '').trim();

        if (!socials.length && !notice && !address) {
            footer.innerHTML = '';
            footer.style.display = 'none';
            return;
        }
        footer.style.display = '';

        let html = '';

        if (socials.length) {
            html += '<div class="footer-socials">';
            socials.forEach(s => {
                if (!SOCIAL_NETS[s.network]) return;
                const href = s.url ? safeUrl(s.url) : '#';
                const isMail = href.startsWith('mailto:');
                const target = href !== '#' && !isMail ? ' target="_blank" rel="noopener noreferrer"' : '';
                // Email: el clic abre un menú (app de correo / Gmail / copiar), porque en muchas PCs
                // no hay app de correo configurada y un mailto: solo no hace nada
                const mailAttr = isMail ? ` data-email="${href.slice(7)}" aria-haspopup="dialog"` : '';
                html += `<a class="footer-social-link" href="${href}"${target}${mailAttr} title="${SOCIAL_NETS[s.network].label}">${socialSvg(s.network, s.color)}</a>`;
            });
            html += '</div>';
        }

        if (notice)  html += `<p class="footer-notice">${TCH(notice)}</p>`;
        if (address) html += `<p class="footer-address">${address}</p>`;

        footer.innerHTML = html;
    }

    // ── Menú del email (footer) ────────────────────────────────
    document.addEventListener('click', e => {
        const link = e.target.closest('.footer-social-link[data-email]');
        const pop  = document.getElementById('emailPop');
        if (pop && !e.target.closest('#emailPop') && link?.dataset.email !== pop.dataset.email) pop.remove();
        if (!link) return;
        e.preventDefault();
        if (pop && pop.dataset.email === link.dataset.email) { pop.remove(); return; }
        openEmailPop(link);
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') document.getElementById('emailPop')?.remove(); });

    function openEmailPop(link) {
        const email = link.dataset.email;
        const enc   = encodeURIComponent(email);
        const pop   = document.createElement('div');
        pop.id = 'emailPop';
        pop.className = 'email-pop';
        pop.setAttribute('role', 'dialog');
        pop.setAttribute('aria-label', 'Contactar por email');
        pop.dataset.email = email;
        pop.innerHTML = `
            <div class="email-pop-addr">${email.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))}</div>
            <a class="email-pop-btn" href="mailto:${email}">${T('Escribir email')}</a>
            <a class="email-pop-btn" href="https://mail.google.com/mail/?view=cm&fs=1&to=${enc}" target="_blank" rel="noopener noreferrer">${T('Abrir en Gmail')}</a>
            <button class="email-pop-btn" type="button" data-copy>${T('Copiar dirección')}</button>`;
        pop.querySelector('[data-copy]').addEventListener('click', async ev => {
            const btn = ev.currentTarget;
            try { await navigator.clipboard.writeText(email); btn.textContent = T('¡Copiada!'); }
            catch { btn.textContent = email; }
            setTimeout(() => pop.remove(), 1200);
        });
        pop.querySelectorAll('a.email-pop-btn').forEach(a => a.addEventListener('click', () => setTimeout(() => pop.remove(), 300)));
        document.body.appendChild(pop);

        // Posicionar arriba del ícono, sin salirse de la pantalla
        const r = link.getBoundingClientRect(), w = pop.offsetWidth, h = pop.offsetHeight;
        const left = Math.min(Math.max(12, r.left + r.width / 2 - w / 2), window.innerWidth - w - 12);
        const top  = r.top - h - 10 > 12 ? r.top - h - 10 : r.bottom + 10;
        pop.style.left = `${left}px`;
        pop.style.top  = `${top + window.scrollY}px`;
        pop.querySelector('.email-pop-btn').focus();
    }

    // ── Render menú ────────────────────────────────────────────
    const SECCIONES_CONFIG = [
        { categorias: ['CAFÉ DE ESPECIALIDAD', 'CAFÉ FRÍO'],  layout: 'normal',   imgKey: 'img1' },
        { categorias: ['BEBIDAS', 'EXTRAS'],                  layout: 'reversed', imgKey: 'img2' },
        { categorias: ['SALADOS', 'LAMINADOS'],               layout: 'normal',   imgKey: 'img3' },
        { categorias: ['DULCES'],                             layout: 'reversed', imgKey: 'img4' },
    ];
    const LEGACY_CATS = SECCIONES_CONFIG.flatMap(s => s.categorias);

    function renderMenu() {
        const snapshot = lastSnapshot;
        const byCategory = {};
        snapshot.forEach(doc => {
            const item = { id: doc.id, ...doc.data() };
            if (!byCategory[item.categoria]) byCategory[item.categoria] = [];
            byCategory[item.categoria].push(item);
        });

        menuContainer.innerHTML = '';

        // Secciones del restaurante (config/images.sections: [{ key, cats }], en orden). Si todavía no
        // existe, las 4 iniciales en el orden de config/images.sectionOrder. Igual que en script.js.
        let sections;
        if (Array.isArray(imageConfig.sections) && imageConfig.sections.length) {
            sections = imageConfig.sections.filter(s => s?.key).map(s => {
                const legacy = SECCIONES_CONFIG.find(x => x.imgKey === s.key);
                return { imgKey: s.key, categorias: (s.cats || []).filter(Boolean), layout: legacy?.layout || 'normal' };
            });
        } else {
            const order = Array.isArray(imageConfig.sectionOrder) ? imageConfig.sectionOrder : [];
            const pos = k => { const i = order.indexOf(k); return i === -1 ? 100 + SECCIONES_CONFIG.findIndex(x => x.imgKey === k) : i; };
            sections = [...SECCIONES_CONFIG].sort((a, b) => pos(a.imgKey) - pos(b.imgKey));
        }
        sections.forEach(sec => {
            // Diseño de la sección: text-image (por defecto), text-text (2 columnas) o
            // image-wide (SOLO la imagen a lo ancho: los productos de la sección no se muestran)
            const mode = ['text-image', 'text-text', 'image-wide'].includes(imageConfig[`${sec.imgKey}_mode`]) ? imageConfig[`${sec.imgKey}_mode`] : 'text-image';
            const hasProducts = sec.categorias.some(cat => (byCategory[cat] || []).length > 0);
            if (!hasProducts && mode !== 'image-wide') return; // "solo imagen" se muestra aunque no tenga productos

            const effectiveLayout = imageConfig[`${sec.imgKey}_layout`] || sec.layout;
            const layoutClass = effectiveLayout === 'reversed' ? 'layout-reversed' : '';
            const refW = mode === 'image-wide' ? IMG_REF_WIDE : IMG_REF_WIDTH;
            // Sin imagen cargada no se muestra ninguna (nada de imágenes de relleno): los productos
            // ocupan todo el ancho, y una sección "solo imagen" sin imagen no se muestra
            const imgSrc  = imageData[sec.imgKey] || imageConfig[sec.imgKey] || null;
            if (!imgSrc && mode === 'image-wide') return;
            const heightVal = typeof imageConfig[`${sec.imgKey}_height`] === 'number' ? imageConfig[`${sec.imgKey}_height`] : 300;
            const flipH  = imageConfig[`${sec.imgKey}_flipH`]  === true;
            // Encuadre (mismo modelo que el editor, ver imageFrame en script.js):
            // anclaje posX/posY 0–100 (centro del zoom), desplazamiento shiftX/shiftY en %
            // del recuadro y zoom en % del alto del recuadro.
            const num = (f, d) => typeof imageConfig[`${sec.imgKey}_${f}`] === 'number' ? imageConfig[`${sec.imgKey}_${f}`] : d;
            const clamp01 = v => Math.max(0, Math.min(100, v));
            const legacyY = { top: 0, center: 50, bottom: 100 }[imageConfig[`${sec.imgKey}_vAlign`]] ?? 50;
            const posX = clamp01(num('pos', 50)), posY = clamp01(num('posY', legacyY));
            const zoom = num('zoom', 100), shiftX = num('shiftX', 0), shiftY = num('shiftY', 0);
            // Ancho de la columna de imagen en % de la sección (25–70; ver imgWidth en script.js)
            const widthVal = Math.max(25, Math.min(70, num('width', 40)));

            let contentHTML = '';
            sec.categorias.forEach(cat => {
                const productos = byCategory[cat] || [];
                if (!productos.length) return;
                // Título guardado (puede estar vacío a propósito); los viejos sin guardar muestran su nombre
                const title = typeof catTitles[cat] === 'string' ? catTitles[cat] : (LEGACY_CATS.includes(cat) ? cat : '');
                if (title) contentHTML += `<h2>${TCH(title)}</h2>`;
                productos.forEach(item => {
                    const desc = String(TC(String(item.descripcion || '').trim()) || '').trim();   // sin descripción: no se despliega
                    const hasPrice = !stylesConfig.hidePrices && item.precio !== null && item.precio !== undefined && item.precio !== '';
                    contentHTML += `
                        <div class="menu-item" data-id="${item.id}" data-price="${String(item.precio ?? '').replace(/"/g, '')}">
                            <div class="item-header">
                                <span class="producto">${TCH(item.nombre)}</span>
                                ${hasPrice ? `<span class="precio">$${item.precio}</span>` : ''}
                            </div>
                            ${desc ? `<div class="item-details"><div class="item-desc">${formatDescription(desc)}</div></div>` : ''}
                        </div>`;
                });
            });

            const sectionEl = document.createElement('div');
            sectionEl.className = `menu-section ${mode === 'text-image' ? layoutClass : ''} mode-${mode}${imgSrc ? '' : ' no-image'}`;
            sectionEl.style.setProperty('--img-w', widthVal + '%');
            sectionEl.innerHTML = `
                <div class="menu-content">${contentHTML}</div>
                ${imgSrc ? `<div class="menu-image" style="aspect-ratio:${refW} / ${heightVal};min-height:0;">
                    <div class="menu-image-layer"
                         style="aspect-ratio:${refW} / ${heightVal};background-image:url('${imgSrc}');background-position:${posX}% ${posY}%;background-size:auto ${zoom}%;transform:translate(${shiftX}%, ${shiftY}%)${flipH ? ' scaleX(-1)' : ''};"></div>
                </div>` : ''}`;
            menuContainer.appendChild(sectionEl);
        });

        // Guía de primera visita (con ?mesa= la decide table-ordering.js según si se puede pedir)
        if (!new URLSearchParams(location.search).has('mesa')) window.MenuGuide.show('view');
        iniciarDemostracionAcordeon();
        window.TableOrdering?.decorate(menuContainer); // botones "+" si se pide desde la mesa
    }

    // ── Acordeón ───────────────────────────────────────────────
    if (!menuContainer.dataset.listenerAttached) {
        menuContainer.addEventListener('click', e => {
            const item = e.target.closest('.menu-item');
            if (item) item.querySelector('.item-details')?.classList.toggle('visible');
        });
        menuContainer.dataset.listenerAttached = 'true';
    }

    const sleep = ms => new Promise(res => setTimeout(res, ms));
    // Muestra que los productos se pueden abrir: abre suavemente la primera descripción,
    // la deja un momento y la cierra. Una sola vez por visita (renderMenu se llama varias
    // veces mientras llegan estilos, imágenes y títulos) y nunca si el usuario pidió
    // "reducir movimiento" o ya tocó algún producto.
    let demoHecha = false, usuarioInteractuo = false;
    menuContainer.addEventListener('click', () => { usuarioInteractuo = true; }, { once: true });
    async function iniciarDemostracionAcordeon() {
        if (demoHecha) return;
        demoHecha = true;
        if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
        await sleep(1200);
        if (window.MenuGuide?.isOpen()) { await window.MenuGuide.whenClosed(); await sleep(600); }
        const det = document.querySelector('.menu-item .item-details'); // ya renderizado y estable
        if (!det || usuarioInteractuo || det.classList.contains('visible')) return;
        det.classList.add('visible');
        await sleep(1800);
        if (!usuarioInteractuo) det.classList.remove('visible');
    }

    // ── Botón compartir ────────────────────────────────────────
    const shareBtn = document.getElementById('shareBtn');
    if (shareBtn) {
        // Construir contenido con ícono Lucide
        function buildShareBtnContent() {
            if (typeof lucide !== 'undefined') {
                try {
                    const ico = lucide.createElement(lucide.Share2);
                    ico.setAttribute('width', 15); ico.setAttribute('height', 15);
                    ico.setAttribute('stroke-width', '1.75');
                    ico.style.cssText = 'display:inline-block;vertical-align:middle;flex-shrink:0';
                    shareBtn.innerHTML = '';
                    shareBtn.appendChild(ico);
                    shareBtn.append(' ' + T('Compartir'));
                } catch(_) { shareBtn.textContent = T('Compartir'); }
            } else {
                shareBtn.textContent = T('Compartir');
            }
        }
        buildShareBtnContent();
        window._menuShareLabel = buildShareBtnContent;
        shareBtn.style.display = 'block';

        shareBtn.addEventListener('click', async () => {
            const url = location.href;
            if (navigator.share) {
                navigator.share({ title: document.title, url }).catch(() => {});
            } else {
                await navigator.clipboard.writeText(url);
                shareBtn.textContent = T('¡Link copiado!');
                setTimeout(() => buildShareBtnContent(), 2000);
            }
        });
    }
});
