// menu-viewers.js — vista pública del menú (multi-tenant)

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

    let lastSnapshot = null;
    let imageConfig  = {};
    let restData     = {};
    let stylesConfig = {};

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

    // ── Listener 3b: estilos ───────────────────────────────────
    restRef.collection('config').doc('styles').onSnapshot(doc => {
        stylesConfig = doc.exists ? doc.data() : {};
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
        if (cfg.fontFamily) r.style.setProperty('--main-font-family', cfg.fontFamily);
        if (cfg.titleColor) r.style.setProperty('--title-color',      cfg.titleColor);
        if (cfg.textColor)  r.style.setProperty('--text-color',       cfg.textColor);
        if (cfg.bgPage)     document.body.style.backgroundColor = cfg.bgPage;
        if (cfg.bgMenu)     r.style.setProperty('--primary-color',    cfg.bgMenu);
        if (cfg.fontSize)   r.style.setProperty('--base-font-size',   cfg.fontSize + 'px');

        // Favicon: preferir URL HTTP real (Storage) → fallback a base64
        const iconSrc = cfg.faviconStorageUrl || cfg.logoStorageUrl || cfg.faviconBase64 || cfg.logoBase64;
        if (iconSrc) setFavicon(iconSrc);
    }

    // ── Favicon (fuerza recarga para evitar caché del browser) ──
    function setFavicon(src) {
        const old = document.getElementById('favicon-link');
        if (old) old.remove();
        const link = document.createElement('link');
        link.rel = 'icon'; link.id = 'favicon-link'; link.href = src;
        document.head.appendChild(link);
    }

    // ── Meta tags para compartir (og:image, og:title, favicon) ─
    function updateShareMeta() {
        const nombre  = restData.nombre || 'Menú';
        const logoSrc = stylesConfig.faviconBase64 || stylesConfig.logoBase64 || '';

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
            header.innerHTML = `<img src="${logoSrc}" alt="${restData.nombre || ''}">`;
        } else {
            header.innerHTML = `<h1>${restData.nombre || ''}</h1>`;
        }
        const disclaimer = document.getElementById('menu-disclaimer');
        if (disclaimer) disclaimer.style.display = 'block';
    }

    // ── Footer ─────────────────────────────────────────────────
    function renderFooter() {
        const footer = document.getElementById('restaurant-footer');
        if (!footer || !restData) return;
        let html = '';
        if (restData.horario)   html += `<p>${restData.horario}</p>`;
        if (restData.instagram) html += `<p><a href="https://instagram.com/${restData.instagram.replace('@','')}" style="color:inherit">@${restData.instagram.replace('@','')}</a></p>`;
        if (restData.direccion) html += `<p>${restData.direccion}</p>`;
        footer.innerHTML = `<div style="color:#7C6C5C;text-align:center;font-size:0.85rem;padding:1rem">${html}</div>`;
    }

    // ── Render menú ────────────────────────────────────────────
    const SECCIONES_CONFIG = [
        { categorias: ['CAFÉ DE ESPECIALIDAD', 'CAFÉ FRÍO'],  layout: 'normal',   imgKey: 'img1', imgDefault: './img/img/coffee.png'    },
        { categorias: ['BEBIDAS', 'EXTRAS'],                  layout: 'reversed', imgKey: 'img2', imgDefault: './img/img/tea.png'       },
        { categorias: ['SALADOS', 'LAMINADOS'],               layout: 'normal',   imgKey: 'img3', imgDefault: './img/img/croissant.png' },
        { categorias: ['DULCES'],                             layout: 'reversed', imgKey: 'img4', imgDefault: './img/img/cookie.png'    },
    ];

    function renderMenu() {
        const snapshot = lastSnapshot;
        const byCategory = {};
        snapshot.forEach(doc => {
            const item = { id: doc.id, ...doc.data() };
            if (!byCategory[item.categoria]) byCategory[item.categoria] = [];
            byCategory[item.categoria].push(item);
        });

        menuContainer.innerHTML = '';

        SECCIONES_CONFIG.forEach(sec => {
            const hasProducts = sec.categorias.some(cat => (byCategory[cat] || []).length > 0);
            if (!hasProducts) return;

            const effectiveLayout = imageConfig[`${sec.imgKey}_layout`] || sec.layout;
            const layoutClass = effectiveLayout === 'reversed' ? 'layout-reversed' : '';
            const imgSrc  = imageConfig[sec.imgKey] || sec.imgDefault;
            const posVal  = typeof imageConfig[`${sec.imgKey}_pos`]    === 'number' ? imageConfig[`${sec.imgKey}_pos`]    : 50;
            const heightVal = typeof imageConfig[`${sec.imgKey}_height`] === 'number' ? imageConfig[`${sec.imgKey}_height`] : 300;

            let contentHTML = '';
            sec.categorias.forEach(cat => {
                const productos = byCategory[cat] || [];
                if (!productos.length) return;
                contentHTML += `<h2>${cat}</h2>`;
                productos.forEach(item => {
                    const desc = item.descripcion || 'El clásico de la casa.';
                    contentHTML += `
                        <div class="menu-item">
                            <div class="item-header">
                                <span class="producto">${item.nombre}</span>
                                <span class="precio">$${item.precio}</span>
                            </div>
                            <div class="item-details"><p>${desc}</p></div>
                        </div>`;
                });
            });

            const sectionEl = document.createElement('div');
            sectionEl.className = `menu-section ${layoutClass}`;
            sectionEl.innerHTML = `
                <div class="menu-content">${contentHTML}</div>
                <div class="menu-image"
                     style="background-image:url('${imgSrc}');background-position:${posVal}% center;height:${heightVal}px;">
                </div>`;
            menuContainer.appendChild(sectionEl);
        });

        iniciarDemostracionAcordeon();
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
    async function iniciarDemostracionAcordeon() {
        const primer = document.querySelector('.menu-item');
        if (!primer) return;
        const det = primer.querySelector('.item-details');
        if (!det) return;
        await sleep(900);
        for (let i = 0; i < 2; i++) {
            det.classList.add('visible'); await sleep(500);
            det.classList.remove('visible'); await sleep(500);
        }
    }

    // ── Botón compartir ────────────────────────────────────────
    const shareBtn = document.getElementById('shareBtn');
    if (shareBtn) {
        shareBtn.style.display = 'block';
        shareBtn.addEventListener('click', async () => {
            const url = location.href;
            if (navigator.share) {
                navigator.share({ title: document.title, url }).catch(() => {});
            } else {
                await navigator.clipboard.writeText(url);
                shareBtn.textContent = '¡Link copiado!';
                setTimeout(() => shareBtn.textContent = '⬆ Compartir', 2000);
            }
        });
    }
});
