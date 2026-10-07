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

// Mientras Chrome espera un sticker para grabar, Android no deja leer NFC en el resto del
// sistema. Por eso la operación se libera siempre: al terminar, al cancelar, y apenas la
// página deja de verse (otra pestaña, otra app, pantalla apagada o se cierra).
let activeNfc = null;
function releaseNfc() {
    if (!activeNfc) return;
    try { activeNfc.abort(); } catch { /* ya liberado */ }
    activeNfc = null;
}
// Lectura "en espera": con la página abierta, Chrome recibe cualquier sticker que se acerque
// (si no, Android abre el link que tenga grabado y no se lo puede reescribir).
let idleScan = null, idleWanted = false;
async function startIdleScan() {
    if (!hasWebNfc || idleScan || activeNfc || document.hidden) return;
    const ctrl = new AbortController();
    idleScan = ctrl;
    try {
        const reader = new NDEFReader();
        reader.onreading = e => { if (idleScan === ctrl && !activeNfc) onIdleTag(e.message); };
        reader.onreadingerror = () => { if (idleScan === ctrl && !activeNfc) onIdleTag(null); };
        await reader.scan({ signal: ctrl.signal });
        idleWanted = true;
        setScanUI('on');
    } catch (err) {
        if (idleScan === ctrl) idleScan = null;
        if (err.name !== 'AbortError') showNfcProblem(err);
    }
}
function stopIdleScan() {
    if (!idleScan) return;
    try { idleScan.abort(); } catch { /* ya liberado */ }
    idleScan = null;
}
// Por qué no se pudo usar el NFC, con el paso para resolverlo (Chrome rechaza sin preguntar
// si el permiso quedó bloqueado, si la página está dentro de otra app, o si el NFC está apagado)
async function nfcProblemHTML(err) {
    let perm = '';
    try { perm = (await navigator.permissions.query({ name: 'nfc' })).state; } catch { /* sin Permissions API */ }
    const detail = `<small class="err-detail">Detalle: ${esc(err?.name || 'Error')}${err?.message ? ' · ' + esc(err.message) : ''}${perm ? ' · permiso: ' + esc(perm) : ''}</small>`;
    if (perm === 'denied') return `<b>El permiso de NFC está bloqueado</b> para cubierto.menu. Para habilitarlo:
        <ol class="steps"><li>Tocá el <b>candado</b> (o el ícono de ajustes) a la izquierda de la dirección, arriba.</li>
        <li><b>Permisos → NFC → Permitir</b>.</li><li>Recargá la página y tocá de nuevo “Activar lectura de stickers”.</li></ol>
        <small>También desde Chrome: ⋮ → Configuración → Configuración de sitios → NFC.</small>${detail}`;
    if (err?.name === 'NotReadableError' || err?.name === 'NotSupportedError') return `<b>El NFC del celular está apagado o no disponible.</b>
        Activalo en <b>Ajustes → Conexiones / Dispositivos conectados → NFC</b> y volvé a intentar.${detail}`;
    return `<b>Chrome no dejó usar el NFC.</b> Probá en este orden:
        <ol class="steps"><li>Revisá que el <b>NFC esté encendido</b> (Ajustes → NFC).</li>
        <li>Si abriste esta página escaneando el QR con la cámara o Google Lens, puede estar <b>dentro de otra app</b>: tocá ⋮ → <b>“Abrir en Chrome”</b> y probá ahí.</li>
        <li>Revisá el permiso: tocá el candado junto a la dirección → <b>Permisos → NFC → Permitir</b>.</li></ol>${detail}`;
}
async function showNfcProblem(err) {
    setScanUI('error');
    const el = document.getElementById('scanState');
    if (el) el.innerHTML = `${icon('alert-triangle', 16)} <span>${await nfcProblemHTML(err)}</span>`;
}

