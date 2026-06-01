// script.js — Admin del menú (multi-tenant con auth)

const SECCIONES_CONFIG = [
    { categorias: ['CAFÉ DE ESPECIALIDAD', 'CAFÉ FRÍO'],  layout: 'normal',   imgKey: 'img1', imgDefault: './img/img/coffee.png'    },
    { categorias: ['BEBIDAS', 'EXTRAS'],                  layout: 'reversed', imgKey: 'img2', imgDefault: './img/img/tea.png'       },
    { categorias: ['SALADOS', 'LAMINADOS'],               layout: 'normal',   imgKey: 'img3', imgDefault: './img/img/croissant.png' },
    { categorias: ['DULCES'],                             layout: 'reversed', imgKey: 'img4', imgDefault: './img/img/cookie.png'    },
];

const ORDEN_CATEGORIAS = {
    'CAFÉ DE ESPECIALIDAD': 1, 'CAFÉ FRÍO': 2,
    'BEBIDAS': 3, 'EXTRAS': 4,
    'SALADOS': 5, 'LAMINADOS': 6,
    'DULCES': 7
};

const restaurantId = new URLSearchParams(location.search).get('r');

// ── Auth guard ────────────────────────────────────────────────

auth.onAuthStateChanged(async user => {
    if (!user) { window.location.href = './index.html'; return; }
    if (!restaurantId) { window.location.href = './dashboard.html'; return; }

    // Verificar que el usuario es dueño
    try {
        const restDoc = await db.collection('restaurants').doc(restaurantId).get();
        if (!restDoc.exists || restDoc.data().ownerId !== user.uid) {
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
        document.getElementById('logoutBtn').addEventListener('click', () => auth.signOut().then(() => window.location.href = './index.html'));
        document.getElementById('saveMenuBtn').addEventListener('click', guardarMenu);

        await renderAdminMenu();
    } catch (err) {
        console.error('Error verificando acceso:', err);
        document.getElementById('admin-menu-container').innerHTML = '<p style="color:red;padding:2rem">Error al cargar. Intentá de nuevo.</p>';
    }
});

// ── Referencia al restaurante ─────────────────────────────────

function restRef() {
    return db.collection('restaurants').doc(restaurantId);
}

// ── Renderizado del menú ──────────────────────────────────────

async function renderAdminMenu() {
    const container = document.getElementById('admin-menu-container');

    try {
        const [productsSnap, imagesDoc, stylesDoc] = await Promise.all([
            restRef().collection('productos').orderBy('orden', 'asc').orderBy('ordenProducto', 'asc').get(),
            restRef().collection('config').doc('images').get().catch(() => ({ exists: false, data: () => ({}) })),
            restRef().collection('config').doc('styles').get().catch(() => ({ exists: false, data: () => ({}) })),
        ]);

        const imageConfig  = imagesDoc.exists  ? imagesDoc.data()  : {};
        const styleConfig  = stylesDoc.exists  ? stylesDoc.data()  : {};

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

            const contentHTML = sec.categorias.map(cat => {
                const productos  = byCategory[cat] || [];
                const itemsHTML  = productos.length > 0
                    ? productos.map(p => buildItemHTML(p)).join('')
                    : buildItemHTML({});
                return `
                    <h2>${cat}</h2>
                    <div class="admin-category" data-categoria="${esc(cat)}">${itemsHTML}</div>
                    <button class="add-item-btn" data-categoria="${esc(cat)}">+ Agregar</button>`;
            }).join('');

            return `
            <div class="menu-section ${layoutClass}" style="position:relative">
                <button class="layout-toggle-btn" data-img-key="${sec.imgKey}" title="Intercambiar texto e imagen">↔ Intercambiar</button>
                <div class="menu-content">${contentHTML}</div>
                <div class="menu-image drop-zone" data-img-key="${sec.imgKey}"
                     style="background-image:url('${imgSrc}');background-position:${posVal}% center;height:${heightVal}px;min-height:0;">
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
                    </div>
                </div>
            </div>`;
        });

        container.innerHTML = sectionsHTML.join('');
        container.addEventListener('click', handleContainerClick);
        initDropZones();

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
        <button class="delete-item-btn" type="button" title="Eliminar">×</button>
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
            slider.addEventListener('input', e => { e.stopPropagation(); zone.style.backgroundPosition = `${slider.value}% center`; });
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
        if (posSlider)    imageConfigActual[`${key}_pos`]    = parseInt(posSlider.value);
        if (heightSlider) imageConfigActual[`${key}_height`] = parseInt(heightSlider.value);
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
    if (cfg.fontFamily)    r.style.setProperty('--main-font-family', cfg.fontFamily);
    if (cfg.titleColor)    r.style.setProperty('--title-color',     cfg.titleColor);
    if (cfg.textColor)     r.style.setProperty('--text-color',      cfg.textColor);
    if (cfg.bgPage)        document.body.style.backgroundColor = cfg.bgPage;
    if (cfg.bgMenu)        r.style.setProperty('--primary-color',   cfg.bgMenu);
    if (cfg.fontSize)      r.style.setProperty('--base-font-size',  cfg.fontSize + 'px');
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
    setVal('cfg-fontFamily', cfg.fontFamily);
    setVal('cfg-fontSize',   cfg.fontSize);
    setVal('cfg-titleColor', cfg.titleColor);
    setVal('cfg-textColor',  cfg.textColor);
    setVal('cfg-bgPage',     cfg.bgPage);
    setVal('cfg-bgMenu',     cfg.bgMenu);
    const sizeSpan = document.getElementById('cfg-fontSizeVal');
    if (sizeSpan && cfg.fontSize) sizeSpan.textContent = cfg.fontSize + 'px';
    [['cfg-titleColor','cfg-titleColorHex'], ['cfg-textColor','cfg-textColorHex'],
     ['cfg-bgPage','cfg-bgPageHex'],         ['cfg-bgMenu','cfg-bgMenuHex']].forEach(([inpId, spanId]) => {
        const inp = document.getElementById(inpId), span = document.getElementById(spanId);
        if (inp && span) span.textContent = inp.value;
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
        nameEl.style.display = 'none';
        logoEl.src            = logoSrc;
        logoEl.style.display  = 'block';
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

function initStyleControls() {
    const root = document.documentElement;

    // ── Fuente ────────────────────────────────────────────────
    const fontSel = document.getElementById('cfg-fontFamily');
    if (fontSel) fontSel.addEventListener('change', async () => {
        root.style.setProperty('--main-font-family', fontSel.value);
        document.querySelectorAll('.menu-item, .menu-content h2, .input-product, .input-price, .input-description')
            .forEach(el => el.style.fontFamily = fontSel.value);
        await saveStyleField('fontFamily', fontSel.value);
    });

    // ── Tamaño de fuente ──────────────────────────────────────
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

    // ── Helpers para aplicar colores con feedback visual ──────
    function setTitleColor(hex) {
        root.style.setProperty('--title-color', hex);
        document.querySelectorAll('.menu-content h2').forEach(el => el.style.color = hex);
        const inp = document.getElementById('cfg-titleColor'), span = document.getElementById('cfg-titleColorHex');
        if (inp)  inp.value       = hex;
        if (span) span.textContent = hex;
    }

    function setTextColor(hex) {
        root.style.setProperty('--text-color', hex);
        document.querySelectorAll('.menu-item, .producto').forEach(el => el.style.color = hex);
        const inp = document.getElementById('cfg-textColor'), span = document.getElementById('cfg-textColorHex');
        if (inp)  inp.value       = hex;
        if (span) span.textContent = hex;
    }

    // ── Color de títulos ──────────────────────────────────────
    const titleInp = document.getElementById('cfg-titleColor');
    if (titleInp) {
        titleInp.addEventListener('input',  () => setTitleColor(titleInp.value));
        titleInp.addEventListener('change', () => saveStyleField('titleColor', titleInp.value));
    }

    // ── Color de productos ────────────────────────────────────
    const textInp = document.getElementById('cfg-textColor');
    if (textInp) {
        textInp.addEventListener('input',  () => setTextColor(textInp.value));
        textInp.addEventListener('change', () => saveStyleField('textColor', textInp.value));
    }

    // ── Fondo de página ───────────────────────────────────────
    const bgPageInp = document.getElementById('cfg-bgPage');
    if (bgPageInp) {
        bgPageInp.addEventListener('input', () => {
            document.body.style.backgroundColor = bgPageInp.value;
            const span = document.getElementById('cfg-bgPageHex');
            if (span) span.textContent = bgPageInp.value;
        });
        bgPageInp.addEventListener('change', () => saveStyleField('bgPage', bgPageInp.value));
    }

    // ── Fondo del menú + auto-contraste ──────────────────────
    const bgMenuInp = document.getElementById('cfg-bgMenu');
    if (bgMenuInp) {
        bgMenuInp.addEventListener('input', () => {
            const hex = bgMenuInp.value;
            root.style.setProperty('--primary-color', hex);
            const span = document.getElementById('cfg-bgMenuHex');
            if (span) span.textContent = hex;
            const contrast = contrastColor(hex);
            setTitleColor(contrast);
            setTextColor(contrast);
        });
        bgMenuInp.addEventListener('change', async () => {
            const hex      = bgMenuInp.value;
            const contrast = contrastColor(hex);
            await Promise.all([
                saveStyleField('bgMenu',      hex),
                saveStyleField('titleColor',  contrast),
                saveStyleField('textColor',   contrast),
            ]);
        });
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
