// Js/nfc.js — Grabar (y bloquear) los stickers NFC de las mesas desde el celular.
// Se abre escaneando el QR de Pedidos → Mesas en la computadora. No requiere iniciar sesión:
// la lista de mesas (config/ordering) es pública porque la usa el menú.
//  - Android con Chrome (Web NFC): graba y bloquea desde acá, de a una o todas seguidas.
//  - iPhone u otros: pasos con la app NFC Tools y botón "Copiar link" por mesa.

const restaurantId = new URLSearchParams(location.search).get('r');
const hasWebNfc = 'NDEFReader' in window;
const canLock   = hasWebNfc && 'makeReadOnly' in NDEFReader.prototype;
const isIOS     = /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isMobile  = isIOS || /Android|Mobi/i.test(navigator.userAgent);
const tableUrl  = id => `${location.origin}/menu.html?r=${restaurantId}&mesa=${id}`;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const status = {};   // id → 'written' | 'locked'
let tables = [], isCatering = false;

const swalTheme = () => document.body.classList.contains('light')
    ? { background: '#fffdf9', color: '#3a2e22', confirmButtonColor: '#6b5135' }
    : { background: '#1a1a1a', color: '#ddd0bb', confirmButtonColor: '#c8b89a' };
const sw = opts => Swal.fire({ ...swalTheme(), ...opts });

document.addEventListener('DOMContentLoaded', async () => {
    initThemeToggle('themeBtn');
    if (!restaurantId || !db) { document.getElementById('subtitle').textContent = 'Link inválido. Escaneá de nuevo el QR desde Pedidos → Mesas.'; return; }

    const [restSnap, cfgSnap] = await Promise.all([
        db.collection('restaurants').doc(restaurantId).get(),
        db.collection('restaurants').doc(restaurantId).collection('config').doc('ordering').get(),
    ]).catch(() => [null, null]);
    if (!restSnap?.exists) { document.getElementById('subtitle').textContent = 'No encontramos este restaurante.'; return; }
    const cfg = cfgSnap?.exists ? cfgSnap.data() : {};
    tables = cfg.tables || [];
    isCatering = cfg.businessType === 'catering';

    document.title = `Grabar stickers NFC · ${restSnap.data().nombre || 'Cubierto'}`;
    document.getElementById('subtitle').textContent = `${restSnap.data().nombre || ''} · ${tables.length} ${isCatering ? (tables.length === 1 ? 'cliente' : 'clientes') : (tables.length === 1 ? 'mesa' : 'mesas')}`;
    document.getElementById('itemWord').textContent = isCatering ? 'el cliente' : 'la mesa';
    document.getElementById('writeAllLabel').textContent = isCatering ? 'Grabar todos, uno por uno' : 'Grabar todas, una por una';

    if (hasWebNfc) {
        document.getElementById('androidMode').hidden = false;
        if (!canLock) { const l = document.getElementById('lockAfter'); l.checked = false; l.closest('.card').hidden = true; }
        document.getElementById('writeAllBtn').addEventListener('click', writeAll);
    } else if (isMobile) {
        document.getElementById('appMode').hidden = false;
        document.getElementById('storeLink').href = isIOS
            ? 'https://apps.apple.com/app/nfc-tools/id1252962749'
            : 'https://play.google.com/store/apps/details?id=com.wakdev.wdnfc';
    } else {
        // Computadora: QR de esta misma página para abrirla en el celular
        document.getElementById('desktopMode').hidden = false;
        if (typeof qrcode === 'function') {
            const qr = qrcode(0, 'M');
            qr.addData(location.href);
            qr.make();
            document.getElementById('phoneQr').innerHTML = qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
        }
    }
    render();
    lucide.createIcons();
});

