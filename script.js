// script.js — Admin del menú (multi-tenant con auth)

// ── Redes sociales ────────────────────────────────────────────

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

let footerSocials = [];

const SOCIAL_PLACEHOLDERS = {
    instagram: 'https://instagram.com/tuusuario',
    facebook:  'https://facebook.com/tupagina',
    tiktok:    'https://tiktok.com/@tuusuario',
    twitter:   'https://x.com/tuusuario',
    youtube:   'https://youtube.com/@tucanal',
    whatsapp:  'https://wa.me/5491112345678',
    linkedin:  'https://linkedin.com/in/tuperfil',
    email:     'contacto@turestaurante.com',
};

// Email: el usuario escribe solo la dirección; se guarda como mailto:
const emailFromUrl = url => String(url || '').replace(/^mailto:/i, '').trim();

// WhatsApp: el prefijo https://wa.me/ es fijo; el usuario solo escribe el número.
// Se guarda la URL completa, así el menú público no cambia.
const WA_PREFIX = 'https://wa.me/';

// Número (solo dígitos) a partir de lo guardado o pegado: wa.me/…, api.whatsapp.com/send?phone=…, "+54 9 11…"
function waNumber(value) {
    const s = String(value || '');
    const phone = s.match(/[?&]phone=\+?(\d+)/);
    return (phone ? phone[1] : s.replace(/^\s*(https?:\/\/)?(www\.)?(wa\.me|api\.whatsapp\.com)\/?/i, '')).replace(/\D/g, '');
}

function socialSvg(network, color, size = 18) {
    const n = SOCIAL_NETS[network];
    if (!n) return '';
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color || n.color}"><path d="${n.path}"/></svg>`;
}

function renderSocialsEditor() {
    const container = document.getElementById('socialsContainer');
    const picker    = document.getElementById('socialPickerRow');
    if (!container || !picker) return;

    // Lista de redes ya agregadas
    if (!footerSocials.length) {
        container.innerHTML = '<p class="social-empty">Sin redes ni contactos agregados</p>';
    } else {
        container.innerHTML = footerSocials.map((s, i) => `
            <div class="social-row" draggable="true" data-idx="${i}">
                <span class="social-drag">${licon('grip-vertical', 14)}</span>
                ${socialSvg(s.network, s.color, 16)}
                ${s.network === 'whatsapp' ? `
                <label class="social-url-prefixed" title="Código de país + área + número, sin espacios ni el +. Ej: 54 9 11 1234-5678 → 5491112345678">
                    <span class="social-url-prefix">${WA_PREFIX}</span>
                    <input class="social-wa-input" data-idx="${i}" value="${esc(waNumber(s.url))}"
                           inputmode="tel" autocomplete="tel" placeholder="5491112345678">
                </label>` : s.network === 'email' ? `
                <input class="social-url-input social-email-input" data-idx="${i}" value="${esc(emailFromUrl(s.url))}"
                       type="email" inputmode="email" autocomplete="email" placeholder="${SOCIAL_PLACEHOLDERS.email}">` : `
                <input class="social-url-input" data-idx="${i}" value="${esc(s.url || '')}"
                       placeholder="${SOCIAL_PLACEHOLDERS[s.network] || 'https://...'}">`}
                <input type="color" class="social-color-input" data-idx="${i}" value="${s.color || SOCIAL_NETS[s.network]?.color || '#c8b89a'}">
                <button class="social-remove-btn" data-idx="${i}">${licon('x', 13)}</button>
            </div>`).join('');

        // Eventos en la lista
        container.querySelectorAll('.social-url-input:not(.social-email-input)').forEach(inp => {
            inp.addEventListener('input', e => { footerSocials[+e.target.dataset.idx].url = e.target.value; });
        });
        container.querySelectorAll('.social-email-input').forEach(inp => {
            inp.addEventListener('input', e => {
                const email = emailFromUrl(e.target.value);
                footerSocials[+e.target.dataset.idx].url = email ? `mailto:${email}` : '';
            });
        });
        container.querySelectorAll('.social-wa-input').forEach(inp => {
            inp.addEventListener('input', e => {
                const digits = waNumber(e.target.value); // también acepta pegar el link completo o "+54 9 11 …"
                if (e.target.value !== digits) e.target.value = digits;
                footerSocials[+e.target.dataset.idx].url = digits ? WA_PREFIX + digits : '';
            });
        });
        container.querySelectorAll('.social-color-input').forEach(inp => {
            inp.addEventListener('change', e => {
                footerSocials[+e.target.dataset.idx].color = e.target.value;
                renderSocialsEditor();
            });
        });
        container.querySelectorAll('.social-remove-btn').forEach(btn => {
            btn.addEventListener('click', e => {
                footerSocials.splice(+e.target.dataset.idx, 1);
                renderSocialsEditor();
            });
        });
        initSocialDrag();
    }

    // ── Preset colores de íconos ──────────────────────────────
    const presetsEl = document.getElementById('socialColorPresets');
    if (presetsEl) {
        if (footerSocials.length) {
            presetsEl.style.display = 'flex';
            presetsEl.innerHTML = `
                <button class="social-color-preset-btn" data-preset="titles">Color de títulos</button>
                <button class="social-color-preset-btn" data-preset="texts">Color de textos</button>
                <button class="social-color-preset-btn" data-preset="original">Originales</button>`;
            presetsEl.querySelectorAll('.social-color-preset-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const root = document.documentElement;
                    let color;
                    if (btn.dataset.preset === 'titles')   color = getComputedStyle(root).getPropertyValue('--title-color').trim() || document.getElementById('cfg-titleColor')?.value;
                    if (btn.dataset.preset === 'texts')    color = getComputedStyle(root).getPropertyValue('--text-color').trim()  || document.getElementById('cfg-textColor')?.value;
                    footerSocials.forEach((s, i) => {
                        footerSocials[i].color = btn.dataset.preset === 'original'
                            ? SOCIAL_NETS[s.network]?.color || '#c8b89a'
                            : color || '#c8b89a';
                    });
                    renderSocialsEditor();
                });
            });
        } else {
            presetsEl.style.display = 'none';
        }
    }

    // Picker: grid de redes disponibles (no duplicadas)
    const used = new Set(footerSocials.map(s => s.network));
    picker.className = 'social-picker-grid';
    picker.innerHTML = Object.entries(SOCIAL_NETS).map(([key, net]) => `
        <button class="social-pick-btn" data-net="${key}" title="Agregar ${net.label}"
                ${used.has(key) ? 'disabled' : ''}>
            ${socialSvg(key, net.color, 20)}
            <span class="social-pick-name">${net.label}</span>
        </button>`).join('');
    picker.querySelectorAll('.social-pick-btn:not([disabled])').forEach(btn => {
        btn.addEventListener('click', () => {
            const net = btn.dataset.net;
            footerSocials.push({ network: net, url: '', color: SOCIAL_NETS[net].color });
            renderSocialsEditor();
        });
    });
}

function initSocialDrag() {
    const rows = document.querySelectorAll('.social-row');
    let dragIdx = null;
    rows.forEach(row => {
        row.addEventListener('dragstart', () => { dragIdx = +row.dataset.idx; row.classList.add('dragging'); });
        row.addEventListener('dragend',   () => row.classList.remove('dragging'));
        row.addEventListener('dragover',  e => { e.preventDefault(); row.classList.add('drag-over'); });
        row.addEventListener('dragleave', () => row.classList.remove('drag-over'));
        row.addEventListener('drop', e => {
            e.preventDefault(); row.classList.remove('drag-over');
            const dropIdx = +row.dataset.idx;
            if (dragIdx === null || dragIdx === dropIdx) return;
            const [moved] = footerSocials.splice(dragIdx, 1);
            footerSocials.splice(dropIdx, 0, moved);
            renderSocialsEditor();
        });
    });
}

const IMG_PLACEHOLDER = 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">' +
    '<rect width="400" height="300" fill="#1a1a1a"/>' +
    '<g transform="translate(150,95)" fill="none" stroke="rgba(124,108,92,0.3)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
    '<rect width="100" height="75" rx="5"/>' +
    '<circle cx="28" cy="24" r="10"/>' +
    '<polyline points="0,55 28,30 55,48 75,28 100,55"/>' +
    '</g></svg>'
);

const SECCIONES_CONFIG = [
    { categorias: ['CAFÉ DE ESPECIALIDAD', 'CAFÉ FRÍO'],  layout: 'normal',   imgKey: 'img1', imgDefault: IMG_PLACEHOLDER },
    { categorias: ['BEBIDAS', 'EXTRAS'],                  layout: 'reversed', imgKey: 'img2', imgDefault: IMG_PLACEHOLDER },
    { categorias: ['SALADOS', 'LAMINADOS'],               layout: 'normal',   imgKey: 'img3', imgDefault: IMG_PLACEHOLDER, premium: true },
    { categorias: ['DULCES'],                             layout: 'reversed', imgKey: 'img4', imgDefault: IMG_PLACEHOLDER, premium: true },
];

const ORDEN_CATEGORIAS = {
    'CAFÉ DE ESPECIALIDAD': 1, 'CAFÉ FRÍO': 2,
    'BEBIDAS': 3, 'EXTRAS': 4,
    'SALADOS': 5, 'LAMINADOS': 6,
    'DULCES': 7
};

const restaurantId    = new URLSearchParams(location.search).get('r');
const isReadonly      = new URLSearchParams(location.search).get('readonly') === '1';
const SUPERADMIN_EMAIL = 'frivasv2388@gmail.com';

// ── Auth guard ────────────────────────────────────────────────

