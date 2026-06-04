// menu-viewers.js — vista pública del menú (multi-tenant)

const SOCIAL_NETS = {
    instagram: { label:'Instagram', color:'#E1306C', path:'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z' },
    facebook:  { label:'Facebook',  color:'#1877F2', path:'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z' },
    tiktok:    { label:'TikTok',    color:'#010101', path:'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z' },
    twitter:   { label:'X',         color:'#000000', path:'M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z' },
    youtube:   { label:'YouTube',   color:'#FF0000', path:'M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z' },
    whatsapp:  { label:'WhatsApp',  color:'#25D366', path:'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z' },
    linkedin:  { label:'LinkedIn',  color:'#0A66C2', path:'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z' },
};

function socialSvg(network, color, size = 22) {
    const n = SOCIAL_NETS[network];
    if (!n) return '';
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color || n.color}"><path d="${n.path}"/></svg>`;
}

function safeUrl(url) {
    try {
        const u = new URL(url);
        return (u.protocol === 'http:' || u.protocol === 'https:') ? url : '#';
    } catch { return '#'; }
}

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
    let imageConfig   = {};
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
            header.innerHTML = `<img src="${logoSrc}" alt="${restData.nombre || ''}" style="max-width:var(--logo-size,200px);opacity:var(--logo-opacity,1)">`;
        } else {
            header.innerHTML = `<h1>${restData.nombre || ''}</h1>`;
        }
        const disclaimer = document.getElementById('menu-disclaimer');
        if (disclaimer) disclaimer.style.display = 'block';
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
                const target = href !== '#' ? ' target="_blank" rel="noopener noreferrer"' : '';
                html += `<a class="footer-social-link" href="${href}"${target} title="${SOCIAL_NETS[s.network].label}">${socialSvg(s.network, s.color)}</a>`;
            });
            html += '</div>';
        }

        if (notice)  html += `<p class="footer-notice">${notice}</p>`;
        if (address) html += `<p class="footer-address">${address}</p>`;

        footer.innerHTML = html;
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
            const posVal    = typeof imageConfig[`${sec.imgKey}_pos`]    === 'number' ? imageConfig[`${sec.imgKey}_pos`]    : 50;
            const heightVal = typeof imageConfig[`${sec.imgKey}_height`] === 'number' ? imageConfig[`${sec.imgKey}_height`] : 300;
            const flipH  = imageConfig[`${sec.imgKey}_flipH`]  === true;
            const vAlign = imageConfig[`${sec.imgKey}_vAlign`] || 'center';

            let contentHTML = '';
            sec.categorias.forEach(cat => {
                const productos = byCategory[cat] || [];
                if (!productos.length) return;
                contentHTML += `<h2>${catTitles[cat] || cat}</h2>`;
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
                <div class="menu-image${flipH ? ' img-flipped' : ''}"
                     style="background-image:url('${imgSrc}');background-position:${posVal}% ${vAlign};min-height:${heightVal}px;"></div>`;
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
        // Construir contenido con ícono Lucide
        function buildShareBtnContent() {
            if (typeof lucide !== 'undefined') {
                try {
                    const ico = lucide.createElement('share-2');
                    ico.setAttribute('width', 15); ico.setAttribute('height', 15);
                    ico.setAttribute('stroke-width', '1.75');
                    ico.style.cssText = 'display:inline-block;vertical-align:middle;flex-shrink:0';
                    shareBtn.innerHTML = '';
                    shareBtn.appendChild(ico);
                    shareBtn.append(' Compartir');
                } catch(_) { shareBtn.textContent = 'Compartir'; }
            } else {
                shareBtn.textContent = 'Compartir';
            }
        }
        buildShareBtnContent();
        shareBtn.style.display = 'block';

        shareBtn.addEventListener('click', async () => {
            const url = location.href;
            if (navigator.share) {
                navigator.share({ title: document.title, url }).catch(() => {});
            } else {
                await navigator.clipboard.writeText(url);
                shareBtn.textContent = '¡Link copiado!';
                setTimeout(() => buildShareBtnContent(), 2000);
            }
        });
    }
});