function render() {
    const list = document.getElementById('tableList');
    if (!tables.length) {
        list.innerHTML = `<p class="empty">${isCatering ? 'Todavía no hay clientes.' : 'Todavía no hay mesas.'} Agregalas desde Pedidos en la computadora y volvé a abrir esta página.</p>`;
        return;
    }
    list.innerHTML = tables.map(t => {
        const st = status[t.id];
        const state = st === 'locked' ? `${icon('lock', 13)} Grabada y bloqueada` : st === 'written' ? `${icon('check', 13)} Grabada` : '';
        const action = hasWebNfc
            ? `<button class="btn" data-write="${t.id}">${icon('nfc', 16)} ${st ? 'Volver a grabar' : 'Grabar'}</button>`
            : `<button class="btn" data-copy="${t.id}">${icon('copy', 16)} Copiar link</button>`;
        return `<div class="row"><div class="row-name"><b>${esc(t.label)}</b><span class="row-state ${st ? 'ok' : ''}">${state}</span></div>${action}</div>`;
    }).join('');
    list.querySelectorAll('[data-write]').forEach(b => b.addEventListener('click', () => writeOne(tables.find(t => t.id === b.dataset.write))));
    list.querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', async () => {
        const url = tableUrl(b.dataset.copy);
        try { await navigator.clipboard.writeText(url); } catch { prompt('Copiá este link:', url); return; }
        b.innerHTML = `${icon('check', 16)} Copiado`;
        setTimeout(() => { b.innerHTML = `${icon('copy', 16)} Copiar link`; }, 1800);
    }));
}

function icon(name, size) {
    const def = window.lucide?.[name.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join('')];
    if (!def) return '';
    const el = lucide.createElement(def);
    el.setAttribute('width', size); el.setAttribute('height', size);
    return el.outerHTML;
}

// Graba un sticker y, si está marcado, lo bloquea en el mismo acercamiento.
// Devuelve false si el usuario canceló.
async function writeOne(t, { step } = {}) {
    const lock = document.getElementById('lockAfter').checked && canLock;
    const ctrl = new AbortController();
    const waiting = sw({
        title: `${step ? `${step} · ` : ''}${esc(t.label)}`,
        html: `Acercá el sticker a la parte de atrás del celular${lock ? ' y <b>mantenelo apoyado</b> hasta que termine (se graba y se bloquea)' : ''}.`,
        showConfirmButton: false, showCancelButton: true, cancelButtonText: step ? 'Terminar' : 'Cancelar',
    });
    waiting.then(r => { if (r.isDismissed) ctrl.abort(); });
    try {
        const ndef = new NDEFReader();
        await ndef.write({ records: [{ recordType: 'url', data: tableUrl(t.id) }] }, { signal: ctrl.signal });
        status[t.id] = 'written';
        if (lock) {
            await ndef.makeReadOnly({ signal: ctrl.signal });
            status[t.id] = 'locked';
        }
        render();
        if (!step) await sw({ icon: 'success', title: lock ? 'Grabada y bloqueada' : 'Grabada', timer: 1500, showConfirmButton: false });
        else Swal.close();
        return true;
    } catch (err) {
        render();
        if (err.name === 'AbortError') return false;
        const r = await sw({ icon: 'error', title: 'No se pudo grabar',
            text: `${err.message}. Probá apoyar el sticker en otra parte del celular.`,
            showCancelButton: true, confirmButtonText: 'Reintentar', cancelButtonText: step ? 'Terminar' : 'Cerrar' });
        return r.isConfirmed ? writeOne(t, { step }) : false;
    }
}

async function writeAll() {
    const pending = tables.filter(t => !status[t.id]);
    const list = pending.length ? pending : tables;
    for (let i = 0; i < list.length; i++) {
        const goOn = await writeOne(list[i], { step: `${i + 1} de ${list.length}` });
        if (!goOn) return;
    }
    sw({ icon: 'success', title: '¡Listo!', text: `Se grabaron ${list.length} ${isCatering ? 'stickers de clientes' : 'stickers de mesas'}.` });
}