auth.onAuthStateChanged(async user => {
    if (!user) { window.location.href = './login.html'; return; }
    if (!restaurantId) { window.location.href = './dashboard.html'; return; }

    // Verificar que el usuario es dueño (o superadmin en modo vista)
    try {
        const restDoc    = await db.collection('restaurants').doc(restaurantId).get();
        const isSuperAdmin = user.email === SUPERADMIN_EMAIL;
        if (!restDoc.exists || (!isSuperAdmin && restDoc.data().ownerId !== user.uid)) {
            window.location.href = './dashboard.html';
            return;
        }

        const restData = restDoc.data();
        const nombre   = restData.nombre || 'Mi Restaurante';

        // Verificar estado de suscripción (bloquear si no activa)
        if (!isSuperAdmin) {
            const uCheck = await db.collection('users').doc(user.uid).get();
            const subStatus = uCheck.data()?.subscription?.status;
            if (subStatus === 'blocked') { window.location.href = './login.html?reason=blocked'; return; }
            if (subStatus === 'pending_payment' || subStatus === 'unpaid') {
                window.location.href = './checkout.html'; return;
            }
        }

        // Cargar beneficios del plan del usuario
        if (!isSuperAdmin) {
            try {
                const [uSnap, pSnap] = await Promise.all([
                    db.collection('users').doc(user.uid).get(),
                    db.collection('appConfig').doc('plans').get().catch(() => null),
                ]);
                const planType = uSnap.data()?.subscription?.planType;
                const plans    = pSnap?.exists ? (pSnap.data().list || []) : [];
                window.userBenefits = getPlanBenefits(plans, planType);
            } catch { window.userBenefits = null; }
        } else {
            window.userBenefits = null; // superadmin = acceso total
        }

        // Topbar
        document.getElementById('topbarRestName').textContent  = nombre;
        document.getElementById('adminRestName').textContent   = nombre;
        document.getElementById('topbarUserName').textContent  = user.displayName || user.email;
        document.getElementById('viewMenuLink').href = `./menu.html?r=${restaurantId}`;
        document.getElementById('ordersLink').href   = `./pedidos.html?r=${restaurantId}`;
        document.getElementById('logoutBtn').addEventListener('click', () => auth.signOut().then(() => window.location.href = './login.html'));
        document.getElementById('saveMenuBtn').addEventListener('click', guardarMenu);
        initThemeToggle('themeBtn');

        // Listener en tiempo real — cierra sesión si el admin bloquea la cuenta
        if (!isReadonly) {
            db.collection('users').doc(user.uid).onSnapshot(snap => {
                if (snap.exists && snap.data().subscription?.status === 'blocked') {
                    auth.signOut().then(() => window.location.href = './login.html?reason=blocked');
                }
            }, err => console.warn('Error watching subscription:', err));
        }

        await renderAdminMenu();
        applyBenefitGating();
        initBgImageControls();

        if (isReadonly && isSuperAdmin) enterPreviewMode(nombre);
    } catch (err) {
        console.error('Error verificando acceso:', err);
        document.getElementById('admin-menu-container').innerHTML = '<p style="color:red;padding:2rem">Error al cargar. Intentá de nuevo.</p>';
    }
});

// ── Referencia al restaurante ─────────────────────────────────

function restRef() {
    return db.collection('restaurants').doc(restaurantId);
}

// ── Modo vista (superadmin impersonation) ─────────────────────

function enterPreviewMode(restName) {
    document.body.classList.add('preview-mode');

    // Cambiar botón de volver → SuperAdmin
    const backBtn = document.querySelector('.btn-back');
    if (backBtn) { backBtn.href = './superadmin.html'; backBtn.textContent = '← SuperAdmin'; }

    // Badge en el topbar
    const topbarLeft = document.querySelector('.topbar-left');
    if (topbarLeft) {
        const badge = document.createElement('span');
        badge.className = 'preview-badge';
        badge.innerHTML = `${licon('eye', 13)} Vista previa · ${restName}`;
        topbarLeft.appendChild(badge);
    }
}

// ── Renderizado del menú ──────────────────────────────────────

async function renderAdminMenu() {
    const container = document.getElementById('admin-menu-container');

    try {
        const [productsSnap, imagesDoc, stylesDoc, footerDoc, catTitlesDoc] = await Promise.all([
            restRef().collection('productos').orderBy('orden', 'asc').orderBy('ordenProducto', 'asc').get(),
            restRef().collection('config').doc('images').get().catch(() => ({ exists: false, data: () => ({}) })),
            restRef().collection('config').doc('styles').get().catch(() => ({ exists: false, data: () => ({}) })),
            restRef().collection('config').doc('footer').get().catch(() => ({ exists: false, data: () => ({}) })),
            restRef().collection('config').doc('categoryTitles').get().catch(() => ({ exists: false, data: () => ({}) })),
        ]);

        const imageConfig  = imagesDoc.exists     ? imagesDoc.data()     : {};
        const styleConfig  = stylesDoc.exists     ? stylesDoc.data()     : {};
        const footerConfig = footerDoc.exists     ? footerDoc.data()     : {};
        const catTitles    = catTitlesDoc.exists  ? catTitlesDoc.data()  : {};

        // Cargar pie del menú
        document.getElementById('cfg-footerNotice').value  = footerConfig.notice  || '';
        document.getElementById('cfg-footerAddress').value = footerConfig.address || '';
        footerSocials = footerConfig.socials || [];
        renderSocialsEditor();

        applyStyles(styleConfig);
        populateStyleControls(styleConfig);
        initStyleControls();
        updateAdminHeader();

        const byCategory = {};
        productsSnap.forEach(doc => {
            const d = doc.data();
            if (!byCategory[d.categoria]) byCategory[d.categoria] = [];
            byCategory[d.categoria].push({ id: doc.id, ...d });
        });

        const sectionsHTML = SECCIONES_CONFIG
            .filter(sec => !sec.premium || hasBenefit(window.userBenefits, 'extra_sections'))
            .map(sec => {
            const savedLayout = imageConfig[`${sec.imgKey}_layout`];
            const effectiveLayout = savedLayout || sec.layout;
            const layoutClass = effectiveLayout === 'reversed' ? 'layout-reversed' : '';
            const imgSrc  = imageConfig[sec.imgKey] || sec.imgDefault;
            const heightVal = typeof imageConfig[`${sec.imgKey}_height`] === 'number' ? imageConfig[`${sec.imgKey}_height`] : 300;
            const flipH  = imageConfig[`${sec.imgKey}_flipH`]  === true;
            const { posX, posY, zoom, shiftX, shiftY } = imageFrame(imageConfig, sec.imgKey);
            const mode = SECTION_MODES.includes(imageConfig[`${sec.imgKey}_mode`]) ? imageConfig[`${sec.imgKey}_mode`] : 'text-image';
            const refW = mode === 'image-wide' ? IMG_REF_WIDE : IMG_REF_WIDTH;

            const contentHTML = sec.categorias.map(cat => {
                const productos  = byCategory[cat] || [];
                const itemsHTML  = productos.length > 0
                    ? productos.map(p => buildItemHTML(p)).join('')
                    : buildItemHTML({});
                const displayTitle = catTitles[cat] || cat;
                return `
                    <input class="input-category-title" value="${esc(displayTitle)}"
                           data-cat-key="${esc(cat)}" placeholder="${esc(cat)}">
                    <div class="admin-category" data-categoria="${esc(cat)}">${itemsHTML}</div>
                    <button class="add-item-btn" data-categoria="${esc(cat)}">+ Agregar</button>`;
            }).join('');

            return `
            <div class="menu-section ${layoutClass} mode-${mode}" data-img-key="${sec.imgKey}" data-mode="${mode}" style="position:relative">
                <button class="layout-picker-btn" type="button" title="Elegir qué va en cada lado de esta sección">${licon('layout-panel-top', 13)} Diseño</button>
                ${layoutPickerHTML()}
                <div class="menu-content">${contentHTML}</div>
                <div class="menu-image drop-zone" data-img-key="${sec.imgKey}" data-pos-x="${posX}" data-pos-y="${posY}" data-ref-w="${refW}"
                     style="aspect-ratio:${refW} / ${heightVal};height:auto;min-height:0;">
                    <div class="image-bg${flipH ? ' img-flipped' : ''}" style="background-image:url('${imgSrc}');background-position:${posX}% ${posY}%;background-size:auto ${zoom}%;transform:${frameTransform(shiftX, shiftY, flipH)};"></div>
                    <div class="drop-overlay"><span>Clic para cambiar la imagen · arrastrala para encuadrar</span></div>
                    <div class="img-res-warning" hidden>${licon('alert-triangle', 12)} Con este zoom puede verse pixelada: subí una imagen más grande</div>
                    <div class="pos-controls">
                        <div class="ctrl-grid">
                            <label class="ctrl-cell" title="Mover a la izquierda o a la derecha">${licon('move-horizontal', 13)}
                                <input type="range" class="pos-slider" min="-100" max="100" value="${shiftX}" aria-label="Posición horizontal"></label>
                            <label class="ctrl-cell" title="Subir o bajar la imagen (hacia la derecha sube)">${licon('move-vertical', 13)}
                                <input type="range" class="posy-slider" min="-100" max="100" value="${-shiftY}" aria-label="Posición vertical"></label>
                            <label class="ctrl-cell" title="Zoom: hacia la izquierda achica, hacia la derecha agranda">${licon('zoom-in', 13)}
                                <input type="range" class="zoom-slider" min="20" max="300" value="${zoom}" aria-label="Zoom"></label>
                            <label class="ctrl-cell" title="Alto del recuadro">${licon('unfold-vertical', 13)}
                                <input type="range" class="height-slider" min="150" max="600" value="${heightVal}" aria-label="Alto del recuadro"></label>
                        </div>
                        <div class="ctrl-row">
                            <button class="img-flip-btn${flipH ? ' active' : ''}" type="button" title="Voltear horizontalmente">${licon('flip-horizontal', 13)}</button>
                            <span class="flip-label">Voltear</span>
                            <button class="img-reset-btn" type="button" title="Volver al encuadre original">${licon('crosshair', 12)} Centrar</button>
                        </div>
                    </div>
                </div>
            </div>`;
        });

        container.innerHTML = sectionsHTML.join('');
        container.addEventListener('click', handleContainerClick);
        container.addEventListener('input', e => { if (e.target.matches('.input-description')) autosizeDescription(e.target); });
        container.addEventListener('keydown', handleDescriptionKeydown);
        requestAnimationFrame(() => container.querySelectorAll('.input-description').forEach(autosizeDescription));
        initDropZones();
        initCategoryTitleEditors();

    } catch (err) {
        console.error('Error cargando menú:', err);
        container.innerHTML = '<p style="color:red;padding:1rem">Error al cargar el menú.</p>';
    }
}