function setScanUI(state, err) {
    const el = document.getElementById('scanState'), btn = document.getElementById('scanBtn');
    if (!el || !btn) return;
    btn.hidden = state === 'on';
    btn.lastChild.textContent = state === 'error' ? ' Reintentar' : ' Activar lectura de stickers';
    el.className = 'scan-state ' + state;
    el.innerHTML = state === 'on'
        ? `${icon('radio', 16)} <span><b>Lectura activa:</b> acercá cualquier sticker y se lee acá (no se abre su link). Te muestra qué tiene y lo podés reescribir.</span>`
        : state === 'error'
        ? `${icon('alert-triangle', 16)} <span>No se pudo activar el NFC.</span>`
        : `${icon('nfc', 16)} <span>Activá la lectura para que, al acercar un sticker que ya tiene algo grabado, se lea acá en lugar de abrirse.</span>`;
}
document.addEventListener('visibilitychange', () => {
    if (document.hidden) { releaseNfc(); stopIdleScan(); Swal.close(); setScanUI('off'); }
    else if (idleWanted) startIdleScan();
});
window.addEventListener('pagehide', () => { releaseNfc(); stopIdleScan(); });

// Se acercó un sticker con la lectura activa: mostrar qué tiene y elegir a qué mesa grabarlo
async function onIdleTag(message) {
    stopIdleScan();
    const content = message ? describeMessage(message) : '(no se pudo leer: puede estar vacío o usar otro formato)';
    const other = tableOfUrl(content || '');
    const next = other || tables.find(t => !status[t.id]) || tables[0];
    const opts = tables.map(t => `<option value="${esc(t.id)}" ${t.id === next?.id ? 'selected' : ''}>${esc(t.label)}${status[t.id] ? ' (ya grabada)' : ''}</option>`).join('');
    const r = await sw({
        title: content ? 'Sticker con contenido' : 'Sticker vacío',
        html: (content ? `<p style="margin:0 0 4px">Tiene grabado:</p><span class="existing">${esc(content)}</span>` : '<p>No tiene nada grabado.</p>')
            + (other ? `<p>Es el link de <b>${esc(other.label)}</b>.</p>` : '')
            + `<label style="display:block;text-align:left;margin-top:10px">Grabarle el link de:
                 <select id="idleTable" class="swal2-select" style="display:block;width:100%;margin:6px 0 0">${opts}</select></label>`,
        showCancelButton: true, confirmButtonText: content ? 'Reescribir' : 'Grabar', cancelButtonText: 'Cancelar',
        preConfirm: () => document.getElementById('idleTable').value,
    });
    if (r.isConfirmed) {
        const t = tables.find(x => x.id === r.value);
        if (t) { await writeOne(t, { force: true }); return; }
    }
    if (idleWanted) startIdleScan();
}

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
        // Sin bloqueo permanente en este Chrome: solo queda la opción de clave (con NFC Tools)
        if (!canLock) document.querySelector('input[name="protect"][value="lock"]').closest('label').hidden = true;
        document.getElementById('writeAllBtn').addEventListener('click', writeAll);
        document.getElementById('scanBtn').addEventListener('click', startIdleScan);
        setScanUI('off');
        // Si Chrome ya tiene el permiso de NFC, la lectura se activa sola
        navigator.permissions?.query({ name: 'nfc' }).then(p => { if (p.state === 'granted') startIdleScan(); }).catch(() => {});
    } else if (isMobile) {
        document.getElementById('appMode').hidden = false;
        // Android sin Web NFC: casi siempre es otro navegador (Samsung Internet, Firefox...)
        if (!isIOS) document.getElementById('useChrome').hidden = false;
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
    // Abierta desde "Grabar NFC" de una mesa en el panel: se destaca esa mesa
    const focusId = new URLSearchParams(location.search).get('mesa');
    const row = focusId && document.querySelector(`[data-write="${CSS.escape(focusId)}"], [data-copy="${CSS.escape(focusId)}"]`)?.closest('.row');
    if (row) { row.classList.add('focus'); row.scrollIntoView({ block: 'center' }); }
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

// Qué tiene grabado un sticker (primer registro del mensaje NDEF), en texto legible
function describeMessage(message) {
    const rec = message?.records?.[0];
    if (!rec) return null;
    try {
        if (rec.recordType === 'url' || rec.recordType === 'absolute-url') return new TextDecoder().decode(rec.data);
        if (rec.recordType === 'text') return new TextDecoder(rec.encoding || 'utf-8').decode(rec.data);
        if (rec.recordType === 'empty') return null;
        return `(contenido de tipo «${rec.recordType}»)`;
    } catch { return '(contenido que no se puede leer)'; }
}
// Si el link es de una mesa de este restaurante, cuál
function tableOfUrl(url) {
    try {
        const u = new URL(url);
        return u.searchParams.get('r') === restaurantId ? tables.find(t => t.id === u.searchParams.get('mesa')) || null : null;
    } catch { return null; }
}

// Espera un sticker y graba. "stage" evita que al cambiar de aviso se cancele la operación.
function nfcPrompt(title, html, ctrl, cancelText, stage) {
    stage.waiting = true;
    sw({ title, html, showConfirmButton: false, showCancelButton: true, cancelButtonText: cancelText })
        .then(r => { if (r.isDismissed && stage.waiting) ctrl.abort(); });
}

// Graba un sticker sin pisar lo que tenga: si ya tiene contenido, lo muestra y pregunta si
// reescribirlo. Después, si se eligió, lo bloquea para siempre (en el mismo acercamiento).
// Devuelve true para seguir (grabado u omitido) y false si se canceló.
async function writeOne(t, { step, force } = {}) {
    const lock = canLock && document.querySelector('input[name="protect"]:checked')?.value === 'lock';
    const cancelText = step ? 'Terminar' : 'Cancelar';
    const head = `${step ? `${step} · ` : ''}${esc(t.label)}`;
    releaseNfc();
    const ctrl = new AbortController();
    activeNfc = ctrl;
    const stage = { waiting: false };
    const url = tableUrl(t.id);
    stopIdleScan();   // una sola operación de NFC a la vez
    try {
        const ndef = new NDEFReader();
        // Se lee lo que tiene el sticker al acercarlo (para poder mostrarlo si ya tiene algo)
        let lastRead = null;
        ndef.onreading = e => { lastRead = e.message; };
        try { await ndef.scan({ signal: ctrl.signal }); } catch (e) { if (e.name === 'AbortError') throw e; }

        nfcPrompt(head, `Acercá el sticker a la parte de atrás del celular${lock ? ' y <b>mantenelo apoyado</b> hasta que termine (se graba y se bloquea)' : ''}.`, ctrl, cancelText, stage);
        try {
            // force: el contenido ya se mostró (lectura en espera) y se eligió reescribirlo
            await ndef.write({ records: [{ recordType: 'url', data: url }] }, { signal: ctrl.signal, overwrite: !!force });
        } catch (err) {
            // overwrite:false rechaza con NotAllowedError si el sticker ya tiene contenido
            if (err.name !== 'NotAllowedError') throw err;
            await new Promise(r => setTimeout(r, 300));   // que llegue la lectura del sticker
            const content = describeMessage(lastRead);
            if (content === null && !lastRead) throw err;   // fue un permiso denegado, no contenido
            const other = tableOfUrl(content || '');
            const same  = content === url || other?.id === t.id;
            stage.waiting = false;
            const ans = await sw({
                icon: same ? 'info' : 'question',
                title: same ? `Este sticker ya es de ${esc(t.label)}` : 'Este sticker ya tiene algo grabado',
                html: `<span class="existing">${esc(content || '(vacío)')}</span>`
                    + (other && !same ? `<p>Es el link de <b>${esc(other.label)}</b>.</p>` : '')
                    + (same ? '<p>Ya tiene el link correcto. Podés dejarlo así.</p>' : `<p>¿Querés reescribirlo con el link de <b>${esc(t.label)}</b>?</p>`),
                showCancelButton: true,
                confirmButtonText: same ? 'Reescribir igual' : 'Reescribir',
                cancelButtonText: same ? 'Dejarlo así' : 'No, dejarlo',
            });
            if (!ans.isConfirmed) {
                if (same) { status[t.id] = 'written'; render(); }
                Swal.close();
                return same || !!step;   // en "grabar todas" se sigue con la próxima
            }
            nfcPrompt(head, 'Acercá el sticker otra vez para <b>reescribirlo</b>.', ctrl, cancelText, stage);
            try {
                await ndef.write({ records: [{ recordType: 'url', data: url }] }, { signal: ctrl.signal, overwrite: true });
            } catch (err2) {
                if (err2.name === 'AbortError') throw err2;
                // Un sticker bloqueado o con clave no deja escribir
                stage.waiting = false;
                const r2 = await sw({ icon: 'error', title: 'No se pudo reescribir',
                    html: `Este sticker está <b>bloqueado</b> o <b>protegido con clave</b>.<br><br>
                           <small>Si tiene clave, quitala con NFC Tools (<b>Otros → Quitar contraseña</b>) y volvé a intentar. Si está bloqueado para siempre, usá un sticker nuevo.</small>`,
                    showCancelButton: !!step, confirmButtonText: step ? 'Seguir con la próxima' : 'Entendido', cancelButtonText: 'Terminar' });
                return !!step && r2.isConfirmed;
            }
        }
        status[t.id] = 'written';
        if (lock) {
            await ndef.makeReadOnly({ signal: ctrl.signal });
            status[t.id] = 'locked';
        }
        stage.waiting = false;
        if (activeNfc === ctrl) releaseNfc();   // liberar ya, antes de mostrar el aviso
        render();
        if (!step) await sw({ icon: 'success', title: lock ? 'Grabada y bloqueada' : 'Grabada', timer: 1500, showConfirmButton: false });
        else Swal.close();
        return true;
    } catch (err) {
        stage.waiting = false;
        render();
        if (err.name === 'AbortError') return false;
        const permProblem = ['NotAllowedError', 'NotReadableError', 'NotSupportedError', 'SecurityError'].includes(err.name);
        const r = await sw({ icon: 'error', title: 'No se pudo grabar',
            ...(permProblem ? { html: `<div style="text-align:left">${await nfcProblemHTML(err)}</div>` }
                            : { text: `${err.message}. Probá apoyar el sticker en otra parte del celular.` }),
            showCancelButton: true, confirmButtonText: 'Reintentar', cancelButtonText: step ? 'Terminar' : 'Cerrar' });
        return r.isConfirmed ? writeOne(t, { step }) : false;
    } finally {
        // Liberar el NFC apenas termina (si no, el celular no lee otros stickers)
        if (activeNfc === ctrl) releaseNfc();
        // y volver a la lectura en espera (si estaba activa), salvo durante "grabar todas"
        if (idleWanted && !step) setTimeout(startIdleScan, 400);
    }
}

async function writeAll() {
    stopIdleScan();
    try { await writeAllSteps(); } finally { if (idleWanted) setTimeout(startIdleScan, 400); }
}
async function writeAllSteps() {
    const pending = tables.filter(t => !status[t.id]);
    const list = pending.length ? pending : tables;
    for (let i = 0; i < list.length; i++) {
        const goOn = await writeOne(list[i], { step: `${i + 1} de ${list.length}` });
        if (!goOn) return;
    }
    const done = list.filter(t => status[t.id]).length;
    sw({ icon: 'success', title: '¡Listo!', text: `${done} de ${list.length} ${isCatering ? 'stickers de clientes' : 'stickers de mesas'} quedaron grabados.` });
}
