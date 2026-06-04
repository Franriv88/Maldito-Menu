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
};

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
        container.innerHTML = '<p style="font-size:.7rem;color:rgba(200,184,154,.3);padding:.2rem 0;margin:0">Sin redes agregadas</p>';
    } else {
        container.innerHTML = footerSocials.map((s, i) => `
            <div class="social-row" draggable="true" data-idx="${i}">
                <span class="social-drag">${licon('grip-vertical', 14)}</span>
                ${socialSvg(s.network, s.color, 16)}
                <input class="social-url-input" data-idx="${i}" value="${esc(s.url || '')}"
                       placeholder="${SOCIAL_PLACEHOLDERS[s.network] || 'https://...'}">
                <input type="color" class="social-color-input" data-idx="${i}" value="${s.color || SOCIAL_NETS[s.network]?.color || '#c8b89a'}">
                <button class="social-remove-btn" data-idx="${i}">${licon('x', 13)}</button>
            </div>`).join('');

        // Eventos en la lista
        container.querySelectorAll('.social-url-input').forEach(inp => {
            inp.addEventListener('input', e => { footerSocials[+e.target.dataset.idx].url = e.target.value; });
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
                <button class="social-color-preset-btn" data-preset="titles">Color títulos</button>
                <button class="social-color-preset-btn" data-preset="texts">Color textos</button>
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
    { categorias: ['SALADOS', 'LAMINADOS'],               layout: 'normal',   imgKey: 'img3', imgDefault: IMG_PLACEHOLDER },
    { categorias: ['DULCES'],                             layout: 'reversed', imgKey: 'img4', imgDefault: IMG_PLACEHOLDER },
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

        // Topbar
        document.getElementById('topbarRestName').textContent  = nombre;
        document.getElementById('adminRestName').textContent   = nombre;
        document.getElementById('topbarUserName').textContent  = user.displayName || user.email;
        document.getElementById('viewMenuLink').href = `./menu.html?r=${restaurantId}`;
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

        const sectionsHTML = SECCIONES_CONFIG.map(sec => {
            const savedLayout = imageConfig[`${sec.imgKey}_layout`];
            const effectiveLayout = savedLayout || sec.layout;
            const layoutClass = effectiveLayout === 'reversed' ? 'layout-reversed' : '';
            const imgSrc  = imageConfig[sec.imgKey] || sec.imgDefault;
            const posVal    = typeof imageConfig[`${sec.imgKey}_pos`]    === 'number' ? imageConfig[`${sec.imgKey}_pos`]    : 50;
            const heightVal = typeof imageConfig[`${sec.imgKey}_height`] === 'number' ? imageConfig[`${sec.imgKey}_height`] : 300;
            const flipH  = imageConfig[`${sec.imgKey}_flipH`]  === true;
            const vAlign = imageConfig[`${sec.imgKey}_vAlign`] || 'center';

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
            <div class="menu-section ${layoutClass}" style="position:relative">
                <button class="layout-toggle-btn" data-img-key="${sec.imgKey}" title="Intercambiar texto e imagen">↔ Intercambiar</button>
                <div class="menu-content">${contentHTML}</div>
                <div class="menu-image drop-zone" data-img-key="${sec.imgKey}"
                     style="background-image:url('${imgSrc}');background-position:${posVal}% ${vAlign};height:${heightVal}px;min-height:0;${flipH ? 'transform:scaleX(-1);' : ''}">
                    <div class="drop-overlay"><span>Arrastrá o hacé clic para cambiar</span></div>
                    <div class="pos-controls">
                        <div class="ctrl-row">
                            <span class="ctrl-arrow">◀</span>
                            <input type="range" class="pos-slider" min="0" max="100" value="${posVal}">
                            <span class="ctrl-arrow">▶</span>
                        </div>
                        <div class="ctrl-row">
                            <span class="ctrl-arrow">−</span>
                            <input type="range" class="height-slider" min="150" max="600" value="${heightVal}">
                            <span class="ctrl-arrow">+</span>
                        </div>
                        <div class="ctrl-row">
                            <button class="img-flip-btn${flipH ? ' active' : ''}" title="Invertir horizontalmente">⇄</button>
                            <div class="valign-btns">
                                <button class="valign-btn${vAlign === 'top'    ? ' active' : ''}" data-valign="top"    title="Imagen arriba">▲</button>
                                <button class="valign-btn${vAlign === 'center' ? ' active' : ''}" data-valign="center" title="Imagen centrada">●</button>
                                <button class="valign-btn${vAlign === 'bottom' ? ' active' : ''}" data-valign="bottom" title="Imagen abajo">▼</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
        });

        container.innerHTML = sectionsHTML.join('');
        container.addEventListener('click', handleContainerClick);
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
            <span class="precio">$<input class="input-price" type="number" value="${esc(p.precio || '')}" placeholder="0" min="0"></span>
        </div>
        <div class="item-details visible">
            <input class="input-description" value="${esc(p.descripcion || '')}" placeholder="Descripción (opcional)">
        </div>
        <button class="delete-item-btn" type="button" title="Eliminar">${licon('x', 13)}</button>
    </div>`;
}

function handleContainerClick(e) {
    const deleteBtn = e.target.closest('.delete-item-btn');
    if (deleteBtn) { deleteBtn.closest('.admin-item').remove(); return; }

    const layoutBtn = e.target.closest('.layout-toggle-btn');
    if (layoutBtn) {
        const section = layoutBtn.closest('.menu-section');
        const imgKey  = layoutBtn.dataset.imgKey;
        section.classList.toggle('layout-reversed');
        const newLayout = section.classList.contains('layout-reversed') ? 'reversed' : 'normal';
        restRef().collection('config').doc('images').set(
            { [`${imgKey}_layout`]: newLayout }, { merge: true }
        ).catch(err => console.error('Error guardando layout:', err));
        return;
    }

    if (e.target.classList.contains('add-item-btn')) {
        const catDiv = e.target.previousElementSibling;
        catDiv.insertAdjacentHTML('beforeend', buildItemHTML({}));
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
            const input = document.createElement('input');
            input.type = 'file'; input.accept = 'image/*';
            input.onchange = async ev => {
                const file = ev.target.files[0];
                if (file) await uploadImage(file, zone.dataset.imgKey, zone, overlay);
            };
            input.click();
        });

        const slider = zone.querySelector('.pos-slider');
        if (slider) {
            slider.addEventListener('input', e => {
                e.stopPropagation();
                const v = zone.querySelector('.valign-btn.active')?.dataset.valign || 'center';
                zone.style.backgroundPosition = `${slider.value}% ${v}`;
            });
            slider.addEventListener('change', async e => {
                e.stopPropagation();
                try {
                    await restRef().collection('config').doc('images').set(
                        { [`${zone.dataset.imgKey}_pos`]: parseInt(slider.value) }, { merge: true }
                    );
                } catch (err) { console.error('Error guardando posición:', err); }
            });
        }

        const heightSlider = zone.querySelector('.height-slider');
        if (heightSlider) {
            heightSlider.addEventListener('input', e => {
                e.stopPropagation();
                zone.style.minHeight = '0'; zone.style.height = `${heightSlider.value}px`;
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
                zone.style.transform = isFlipped ? 'scaleX(-1)' : '';
                try {
                    await restRef().collection('config').doc('images').set(
                        { [`${zone.dataset.imgKey}_flipH`]: isFlipped }, { merge: true }
                    );
                } catch (err) { console.error('Error guardando flip:', err); }
            });
        }

        zone.querySelectorAll('.valign-btn').forEach(btn => {
            btn.addEventListener('click', async e => {
                e.stopPropagation();
                zone.querySelectorAll('.valign-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const v = btn.dataset.valign;
                const posVal = zone.querySelector('.pos-slider')?.value ?? 50;
                zone.style.backgroundPosition = `${posVal}% ${v}`;
                try {
                    await restRef().collection('config').doc('images').set(
                        { [`${zone.dataset.imgKey}_vAlign`]: v }, { merge: true }
                    );
                } catch (err) { console.error('Error guardando alineación:', err); }
            });
        });
    });
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

    // 2. Comprimir a base64 con Canvas (sin Firebase Storage, sin CORS)
    try {
        overlaySpan.textContent = 'Procesando…';
        const isPng  = fileToProcess.type === 'image/png';
        const base64 = await compressToBase64(
            fileToProcess,
            isPng ? 500 : 900,
            isPng ? 500 : 675,
            isPng ? 'image/png' : 'image/jpeg',
            0.72
        );

        // 3. Guardar en Firestore directamente
        overlaySpan.textContent = 'Guardando…';
        await restRef().collection('config').doc('images').set({ [imgKey]: base64 }, { merge: true });
        zone.style.backgroundImage = `url('${base64}')`;

    } catch (error) {
        console.error('Error al procesar imagen:', error);
        alert('Error al procesar la imagen. Intentá con un archivo más chico.');
    } finally {
        overlaySpan.textContent = textoOriginal;
        zone.classList.remove('uploading');
    }
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
    const saveBtn = document.getElementById('saveMenuBtn');
    saveBtn.classList.add('is-saving');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Guardando...';

    const productosParaGuardar = [];
    document.querySelectorAll('.admin-category').forEach(catDiv => {
        const categoria = catDiv.dataset.categoria;
        catDiv.querySelectorAll('.admin-item').forEach((item, index) => {
            const nombre      = item.querySelector('.input-product').value.trim();
            const precio      = parseFloat(item.querySelector('.input-price').value);
            const descripcion = item.querySelector('.input-description')?.value.trim() ?? '';
            if (nombre && !isNaN(precio) && precio >= 0) {
                productosParaGuardar.push({
                    nombre, precio, categoria, descripcion,
                    orden: ORDEN_CATEGORIAS[categoria] || 99,
                    ordenProducto: index
                });
            }
        });
    });

    const imageConfigActual = {};
    document.querySelectorAll('.drop-zone[data-img-key]').forEach(zone => {
        const key = zone.dataset.imgKey;
        if (!key) return;
        const posSlider    = zone.querySelector('.pos-slider');
        const heightSlider = zone.querySelector('.height-slider');
        const flipBtn      = zone.querySelector('.img-flip-btn');
        const activeVAlign = zone.querySelector('.valign-btn.active');
        if (posSlider)    imageConfigActual[`${key}_pos`]    = parseInt(posSlider.value);
        if (heightSlider) imageConfigActual[`${key}_height`] = parseInt(heightSlider.value);
        if (flipBtn)      imageConfigActual[`${key}_flipH`]  = flipBtn.classList.contains('active');
        if (activeVAlign) imageConfigActual[`${key}_vAlign`] = activeVAlign.dataset.valign;
    });
    document.querySelectorAll('.layout-toggle-btn[data-img-key]').forEach(btn => {
        const key = btn.dataset.imgKey;
        const section = btn.closest('.menu-section');
        if (key && section) {
            imageConfigActual[`${key}_layout`] = section.classList.contains('layout-reversed') ? 'reversed' : 'normal';
        }
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
        alert('¡Menú guardado con éxito!');
    } catch (error) {
        console.error('Error al guardar:', error);
        alert('Error al guardar. Revisá la consola.');
    } finally {
        saveBtn.classList.remove('is-saving');
        saveBtn.disabled = false;
        saveBtn.textContent = 'Guardar Menú';
    }
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
    // Favicon: preferir URL Storage (HTTP real) → fallback a base64
    const iconSrc = cfg.faviconStorageUrl || cfg.logoStorageUrl || cfg.faviconBase64 || cfg.logoBase64;
    if (iconSrc) {
        const old = document.getElementById('favicon-link') || document.querySelector('link[rel="icon"]');
        if (old) old.remove();
        const link = document.createElement('link');
        link.rel = 'icon'; link.id = 'favicon-link'; link.href = iconSrc;
        document.head.appendChild(link);
    }
    const logoPreview    = document.getElementById('logoPreview');
    const logoRemove     = document.getElementById('logoRemoveBtn');
    const logoRemoveBgNow = document.getElementById('logoRemoveBgNowBtn');
    if (cfg.logoBase64) {
        if (logoPreview)    { logoPreview.src = cfg.logoBase64; logoPreview.style.display = 'block'; }
        if (logoRemove)     logoRemove.style.display     = 'block';
        if (logoRemoveBgNow) logoRemoveBgNow.style.display = 'block';
    }
    const favPreview     = document.getElementById('faviconPreview');
    const favRemove      = document.getElementById('faviconRemoveBtn');
    const favRemoveBgNow = document.getElementById('faviconRemoveBgNowBtn');
    if (cfg.faviconBase64) {
        if (favPreview)     { favPreview.src = cfg.faviconBase64; favPreview.style.display = 'block'; }
        if (favRemove)      favRemove.style.display      = 'block';
        if (favRemoveBgNow) favRemoveBgNow.style.display = 'block';
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

function initStyleControls() {
    const root = document.documentElement;

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

    // ── Logo y favicon ────────────────────────────────────────
    initMiniDrop('logoDrop',    'logoPreview',    'logoRemoveBtn',    'logoBase64',    false, 'logoBgRemove');
    initMiniDrop('faviconDrop', 'faviconPreview', 'faviconRemoveBtn', 'faviconBase64', true,  'faviconBgRemove');

    document.getElementById('logoRemoveBgNowBtn')?.addEventListener('click', function () {
        removeBgFromPreview('logoPreview', 'logoBase64', false, this);
    });
    document.getElementById('faviconRemoveBgNowBtn')?.addEventListener('click', function () {
        removeBgFromPreview('faviconPreview', 'faviconBase64', true, this);
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
    document.getElementById('faviconRemoveBtn')?.addEventListener('click', async () => {
        const del = firebase.firestore.FieldValue.delete();
        await restRef().collection('config').doc('styles').update({ faviconBase64: del, faviconStorageUrl: del });
        if (storage) storage.ref(`restaurants/${restaurantId}/favicon.png`).delete().catch(() => {});
        const p = document.getElementById('faviconPreview'), b = document.getElementById('faviconRemoveBtn'), g = document.getElementById('faviconRemoveBgNowBtn');
        if (p) { p.src = ''; p.style.display = 'none'; }
        if (b) b.style.display = 'none';
        if (g) g.style.display = 'none';
        const link = document.querySelector('link[rel="icon"]');
        if (link) link.href = './img/icons/MalditoCaféIcon.jpg';
    });

    // ── Favicon info modal ────────────────────────────────────
    document.getElementById('faviconInfoBtn')?.addEventListener('click', () => {
        document.getElementById('faviconModal').style.display = 'flex';
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