function buildItemHTML(p) {
    return `<div class="menu-item admin-item">
        <div class="item-header">
            <span class="producto"><input class="input-product" value="${esc(p.nombre || '')}" placeholder="Nombre del producto"></span>
            <span class="precio">$<input class="input-price" type="number" value="${esc(p.precio ?? '')}" placeholder="—" min="0" title="Dejalo vacío para publicar el producto sin precio"></span>
        </div>
        <div class="item-details visible">
            <textarea class="input-description" rows="1" placeholder="Descripción (opcional) · empezá una línea con «- » para hacer una lista">${esc(p.descripcion || '')}</textarea>
        </div>
        <button class="delete-item-btn" type="button" title="Eliminar">${licon('x', 13)}</button>
    </div>`;
}

// ── Descripción de productos (texto multilínea y listas) ─────
// Enter en una línea "- …" continúa la lista; Enter en una viñeta vacía la cierra.
// Shift+Enter siempre inserta un salto de línea simple.
function autosizeDescription(ta) {
    ta.style.height = 'auto';
    ta.style.height = ta.scrollHeight + 'px';
}

function handleDescriptionKeydown(e) {
    const ta = e.target;
    if (!ta.matches?.('.input-description') || e.key !== 'Enter' || e.shiftKey || e.isComposing) return;
    const { selectionStart: pos, selectionEnd: end, value } = ta;
    const lineStart = value.lastIndexOf('\n', pos - 1) + 1;
    const line      = value.slice(lineStart, pos);
    const bullet    = line.match(/^(\s*)([-•*]\s+)/);
    if (!bullet) return; // texto normal: Enter hace un salto de línea común

    e.preventDefault();
    if (line.trim() === bullet[2].trim()) {
        // viñeta vacía → salir de la lista
        ta.setRangeText('', lineStart, end, 'end');
    } else {
        ta.setRangeText('\n' + bullet[1] + bullet[2], pos, end, 'end');
    }
    autosizeDescription(ta);
}

function handleContainerClick(e) {
    const deleteBtn = e.target.closest('.delete-item-btn');
    if (deleteBtn) { deleteBtn.closest('.admin-item').remove(); return; }

    // ── Selector de diseño de la sección ──
    const pickerBtn = e.target.closest('.layout-picker-btn');
    if (pickerBtn) {
        const picker = pickerBtn.closest('.menu-section').querySelector('.layout-picker');
        const open = picker.hidden;
        document.querySelectorAll('.layout-picker').forEach(p => { p.hidden = true; });
        picker.hidden = !open;
        if (open) renderLayoutPicker(pickerBtn.closest('.menu-section'));
        return;
    }
    const lpOpt = e.target.closest('.lp-opt');
    if (lpOpt) {
        const section = lpOpt.closest('.menu-section');
        const sides = sectionSides(section);
        sides[lpOpt.closest('.lp-side').dataset.side === 'left' ? 0 : 1] = lpOpt.dataset.v;
        setSectionSides(section, sides);
        return;
    }
    if (e.target.closest('.lp-swap')) {
        const section = e.target.closest('.menu-section');
        setSectionSides(section, sectionSides(section).reverse());
        return;
    }
    if (e.target.closest('.lp-close')) {
        e.target.closest('.layout-picker').hidden = true;
        return;
    }

    if (e.target.classList.contains('add-item-btn')) {
        const catDiv = e.target.previousElementSibling;
        catDiv.insertAdjacentHTML('beforeend', buildItemHTML({}));
        autosizeDescription(catDiv.lastElementChild.querySelector('.input-description'));
        catDiv.lastElementChild.querySelector('.input-product').focus();
    }
}

function esc(str) {
    return String(str)
        .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
        .replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── Drag & Drop e imágenes ────────────────────────────────────

function initDropZones() {
    document.querySelectorAll('.drop-zone').forEach(zone => {
        if (zone.dataset.dropInitialized) return;
        zone.dataset.dropInitialized = 'true';

        const overlay = zone.querySelector('.drop-overlay span');

        zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
        zone.addEventListener('dragleave', e => { if (!zone.contains(e.relatedTarget)) zone.classList.remove('drag-over'); });
        zone.addEventListener('drop', async e => {
            e.preventDefault(); zone.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) await uploadImage(file, zone.dataset.imgKey, zone, overlay);
        });
        zone.addEventListener('click', e => {
            if (e.target.closest('.pos-controls')) return;
            if (zone._justDragged) { zone._justDragged = false; return; } // fue un arrastre, no un clic
            const input = document.createElement('input');
            input.type = 'file'; input.accept = 'image/*';
            input.onchange = async ev => {
                const file = ev.target.files[0];
                if (file) await uploadImage(file, zone.dataset.imgKey, zone, overlay);
            };
            input.click();
        });

        // Encuadre: horizontal, vertical y zoom (se aplican juntos al fondo de la imagen)
        const saveFrame = fields => restRef().collection('config').doc('images')
            .set(Object.fromEntries(Object.entries(fields).map(([k, v]) => [`${zone.dataset.imgKey}_${k}`, v])), { merge: true })
            .catch(err => console.error('Error guardando encuadre:', err));

        // Horizontal: derecha = mueve a la derecha (shiftX). Vertical: derecha = sube (shiftY = -valor).
        [['.pos-slider', 'shiftX', v => v], ['.posy-slider', 'shiftY', v => -v], ['.zoom-slider', 'zoom', v => v]].forEach(([sel, field, toSaved]) => {
            const s = zone.querySelector(sel);
            if (!s) return;
            s.addEventListener('input', e => { e.stopPropagation(); applyImageFrame(zone); });
            s.addEventListener('change', e => { e.stopPropagation(); saveFrame({ [field]: toSaved(parseInt(s.value)) }); });
        });

        zone.querySelector('.img-reset-btn')?.addEventListener('click', e => {
            e.stopPropagation();
            zone.querySelector('.pos-slider').value  = 0;
            zone.querySelector('.posy-slider').value = 0;
            zone.querySelector('.zoom-slider').value = 100;
            zone.dataset.posX = 50;
            zone.dataset.posY = 50;
            applyImageFrame(zone);
            saveFrame({ pos: 50, posY: 50, shiftX: 0, shiftY: 0, zoom: 100 });
        });

        initImageDrag(zone, () => saveFrame({
            shiftX: parseInt(zone.querySelector('.pos-slider').value),
            shiftY: -parseInt(zone.querySelector('.posy-slider').value),
        }));

        const heightSlider = zone.querySelector('.height-slider');
        if (heightSlider) {
            heightSlider.addEventListener('input', e => {
                e.stopPropagation();
                // El alto se guarda "al ancho de referencia": el recuadro mantiene la proporción
                zone.style.aspectRatio = `${zone.dataset.refW || IMG_REF_WIDTH} / ${heightSlider.value}`;
                const bg = zone.querySelector('.image-bg');
                if (bg) { bg.style.top = '0'; bg.style.bottom = '0'; }
                updateResolutionWarning(zone); // el alto del recuadro también cambia el tamaño mostrado
            });
            heightSlider.addEventListener('change', async e => {
                e.stopPropagation();
                try {
                    await restRef().collection('config').doc('images').set(
                        { [`${zone.dataset.imgKey}_height`]: parseInt(heightSlider.value) }, { merge: true }
                    );
                } catch (err) { console.error('Error guardando tamaño:', err); }
            });
        }

        const flipBtn = zone.querySelector('.img-flip-btn');
        if (flipBtn) {
            flipBtn.addEventListener('click', async e => {
                e.stopPropagation();
                flipBtn.classList.toggle('active');
                const isFlipped = flipBtn.classList.contains('active');
                zone.querySelector('.image-bg')?.classList.toggle('img-flipped', isFlipped);
                applyImageFrame(zone); // conserva el desplazamiento vertical al voltear
                try {
                    await restRef().collection('config').doc('images').set(
                        { [`${zone.dataset.imgKey}_flipH`]: isFlipped }, { merge: true }
                    );
                } catch (err) { console.error('Error guardando flip:', err); }
            });
        }

    });
}

// ── Diseño de la sección: qué va en cada lado ─────────────────
// Modos guardados en config/images como imgN_mode (+ imgN_layout para el orden):
//   text-image  Texto | Imagen (layout normal) o Imagen | Texto (layout reversed)
//   text-text   Texto | Texto  → los productos se reparten en 2 columnas
//   image-wide  Imagen | Imagen → imagen a lo ancho, con los productos debajo
// text-text e image-wide requieren el beneficio de plan "section_layouts".
const SECTION_MODES = ['text-image', 'text-text', 'image-wide'];

function layoutPickerHTML() {
    const side = (name, label) => `
        <div class="lp-side" data-side="${name}">
            <span class="lp-side-label">${label}</span>
            <div class="lp-opts">
                <button type="button" class="lp-opt" data-v="image">${licon('image', 18)}<span>Imagen</span></button>
                <button type="button" class="lp-opt" data-v="text">${licon('type', 18)}<span>Texto</span></button>
            </div>
        </div>`;
    return `
        <div class="layout-picker" hidden>
            <div class="lp-head">
                <span>Elegí qué va en cada lado</span>
                <button type="button" class="lp-close" aria-label="Cerrar">${licon('x', 14)}</button>
            </div>
            <div class="lp-sides">
                ${side('left', 'Izquierda')}
                <button type="button" class="lp-swap" title="Intercambiar lados">${licon('arrow-left-right', 16)}</button>
                ${side('right', 'Derecha')}
            </div>
            <p class="lp-hint">Texto + Texto: los productos en dos columnas · Imagen + Imagen: la imagen a lo ancho, con los productos debajo.</p>
            <p class="lp-lock" hidden>${licon('lock', 12)} Texto + Texto e Imagen a lo ancho no están incluidos en tu plan.</p>
        </div>`;
}

const canUseSectionLayouts = () => !!hasBenefit(window.userBenefits, 'section_layouts');

function sectionSides(section) {
    const mode = section.dataset.mode || 'text-image';
    if (mode === 'text-text')  return ['text', 'text'];
    if (mode === 'image-wide') return ['image', 'image'];
    return section.classList.contains('layout-reversed') ? ['image', 'text'] : ['text', 'image'];
}

function renderLayoutPicker(section) {
    const picker = section.querySelector('.layout-picker');
    const [l, r] = sectionSides(section);
    picker.querySelectorAll('.lp-side').forEach(s => {
        const v = s.dataset.side === 'left' ? l : r;
        s.querySelectorAll('.lp-opt').forEach(b => b.classList.toggle('active', b.dataset.v === v));
    });
    picker.querySelector('.lp-lock').hidden = canUseSectionLayouts();
}

function setSectionSides(section, [l, r]) {
    const mode = l === r ? (l === 'text' ? 'text-text' : 'image-wide') : 'text-image';
    if (mode !== 'text-image' && !canUseSectionLayouts()) {
        const lock = section.querySelector('.lp-lock');
        lock.hidden = false;
        lock.classList.remove('pulse'); void lock.offsetWidth; lock.classList.add('pulse');
        return;
    }
    const reversed = mode === 'text-image' && l === 'image';
    section.classList.remove(...SECTION_MODES.map(m => `mode-${m}`));
    section.classList.add(`mode-${mode}`);
    section.classList.toggle('layout-reversed', reversed);
    section.dataset.mode = mode;

    // El recuadro de imagen cambia de referencia (columna 344 px o ancho completo 860 px)
    const zone = section.querySelector('.drop-zone');
    if (zone) {
        zone.dataset.refW = mode === 'image-wide' ? IMG_REF_WIDE : IMG_REF_WIDTH;
        zone.style.aspectRatio = `${zone.dataset.refW} / ${zone.querySelector('.height-slider')?.value || 300}`;
        updateResolutionWarning(zone);
    }
    renderLayoutPicker(section);
    restRef().collection('config').doc('images').set({
        [`${section.dataset.imgKey}_mode`]: mode,
        [`${section.dataset.imgKey}_layout`]: reversed ? 'reversed' : 'normal',
    }, { merge: true }).catch(err => console.error('Error guardando diseño de sección:', err));
}

// Cerrar el selector al hacer clic afuera
document.addEventListener('click', e => {
    if (e.target.closest('.layout-picker, .layout-picker-btn')) return;
    document.querySelectorAll('.layout-picker').forEach(p => { p.hidden = true; });
});

// ── Encuadre de imágenes de sección ───────────────────────────
// Modelo (igual en el editor y en el menú público):
// - posX / posY: punto de anclaje de la imagen dentro del recuadro (0–100). Es también
//   el centro desde el que se aplica el zoom. Valores viejos fuera de rango se acotan.
// - shiftX / shiftY: desplazamiento directo en % del ancho/alto del recuadro.
//   Funcionan con cualquier zoom y con PNG con bordes transparentes.
// - zoom: alto de la imagen en % del alto del recuadro (20 = achica, 300 = agranda).
// - img_height: alto del recuadro cuando mide IMG_REF_WIDTH px de ancho (el ancho de la
//   columna de imagen en el menú de escritorio). El recuadro mantiene esa PROPORCIÓN en
//   cualquier pantalla, así la imagen se ve igual en celular, solo más chica.
const IMG_REF_WIDTH = 344;
const IMG_REF_WIDE  = 860; // "Imagen a lo ancho": referencia = ancho completo del menú
const clamp01 = v => Math.max(0, Math.min(100, v));

function imageFrame(imageConfig, key) {
    const legacyY = { top: 0, center: 50, bottom: 100 }[imageConfig[`${key}_vAlign`]] ?? 50;
    const num = (field, def) => typeof imageConfig[`${key}_${field}`] === 'number' ? imageConfig[`${key}_${field}`] : def;
    return {
        posX: clamp01(num('pos', 50)), posY: clamp01(num('posY', legacyY)),
        zoom: num('zoom', 100), shiftX: num('shiftX', 0), shiftY: num('shiftY', 0),
    };
}

// translate primero y después el volteo: así "derecha" es siempre derecha en pantalla
const frameTransform = (sx, sy, flipped) => `translate(${sx}%, ${sy}%)${flipped ? ' scaleX(-1)' : ''}`;

function applyImageFrame(zone) {
    const bg = zone.querySelector('.image-bg');
    if (!bg) return;
    const sx = +(zone.querySelector('.pos-slider')?.value ?? 0);
    const sy = -(zone.querySelector('.posy-slider')?.value ?? 0);
    const z  = +(zone.querySelector('.zoom-slider')?.value ?? 100);
    bg.style.backgroundPosition = `${zone.dataset.posX ?? 50}% ${zone.dataset.posY ?? 50}%`;
    bg.style.backgroundSize = `auto ${z}%`;
    bg.style.transform = frameTransform(sx, sy, bg.classList.contains('img-flipped'));
    updateResolutionWarning(zone);
}

// Aviso si el zoom muestra la imagen más grande que su resolución real
function updateResolutionWarning(zone) {
    const warn = zone.querySelector('.img-res-warning');
    const bg = zone.querySelector('.image-bg');
    if (!warn || !bg) return;
    const url = (bg.style.backgroundImage.match(/^url\((["']?)(.*)\1\)$/) || [])[2];
    if (!url) { warn.hidden = true; return; }
    if (zone._natUrl !== url) {
        zone._natUrl = url; zone._natH = null;
        const img = new Image();
        img.onload = () => { if (zone._natUrl === url) { zone._natH = img.naturalHeight; updateResolutionWarning(zone); } };
        img.src = url;
        return;
    }
    if (!zone._natH) return;
    // alto mostrado (px de pantalla) vs. píxeles reales de la imagen; tolera un 15 %
    const shownH = zone.clientHeight * (+zone.querySelector('.zoom-slider').value / 100) * Math.min(window.devicePixelRatio || 1, 2);
    warn.hidden = shownH <= zone._natH * 1.15;
}

// Arrastrar la imagen para encuadrarla: los píxeles movidos se convierten en
// desplazamiento directo (% del recuadro), igual que los controles.
function initImageDrag(zone, onDone) {
    const bg = zone.querySelector('.image-bg');
    if (!bg || isReadonly) return; // en la vista previa del superadmin no se modifica nada
    let start = null;
    updateResolutionWarning(zone);

    zone.addEventListener('pointerdown', e => {
        if (e.button !== 0 || e.target.closest('.pos-controls')) return;
        start = {
            x: e.clientX, y: e.clientY, moved: false, id: e.pointerId,
            px: +zone.querySelector('.pos-slider').value,
            py: +zone.querySelector('.posy-slider').value,
        };
    });

    zone.addEventListener('pointermove', e => {
        if (!start || e.pointerId !== start.id) return;
        const dx = e.clientX - start.x, dy = e.clientY - start.y;
        if (!start.moved && Math.hypot(dx, dy) < 5) return; // todavía es un clic
        if (!start.moved) { start.moved = true; zone.setPointerCapture(e.pointerId); zone.classList.add('dragging-image'); }

        const W = zone.clientWidth, H = zone.clientHeight;
        const clamp = v => Math.max(-100, Math.min(100, Math.round(v)));
        zone.querySelector('.pos-slider').value  = clamp(start.px + dx * 100 / W);  // derecha = derecha
        zone.querySelector('.posy-slider').value = clamp(start.py - dy * 100 / H);  // el slider vertical: derecha = sube
        applyImageFrame(zone);
    });

    const end = e => {
        if (!start || e.pointerId !== start.id) return;
        if (start.moved) {
            zone._justDragged = true;              // evita que el clic abra el selector de archivo
            setTimeout(() => { zone._justDragged = false; }, 400);
            zone.classList.remove('dragging-image');
            onDone();
        }
        start = null;
    };
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);
}

async function uploadImage(file, imgKey, zone, overlaySpan) {
    const textoOriginal = overlaySpan.textContent;
    zone.classList.add('uploading');
    let fileToProcess = file;

    // 1. Intentar eliminar el fondo
    try {
        overlaySpan.textContent = 'Eliminando fondo…';
        const { removeBackground } = await import('https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.4.5/+esm');
        let blob      = await removeBackground(file, { debug: true });
        blob          = await cleanAlphaEdges(blob);
        fileToProcess = new File([blob], 'img.png', { type: 'image/png' });
    } catch (bgErr) {
        console.error('❌ Background removal error:', bgErr);
        overlaySpan.textContent = `Error: ${bgErr.message?.slice(0, 80) ?? 'ver consola'}`;
        await new Promise(r => setTimeout(r, 5000));
    }

    // 2. Alta resolución (hasta 1600 px) en Firebase Storage, para poder agrandarla sin
    //    pixelar. WebP conserva la transparencia y pesa poco. Si Storage falla, se usa
    //    el método anterior (base64 chico dentro de Firestore).
    try {
        overlaySpan.textContent = 'Procesando…';
        const isPng = fileToProcess.type === 'image/png';
        let url = null;
        try {
            url = await uploadSectionImage(fileToProcess, imgKey, isPng);
        } catch (stErr) {
            console.warn('Storage falló, se guarda en baja resolución:', stErr);
        }
        if (!url) {
            url = await compressToBase64(fileToProcess, isPng ? 500 : 900, isPng ? 500 : 675,
                isPng ? 'image/png' : 'image/jpeg', 0.72);
        }

        // 3. Guardar la referencia en Firestore
        overlaySpan.textContent = 'Guardando…';
        const prev = (await restRef().collection('config').doc('images').get()).data()?.[imgKey];
        await restRef().collection('config').doc('images').set({ [imgKey]: url }, { merge: true });
        const imageBg = zone.querySelector('.image-bg');
        if (imageBg) imageBg.style.backgroundImage = `url('${url}')`;
        applyImageFrame(zone); // recalcula el aviso de resolución
        deleteOldSectionImage(prev, url);

    } catch (error) {
        console.error('Error al procesar imagen:', error);
        alert('Error al procesar la imagen. Intentá con un archivo más chico.');
    } finally {
        overlaySpan.textContent = textoOriginal;
        zone.classList.remove('uploading');
    }
}

// Redimensiona (lado mayor ≤ 1600 px) y sube a Storage. Devuelve la URL pública.
// Nombre plano restaurants/{id}/section-{img}-{ts}.{ext} (coincide con storage.rules).
async function uploadSectionImage(file, imgKey, keepAlpha) {
    if (!storage || !restaurantId) return null;
    const MAX = 1600;
    const bitmap = await createImageBitmap(file);
    const ratio  = Math.min(1, MAX / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width  = Math.round(bitmap.width * ratio);
    canvas.height = Math.round(bitmap.height * ratio);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    // WebP si el navegador lo genera; si no, PNG (con transparencia) o JPEG
    const toBlob = (type, q) => new Promise(r => canvas.toBlob(r, type, q));
    let blob = await toBlob('image/webp', 0.86);
    if (!blob || blob.type !== 'image/webp') blob = keepAlpha ? await toBlob('image/png') : await toBlob('image/jpeg', 0.86);
    const ext = blob.type.split('/')[1].replace('jpeg', 'jpg');

    const ref = storage.ref(`restaurants/${restaurantId}/section-${imgKey}-${Date.now()}.${ext}`);
    await ref.put(blob, { contentType: blob.type, cacheControl: 'public, max-age=31536000' });
    return ref.getDownloadURL();
}

// Borra del Storage la imagen anterior de la sección (solo si era nuestra)
function deleteOldSectionImage(prevUrl, newUrl) {
    if (!storage || !prevUrl || prevUrl === newUrl || !/\/section-img\d/.test(decodeURIComponent(prevUrl))) return;
    try { storage.refFromURL(prevUrl).delete().catch(() => {}); } catch { /* URL ajena */ }
}

function compressToBase64(file, maxW, maxH, mimeType, quality) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = reject;
        reader.onload = e => {
            const img = new Image();
            img.onerror = reject;
            img.onload = () => {
                let { width, height } = img;
                if (width > maxW || height > maxH) {
                    const ratio = Math.min(maxW / width, maxH / height);
                    width  = Math.round(width  * ratio);
                    height = Math.round(height * ratio);
                }
                const canvas = document.createElement('canvas');
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (mimeType === 'image/jpeg') {
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, width, height);
                }
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL(mimeType, quality));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// ── Guardar en Firestore ──────────────────────────────────────

async function guardarMenu() {
    if (isReadonly) return;
    setSaveBtnState('saving');

    const productosParaGuardar = [];
    document.querySelectorAll('.admin-category').forEach(catDiv => {
        const categoria = catDiv.dataset.categoria;
        catDiv.querySelectorAll('.admin-item').forEach((item, index) => {
            const nombre      = item.querySelector('.input-product').value.trim();
            const precioNum   = parseFloat(item.querySelector('.input-price').value);
            // Precio vacío (o inválido) = producto sin precio. Antes estos productos se descartaban.
            const precio      = !isNaN(precioNum) && precioNum >= 0 ? precioNum : null;
            const descripcion = item.querySelector('.input-description')?.value.trim() ?? '';
            if (nombre) {
                productosParaGuardar.push({
                    nombre, precio, categoria, descripcion,
                    orden: ORDEN_CATEGORIAS[categoria] || 99,
                    ordenProducto: index
                });
            }
        });
    });

    // Productos sin precio: confirmar antes de publicarlos así
    // (si el menú entero se publica sin precios, no hace falta preguntar)
    const sinPrecio = productosParaGuardar.filter(p => p.precio === null);
    if (sinPrecio.length && !document.getElementById('cfg-hidePrices')?.checked) {
        const lista = sinPrecio.slice(0, 8).map(p => `<li>${esc(p.nombre)}</li>`).join('')
            + (sinPrecio.length > 8 ? `<li>y ${sinPrecio.length - 8} más…</li>` : '');
        const ok = await confirmModal({
            title: sinPrecio.length === 1 ? '1 producto sin precio' : `${sinPrecio.length} productos sin precio`,
            html: `<p>Estos productos se van a publicar <b>sin precio</b> en el menú:</p>
                   <ul class="cm-list">${lista}</ul>
                   <p class="cm-hint">Si fue un olvido, cancelá y completá el precio.</p>`,
            confirmText: 'Publicar sin precio',
        });
        if (!ok) { setSaveBtnState('idle'); return; }
    }

    const imageConfigActual = {};
    document.querySelectorAll('.drop-zone[data-img-key]').forEach(zone => {
        const key = zone.dataset.imgKey;
        if (!key) return;
        const posSlider    = zone.querySelector('.pos-slider');
        const posYSlider   = zone.querySelector('.posy-slider');
        const zoomSlider   = zone.querySelector('.zoom-slider');
        const heightSlider = zone.querySelector('.height-slider');
        const flipBtn      = zone.querySelector('.img-flip-btn');
        if (posSlider)    imageConfigActual[`${key}_shiftX`] = parseInt(posSlider.value);
        if (posYSlider)   imageConfigActual[`${key}_shiftY`] = -parseInt(posYSlider.value);
        if (zone.dataset.posX !== undefined) imageConfigActual[`${key}_pos`]  = parseInt(zone.dataset.posX);
        if (zone.dataset.posY !== undefined) imageConfigActual[`${key}_posY`] = parseInt(zone.dataset.posY);
        if (zoomSlider)   imageConfigActual[`${key}_zoom`]   = parseInt(zoomSlider.value);
        if (heightSlider) imageConfigActual[`${key}_height`] = parseInt(heightSlider.value);
        if (flipBtn)      imageConfigActual[`${key}_flipH`]  = flipBtn.classList.contains('active');
    });
    document.querySelectorAll('.menu-section[data-img-key]').forEach(section => {
        const key = section.dataset.imgKey;
        imageConfigActual[`${key}_layout`] = section.classList.contains('layout-reversed') ? 'reversed' : 'normal';
        imageConfigActual[`${key}_mode`]   = section.dataset.mode || 'text-image';
    });

    try {
        const ref = restRef();
        const snap = await ref.collection('productos').get();
        await Promise.all(snap.docs.map(doc => doc.ref.delete()));
        await Promise.all(productosParaGuardar.map(p => ref.collection('productos').add(p)));
        if (Object.keys(imageConfigActual).length > 0) {
            await ref.collection('config').doc('images').set(imageConfigActual, { merge: true });
        }
        // Guardar pie del menú
        await ref.collection('config').doc('footer').set({
            notice:  document.getElementById('cfg-footerNotice')?.value.trim()  || '',
            address: document.getElementById('cfg-footerAddress')?.value.trim() || '',
            socials: footerSocials.map(s => ({ network: s.network, url: s.url || '', color: s.color || SOCIAL_NETS[s.network]?.color || '#c8b89a' }))
        });
        setSaveBtnState('saved');
    } catch (error) {
        console.error('Error al guardar:', error);
        setSaveBtnState('error');
    }
}

// Estados del botón Guardar (reemplaza los alert() del navegador)
let saveBtnTimer = null;
function setSaveBtnState(state) {
    const btn = document.getElementById('saveMenuBtn');
    if (!btn) return;
    const STATES = {
        idle:   { icon: 'save',           text: 'Guardar menú' },
        saving: { icon: 'loader-2',       text: 'Guardando…' },
        saved:  { icon: 'check',          text: '¡Guardado!' },
        error:  { icon: 'alert-triangle', text: 'No se pudo guardar' },
    };
    const st = STATES[state] || STATES.idle;
    clearTimeout(saveBtnTimer);
    btn.className = state === 'idle' ? '' : `is-${state}`;
    btn.disabled = state === 'saving';
    btn.innerHTML = `${licon(st.icon, 17)}<span>${st.text}</span>`;
    if (state === 'saved' || state === 'error') saveBtnTimer = setTimeout(() => setSaveBtnState('idle'), state === 'saved' ? 2200 : 4000);
}

// ── Estilos del menú ──────────────────────────────────────────

// Devuelve true si el archivo PNG/WebP ya tiene píxeles transparentes
function checkTransparency(file) {
    if (!file.type.includes('png') && !file.type.includes('webp')) return Promise.resolve(false);
    return new Promise(resolve => {
        const reader = new FileReader();
        reader.onerror = () => resolve(false);
        reader.onload = e => {
            const img = new Image();
            img.onerror = () => resolve(false);
            img.onload = () => {
                const S = 150;
                const c = document.createElement('canvas');
                c.width = S; c.height = S;
                const ctx = c.getContext('2d');
                ctx.drawImage(img, 0, 0, S, S);
                const d = ctx.getImageData(0, 0, S, S).data;
                for (let i = 3; i < d.length; i += 4) {
                    if (d[i] < 240) { resolve(true); return; }
                }
                resolve(false);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// Elimina halos y semitransparencias residuales del algoritmo de remoción
function cleanAlphaEdges(blob) {
    const url = URL.createObjectURL(blob);
    return new Promise(resolve => {
        const img = new Image();
        img.onerror = () => { URL.revokeObjectURL(url); resolve(blob); };
        img.onload = () => {
            URL.revokeObjectURL(url);
            const c = document.createElement('canvas');
            c.width = img.width; c.height = img.height;
            const ctx = c.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const id = ctx.getImageData(0, 0, c.width, c.height);
            const d  = id.data;
            for (let i = 3; i < d.length; i += 4) {
                if (d[i] < 25)       d[i] = 0;    // elimina halo invisible
                else if (d[i] > 230) d[i] = 255;  // solidifica bordes opacos
            }
            ctx.putImageData(id, 0, 0);
            c.toBlob(b => resolve(b ?? blob), 'image/png');
        };
        img.src = url;
    });
}

function hexToRgb(hex) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : null;
}

function contrastColor(hex) {
    const rgb = hexToRgb(hex);
    if (!rgb) return '#c8b89a';
    const lin = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    const L = 0.2126 * lin(rgb.r) + 0.7152 * lin(rgb.g) + 0.0722 * lin(rgb.b);
    return L > 0.179 ? '#3a2e22' : '#c8b89a';
}

function applyStyles(cfg) {
    const r = document.documentElement;
    if (cfg.fontFamily)      r.style.setProperty('--main-font-family',  cfg.fontFamily);
    if (cfg.titleFontFamily) r.style.setProperty('--title-font-family', cfg.titleFontFamily);
    if (cfg.titleColor)      r.style.setProperty('--title-color',       cfg.titleColor);
    if (cfg.textColor)       r.style.setProperty('--text-color',        cfg.textColor);
    if (cfg.bgPage)          document.body.style.backgroundColor = cfg.bgPage;
    if (cfg.bgMenu)          r.style.setProperty('--primary-color',     cfg.bgMenu);
    if (cfg.fontSize)        r.style.setProperty('--base-font-size',    cfg.fontSize + 'px');
    if (cfg.titleFontSize)   r.style.setProperty('--title-font-size',   cfg.titleFontSize + 'px');
    if (cfg.logoSize)        r.style.setProperty('--logo-size',         cfg.logoSize + 'px');
    if (cfg.logoOpacity != null) r.style.setProperty('--logo-opacity',  (cfg.logoOpacity / 100).toString());
    const logoPreview    = document.getElementById('logoPreview');
    const logoRemove     = document.getElementById('logoRemoveBtn');
    const logoRemoveBgNow = document.getElementById('logoRemoveBgNowBtn');
    if (cfg.logoBase64) {
        if (logoPreview)    { logoPreview.src = cfg.logoBase64; logoPreview.style.display = 'block'; }
        if (logoRemove)     logoRemove.style.display     = 'block';
        if (logoRemoveBgNow) logoRemoveBgNow.style.display = 'block';
    }

    // Fondos de imagen (menuBg / pageBg)
    ['menuBg', 'pageBg'].forEach(key => {
        const field = key === 'menuBg' ? 'menuBgImage' : 'pageBgImage';
        if (cfg[field]) {
            const thumb  = document.getElementById(`${key}Thumb`);
            const remove = document.getElementById(`${key}Remove`);
            const extras = document.getElementById(`${key}Extras`);
            if (thumb)  thumb.style.backgroundImage = `url('${cfg[field]}')`;
            if (remove) remove.style.display = '';
            if (extras) extras.style.display = '';
        }
    });
    // Valores de blur y overlay del menuBg
    const blurSlider = document.getElementById('menuBgBlur');
    const blurVal    = document.getElementById('menuBgBlurVal');
    if (blurSlider && cfg.menuBgBlur != null) {
        blurSlider.value = cfg.menuBgBlur;
        if (blurVal) blurVal.textContent = `${cfg.menuBgBlur}px`;
    }
    const ovlColor   = document.getElementById('menuBgOverlayColor');
    const ovlOpacity = document.getElementById('menuBgOverlayOpacity');
    const ovlVal     = document.getElementById('menuBgOverlayVal');
    if (ovlColor   && cfg.menuBgOverlayColor)   ovlColor.value   = cfg.menuBgOverlayColor;
    if (ovlOpacity && cfg.menuBgOverlayOpacity != null) {
        ovlOpacity.value = cfg.menuBgOverlayOpacity;
        if (ovlVal) ovlVal.textContent = `${cfg.menuBgOverlayOpacity}%`;
    }
}

function populateStyleControls(cfg) {
    const setVal = (id, val) => { const el = document.getElementById(id); if (el && val !== undefined) el.value = val; };
    setVal('cfg-fontFamily',      cfg.fontFamily);
    setVal('cfg-titleFontFamily', cfg.titleFontFamily || '');
    setVal('cfg-fontSize',        cfg.fontSize);
    setVal('cfg-titleFontSize',   cfg.titleFontSize || 20);
    setVal('cfg-titleColor',      cfg.titleColor);
    setVal('cfg-textColor',       cfg.textColor);
    setVal('cfg-bgPage',          cfg.bgPage);
    setVal('cfg-bgMenu',          cfg.bgMenu);
    setVal('cfg-logoSize',        cfg.logoSize    || 200);
    setVal('cfg-logoOpacity',     cfg.logoOpacity != null ? cfg.logoOpacity : 100);
    const hidePricesBox = document.getElementById('cfg-hidePrices');
    if (hidePricesBox) hidePricesBox.checked = !!cfg.hidePrices;
    const disclaimerBox = document.getElementById('cfg-showDisclaimer');
    if (disclaimerBox) disclaimerBox.checked = cfg.showDisclaimer !== false;
    document.body.classList.toggle('prices-hidden', !!cfg.hidePrices);

    const sv = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
    sv('cfg-fontSizeVal',       (cfg.fontSize       || 14) + 'px');
    sv('cfg-titleFontSizeVal',  (cfg.titleFontSize  || 20) + 'px');
    sv('cfg-logoSizeVal',       (cfg.logoSize       || 200) + 'px');
    sv('cfg-logoOpacityVal',    (cfg.logoOpacity != null ? cfg.logoOpacity : 100) + '%');

    // Sync hex text inputs with color pickers
    [['cfg-titleColor','cfg-titleColorHex'], ['cfg-textColor','cfg-textColorHex'],
     ['cfg-bgPage','cfg-bgPageHex'],         ['cfg-bgMenu','cfg-bgMenuHex']].forEach(([inpId, hexId]) => {
        const inp = document.getElementById(inpId), hex = document.getElementById(hexId);
        if (inp && hex) hex.value = inp.value;
    });

    if (cfg.headerMode) {
        const ctrl = document.getElementById('headerModeCtrl');
        ctrl?.querySelectorAll('.seg-btn').forEach(b => b.classList.toggle('active', b.dataset.value === cfg.headerMode));
    }
}

function updateAdminHeader() {
    const mode    = document.getElementById('headerModeCtrl')
        ?.querySelector('.seg-btn.active')?.dataset.value ?? 'text';
    const logoPrev = document.getElementById('logoPreview');
    const logoSrc  = (logoPrev?.style.display !== 'none' && logoPrev?.src) ? logoPrev.src : null;

    const nameEl   = document.getElementById('adminRestName');
    const logoEl   = document.getElementById('adminLogoPreview');
    if (!nameEl || !logoEl) return;

    if (mode === 'logo' && logoSrc) {
        nameEl.style.display  = 'none';
        logoEl.src            = logoSrc;
        logoEl.style.display  = 'block';
        logoEl.style.maxWidth = 'var(--logo-size, 200px)';
        logoEl.style.opacity  = 'var(--logo-opacity, 1)';
    } else {
        nameEl.style.display  = '';
        logoEl.style.display  = 'none';
    }
}

async function saveStyleField(key, value) {
    try {
        await restRef().collection('config').doc('styles').set({ [key]: value }, { merge: true });
    } catch(e) { console.error('Error guardando estilo:', e); }
}

async function saveCategoryTitle(key, title) {
    try {
        await restRef().collection('config').doc('categoryTitles').set({ [key]: title }, { merge: true });
    } catch(e) { console.error('Error guardando título:', e); }
}

function initCategoryTitleEditors() {
    document.querySelectorAll('.input-category-title').forEach(inp => {
        inp.addEventListener('blur', () => {
            const key   = inp.dataset.catKey;
            const title = inp.value.trim() || key;
            inp.value   = title;
            saveCategoryTitle(key, title);
        });
        inp.addEventListener('keydown', e => {
            if (e.key === 'Enter') { e.preventDefault(); inp.blur(); }
            if (e.key === 'Escape') { inp.value = inp.dataset.catKey; inp.blur(); }
        });
    });
}

// Ventana de confirmación con la estética del proyecto (claro/oscuro)
async function confirmModal({ title, html, confirmText = 'Confirmar', cancelText = 'Cancelar' }) {
    const light = document.body.classList.contains('light');
    const r = await Swal.fire({
        title, html,
        showCancelButton: true,
        confirmButtonText: confirmText,
        cancelButtonText: cancelText,
        reverseButtons: true,
        focusCancel: true,
        background: light ? '#fffdf9' : '#1a1a1a',
        color: light ? '#3a2e22' : '#ddd0bb',
        confirmButtonColor: light ? '#6b5135' : '#c8b89a',
        cancelButtonColor: light ? 'rgba(100,80,50,.25)' : 'rgba(124,108,92,.3)',
        customClass: { popup: 'cm-popup', confirmButton: 'cm-confirm' },
    });
    return r.isConfirmed;
}

function initStyleControls() {
    const root = document.documentElement;

    // ── Cartel "Fuera de carta en pizarra" (opcional, se guarda al instante) ──
    const disclaimerBox = document.getElementById('cfg-showDisclaimer');
    if (disclaimerBox) disclaimerBox.addEventListener('change', () =>
        saveStyleField('showDisclaimer', disclaimerBox.checked));

    // ── Publicar el menú sin precios (pide confirmación al activarlo) ──
    const hidePricesBox = document.getElementById('cfg-hidePrices');
    if (hidePricesBox) hidePricesBox.addEventListener('change', async () => {
        const enable = hidePricesBox.checked;
        if (enable) {
            const ok = await confirmModal({
                title: 'Publicar el menú sin precios',
                html: `<p>Los precios <b>no se van a mostrar</b> en el menú público ni en los pedidos desde la mesa.</p>
                       <p class="cm-hint">Los precios que cargaste se conservan: podés volver a mostrarlos cuando quieras desmarcando esta opción.</p>`,
                confirmText: 'Publicar sin precios',
            });
            if (!ok) { hidePricesBox.checked = false; return; }
        }
        document.body.classList.toggle('prices-hidden', enable);
        await saveStyleField('hidePrices', enable);
    });

    // ── Fuente de cuerpo ──────────────────────────────────────
    const fontSel = document.getElementById('cfg-fontFamily');
    if (fontSel) fontSel.addEventListener('change', async () => {
        root.style.setProperty('--main-font-family', fontSel.value);
        document.querySelectorAll('.input-product, .input-price, .input-description')
            .forEach(el => el.style.fontFamily = fontSel.value);
        await saveStyleField('fontFamily', fontSel.value);
    });

    // ── Fuente de títulos ─────────────────────────────────────
    const titleFontSel = document.getElementById('cfg-titleFontFamily');
    if (titleFontSel) titleFontSel.addEventListener('change', async () => {
        const val = titleFontSel.value;
        root.style.setProperty('--title-font-family', val || 'inherit');
        document.querySelectorAll('.menu-content h2').forEach(el => el.style.fontFamily = val || '');
        await saveStyleField('titleFontFamily', val);
    });

    // ── Tamaño fuente cuerpo ──────────────────────────────────
    const sizeInp  = document.getElementById('cfg-fontSize');
    const sizeSpan = document.getElementById('cfg-fontSizeVal');
    if (sizeInp) {
        sizeInp.addEventListener('input', () => {
            const val = sizeInp.value + 'px';
            root.style.setProperty('--base-font-size', val);
            document.querySelectorAll('.menu-item').forEach(el => el.style.fontSize = val);
            if (sizeSpan) sizeSpan.textContent = val;
        });
        sizeInp.addEventListener('change', () => saveStyleField('fontSize', parseInt(sizeInp.value)));
    }

    // ── Tamaño fuente títulos ─────────────────────────────────
    const titleSizeInp  = document.getElementById('cfg-titleFontSize');
    const titleSizeSpan = document.getElementById('cfg-titleFontSizeVal');
    if (titleSizeInp) {
        titleSizeInp.addEventListener('input', () => {
            const val = titleSizeInp.value + 'px';
            root.style.setProperty('--title-font-size', val);
            document.querySelectorAll('.menu-content h2').forEach(el => el.style.fontSize = val);
            if (titleSizeSpan) titleSizeSpan.textContent = val;
        });
        titleSizeInp.addEventListener('change', () => saveStyleField('titleFontSize', parseInt(titleSizeInp.value)));
    }

    // ── Helpers color con feedback ─────────────────────────────
    function syncColorInputs(colorId, hexId, val) {
        const c = document.getElementById(colorId), h = document.getElementById(hexId);
        if (c) c.value = val;
        if (h) h.value = val;
    }

    function setTitleColor(hex) {
        root.style.setProperty('--title-color', hex);
        document.querySelectorAll('.menu-content h2').forEach(el => el.style.color = hex);
        syncColorInputs('cfg-titleColor', 'cfg-titleColorHex', hex);
    }
    function setTextColor(hex) {
        root.style.setProperty('--text-color', hex);
        document.querySelectorAll('.menu-item, .producto').forEach(el => el.style.color = hex);
        syncColorInputs('cfg-textColor', 'cfg-textColorHex', hex);
    }

    // Helper: bind color picker + hex text input together
    function bindColor(colorId, hexId, onInput, onSave) {
        const colorEl = document.getElementById(colorId);
        const hexEl   = document.getElementById(hexId);
        if (colorEl) {
            colorEl.addEventListener('input',  () => onInput(colorEl.value));
            colorEl.addEventListener('change', () => onSave(colorEl.value));
        }
        if (hexEl) {
            hexEl.addEventListener('input', () => {
                const v = hexEl.value.trim();
                if (/^#[0-9a-fA-F]{6}$/.test(v)) {
                    onInput(v);
                    if (colorEl) colorEl.value = v;
                }
            });
            hexEl.addEventListener('blur', () => {
                const v = hexEl.value.trim();
                if (/^#[0-9a-fA-F]{6}$/.test(v)) onSave(v);
                else if (colorEl) hexEl.value = colorEl.value;
            });
        }
    }

    bindColor('cfg-titleColor', 'cfg-titleColorHex',
        hex => setTitleColor(hex),
        hex => saveStyleField('titleColor', hex));

    bindColor('cfg-textColor', 'cfg-textColorHex',
        hex => setTextColor(hex),
        hex => saveStyleField('textColor', hex));

    bindColor('cfg-bgPage', 'cfg-bgPageHex',
        hex => { document.body.style.backgroundColor = hex; },
        hex => saveStyleField('bgPage', hex));

    bindColor('cfg-bgMenu', 'cfg-bgMenuHex',
        hex => {
            root.style.setProperty('--primary-color', hex);
            const contrast = contrastColor(hex);
            setTitleColor(contrast); setTextColor(contrast);
        },
        async hex => {
            const contrast = contrastColor(hex);
            await Promise.all([
                saveStyleField('bgMenu',     hex),
                saveStyleField('titleColor', contrast),
                saveStyleField('textColor',  contrast),
            ]);
        });

    // ── Logo: tamaño y opacidad ───────────────────────────────
    const logoSizeInp    = document.getElementById('cfg-logoSize');
    const logoSizeSpan   = document.getElementById('cfg-logoSizeVal');
    const logoOpacityInp = document.getElementById('cfg-logoOpacity');
    const logoOpSpan     = document.getElementById('cfg-logoOpacityVal');

    function applyLogoStyle() {
        const size = logoSizeInp?.value || 200;
        const op   = logoOpacityInp?.value || 100;
        root.style.setProperty('--logo-size',    size + 'px');
        root.style.setProperty('--logo-opacity', (op / 100).toString());
        const img = document.getElementById('adminLogoPreview');
        if (img) { img.style.maxWidth = size + 'px'; img.style.opacity = op / 100; }
    }
    if (logoSizeInp) {
        logoSizeInp.addEventListener('input', () => {
            if (logoSizeSpan) logoSizeSpan.textContent = logoSizeInp.value + 'px';
            applyLogoStyle();
        });
        logoSizeInp.addEventListener('change', () => saveStyleField('logoSize', parseInt(logoSizeInp.value)));
    }
    if (logoOpacityInp) {
        logoOpacityInp.addEventListener('input', () => {
            if (logoOpSpan) logoOpSpan.textContent = logoOpacityInp.value + '%';
            applyLogoStyle();
        });
        logoOpacityInp.addEventListener('change', () => saveStyleField('logoOpacity', parseInt(logoOpacityInp.value)));
    }

    // ── Encabezado del menú ───────────────────────────────────
    const headerModeCtrl = document.getElementById('headerModeCtrl');
    if (headerModeCtrl) {
        headerModeCtrl.querySelectorAll('.seg-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                headerModeCtrl.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                updateAdminHeader();
                await saveStyleField('headerMode', btn.dataset.value);
            });
        });
    }

    // ── Logo ──────────────────────────────────────────────────
    initMiniDrop('logoDrop',    'logoPreview',    'logoRemoveBtn',    'logoBase64',    false, 'logoBgRemove');

    document.getElementById('logoRemoveBgNowBtn')?.addEventListener('click', function () {
        removeBgFromPreview('logoPreview', 'logoBase64', false, this);
    });

    document.getElementById('logoRemoveBtn')?.addEventListener('click', async () => {
        const del = firebase.firestore.FieldValue.delete();
        await restRef().collection('config').doc('styles').update({ logoBase64: del, logoStorageUrl: del });
        if (storage) storage.ref(`restaurants/${restaurantId}/logo.png`).delete().catch(() => {});
        const p = document.getElementById('logoPreview'), b = document.getElementById('logoRemoveBtn'), g = document.getElementById('logoRemoveBgNowBtn');
        if (p) { p.src = ''; p.style.display = 'none'; }
        if (b) b.style.display = 'none';
        if (g) g.style.display = 'none';
        updateAdminHeader();
    });
}

function initMiniDrop(dropId, previewId, removeBtnId, firestoreKey, isFavicon, bgCheckId) {
    const zone = document.getElementById(dropId);
    if (!zone) return;
    const dropTextId  = dropId.replace('Drop', 'DropText');
    const getBgRemove = () => bgCheckId ? (document.getElementById(bgCheckId)?.checked ?? false) : false;

    const handleFile = file => uploadMiniImage(file, previewId, removeBtnId, firestoreKey, isFavicon, getBgRemove(), dropTextId);

    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', e => { if (!zone.contains(e.relatedTarget)) zone.classList.remove('drag-over'); });
    zone.addEventListener('drop', async e => {
        e.preventDefault(); zone.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file?.type.startsWith('image/')) await handleFile(file);
    });
    zone.addEventListener('click', () => {
        const inp = document.createElement('input');
        inp.type = 'file'; inp.accept = 'image/*';
        inp.onchange = async ev => { const file = ev.target.files[0]; if (file) await handleFile(file); };
        inp.click();
    });
}

// Sube el logo/favicon a Firebase Storage y devuelve la URL pública HTTP
async function uploadLogoToStorage(base64DataUrl, isFavicon) {
    if (!storage || !restaurantId) return null;
    try {
        const filename = isFavicon ? 'favicon.png' : 'logo.png';
        const resp = await fetch(base64DataUrl);
        const blob = await resp.blob();
        const ref  = storage.ref(`restaurants/${restaurantId}/${filename}`);
        await ref.put(blob, { contentType: 'image/png' });
        return await ref.getDownloadURL();
    } catch (e) {
        console.warn('Storage upload falló (no crítico):', e);
        return null;
    }
}

async function uploadMiniImage(file, previewId, removeBtnId, firestoreKey, isFavicon, removeBg, dropTextId) {
    const statusEl = dropTextId ? document.getElementById(dropTextId) : null;
    const setStatus = txt => { if (statusEl) statusEl.textContent = txt; };
    const origText = statusEl?.textContent || 'Arrastrá o clic';

    let fileToProcess = file;

    if (removeBg) {
        setStatus('Analizando…');
        const alreadyTransparent = await checkTransparency(file);
        if (alreadyTransparent) {
            setStatus('Sin fondo detectado, usando original');
            await new Promise(r => setTimeout(r, 800));
        } else {
            setStatus('Quitando fondo…');
            try {
                const { removeBackground } = await import('https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.4.5/+esm');
                let resultBlob = await removeBackground(file, { debug: true });
                resultBlob     = await cleanAlphaEdges(resultBlob);
                fileToProcess  = new File([resultBlob], 'img.png', { type: 'image/png' });
            } catch (bgErr) {
                console.error('Background removal falló:', bgErr);
                setStatus('Error al quitar fondo');
                await new Promise(r => setTimeout(r, 2500));
            }
        }
    }

    setStatus('Guardando…');
    const size = isFavicon ? 64 : 600;
    const mime = (removeBg || fileToProcess.type === 'image/png') ? 'image/png' : 'image/jpeg';
    const base64 = await compressToBase64(fileToProcess, size, size, mime, 0.9);
    await saveStyleField(firestoreKey, base64);

    const prev   = document.getElementById(previewId);
    const rmvBtn = document.getElementById(removeBtnId);
    const bgBtn  = document.getElementById(removeBtnId.replace('RemoveBtn', 'RemoveBgNowBtn'));
    if (prev)   { prev.src = base64; prev.style.display = 'block'; }
    if (rmvBtn) rmvBtn.style.display = 'block';
    if (bgBtn)  bgBtn.style.display  = 'block';
    setStatus(origText);
    updateAdminHeader();

    // Sube a Storage en segundo plano para tener URL pública (og:image, favicon real)
    const storageKey = isFavicon ? 'faviconStorageUrl' : 'logoStorageUrl';
    uploadLogoToStorage(base64, isFavicon).then(url => {
        if (url) saveStyleField(storageKey, url);
    });

    if (isFavicon) {
        let link = document.querySelector('link[rel="icon"]');
        if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
        link.href = base64;
    }
}

async function removeBgFromPreview(previewId, firestoreKey, isFavicon, btn) {
    const prev = document.getElementById(previewId);
    if (!prev?.src || prev.style.display === 'none') return;

    const origLabel = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Procesando…';

    try {
        const res  = await fetch(prev.src);
        const blob = await res.blob();
        const file = new File([blob], 'image.png', { type: blob.type || 'image/png' });

        const { removeBackground } = await import('https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.4.5/+esm');
        let resultBlob  = await removeBackground(file, { debug: true });
        resultBlob      = await cleanAlphaEdges(resultBlob);
        const processed = new File([resultBlob], 'img.png', { type: 'image/png' });

        const size   = isFavicon ? 64 : 400;
        const base64 = await compressToBase64(processed, size, size, 'image/png', 0.9);
        await saveStyleField(firestoreKey, base64);
        prev.src = base64;
        updateAdminHeader();

        const storageKey = isFavicon ? 'faviconStorageUrl' : 'logoStorageUrl';
        uploadLogoToStorage(base64, isFavicon).then(url => {
            if (url) saveStyleField(storageKey, url);
        });

        btn.textContent = '✓ Listo';
        setTimeout(() => { btn.textContent = origLabel; btn.disabled = false; }, 2000);

        if (isFavicon) {
            const link = document.querySelector('link[rel="icon"]') || document.createElement('link');
            link.rel  = 'icon';
            link.href = base64;
            if (!link.parentNode) document.head.appendChild(link);
        }
    } catch (err) {
        console.error('Error al quitar fondo:', err);
        btn.textContent = 'Error — reintentá';
        setTimeout(() => { btn.textContent = origLabel; btn.disabled = false; }, 3000);
    }
}

// ── Beneficios del plan ───────────────────────────────────────

function applyBenefitGating() {
    const b = window.userBenefits;
    if (!b) return; // null = superadmin o plan sin restrictions definidas → acceso total

    if (!hasBenefit(b, 'descriptions')) {
        document.body.classList.add('no-descriptions');
    }
    if (!hasBenefit(b, 'socials')) {
        document.getElementById('socialsSection')?.classList.add('feature-locked');
        document.getElementById('socialsBadge')?.classList.add('visible');
    }
    if (!hasBenefit(b, 'extra_fonts')) {
        document.body.classList.add('no-extra-fonts');
        document.querySelectorAll('optgroup[data-premium="extra_fonts"] option').forEach(o => o.disabled = true);
    }
    if (!hasBenefit(b, 'menu_bg')) {
        document.getElementById('menuBgSection')?.classList.add('feature-locked');
        document.getElementById('menuBgBadge')?.classList.add('visible');
    }
    if (!hasBenefit(b, 'page_bg')) {
        document.getElementById('pageBgSection')?.classList.add('feature-locked');
        document.getElementById('pageBgBadge')?.classList.add('visible');
    }
}

// ── Controles de imagen de fondo (menuBg / pageBg) ───────────

function initBgImageControls() {
    ['menuBg', 'pageBg'].forEach(key => {
        const btn    = document.getElementById(`${key}Btn`);
        const input  = document.getElementById(`${key}File`);
        const remove = document.getElementById(`${key}Remove`);
        const thumb  = document.getElementById(`${key}Thumb`);
        if (!btn) return;

        const showExtras = has => {
            const extras = document.getElementById(`${key}Extras`);
            if (extras) extras.style.display = has ? '' : 'none';
        };

        btn.addEventListener('click', () => input?.click());
        input?.addEventListener('change', async () => {
            const file = input.files[0];
            if (!file) return;
            const origLabel = btn.textContent;
            btn.textContent = 'Subiendo…';
            btn.disabled = true;
            try {
                const base64 = await compressToBase64(file, 1200, 800, 'image/jpeg', 0.8);
                const field  = key === 'menuBg' ? 'menuBgImage' : 'pageBgImage';
                await restRef().collection('config').doc('styles').set({ [field]: base64 }, { merge: true });
                if (thumb)  thumb.style.backgroundImage = `url('${base64}')`;
                if (remove) remove.style.display = '';
                showExtras(true);
            } catch (err) { console.error('Error subiendo fondo:', err); }
            finally { btn.textContent = origLabel; btn.disabled = false; input.value = ''; }
        });
        remove?.addEventListener('click', async () => {
            const field = key === 'menuBg' ? 'menuBgImage' : 'pageBgImage';
            await restRef().collection('config').doc('styles').set(
                { [field]: '', [`${key}Blur`]: 0, [`${key}OverlayColor`]: '', [`${key}OverlayOpacity`]: 0 },
                { merge: true }
            );
            if (thumb)  thumb.style.backgroundImage = '';
            if (remove) remove.style.display = 'none';
            showExtras(false);
        });
    });

    // Blur slider (menuBg only)
    const blurSlider = document.getElementById('menuBgBlur');
    const blurVal    = document.getElementById('menuBgBlurVal');
    if (blurSlider) {
        blurSlider.addEventListener('input', () => {
            if (blurVal) blurVal.textContent = `${blurSlider.value}px`;
        });
        blurSlider.addEventListener('change', async () => {
            await restRef().collection('config').doc('styles').set(
                { menuBgBlur: parseInt(blurSlider.value) }, { merge: true }
            );
        });
    }

    // Overlay color + opacity (menuBg only)
    const ovlColor   = document.getElementById('menuBgOverlayColor');
    const ovlOpacity = document.getElementById('menuBgOverlayOpacity');
    const ovlVal     = document.getElementById('menuBgOverlayVal');
    const saveOverlay = async () => {
        await restRef().collection('config').doc('styles').set({
            menuBgOverlayColor:   ovlColor?.value   || '#000000',
            menuBgOverlayOpacity: parseInt(ovlOpacity?.value || '0'),
        }, { merge: true });
    };
    ovlColor?.addEventListener('change', saveOverlay);
    ovlOpacity?.addEventListener('input', () => {
        if (ovlVal) ovlVal.textContent = `${ovlOpacity.value}%`;
    });
    ovlOpacity?.addEventListener('change', saveOverlay);
}
