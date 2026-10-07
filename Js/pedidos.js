// Js/pedidos.js — Pedidos desde la mesa (lado restaurante)
// Tablero en tiempo real (funciona como comandera de pantalla), impresión
// automática desde el navegador, mesas con QR/NFC y configuración.

const restaurantId     = new URLSearchParams(location.search).get('r');
const SUPERADMIN_EMAIL = 'frivasv2388@gmail.com';
const FUNCTIONS_BASE   = 'https://us-central1-maldito-cafe.cloudfunctions.net';
const PRINTER_FLAG_KEY = `printer_device_${restaurantId}`;

const STATUS_LABEL = {
    pendiente: 'Nuevo', en_cocina: 'En cocina', listo: 'Listo',
    entregado: 'Entregado', rechazado: 'Rechazado',
};

let restName   = '';
let orderingCfg = {};     // config/ordering (público)
let privateCfg  = {};     // private/ordering (clave impresora, webhook)
let orders      = [];
let knownIds    = null;   // ids ya vistos (para detectar pedidos nuevos)
let mesasState  = {};     // mesas/{id}: { open, openedAt, lastActivityAt }
let wifiInfo    = null;   // { ip, at } última vez que este dispositivo registró la red del local
const printing  = new Set();
const TABLE_SESSION_TTL = 6 * 3600 * 1000; // igual que en functions/index.js

// Catering / pedidos a distancia: las "mesas" son clientes con su link y no hay mesa abierta
const isCatering = () => orderingCfg.businessType === 'catering';
const sessionsOn = () => !isCatering() && orderingCfg.tableSessions !== false;
// Título de un pedido: la mesa, o "Pedido de Marcela" en catering
const orderTitle = o => o.kind === 'catering' ? `Pedido de ${o.mesaLabel}` : o.mesaLabel;
const tableIsOpen = id => {
    const m = mesasState[id];
    const last = m?.lastActivityAt?.toMillis?.() || m?.openedAt?.toMillis?.() || 0;
    return !!m?.open && Date.now() - last < TABLE_SESSION_TTL;
};

async function callFn(name, body) {
    const token = await auth.currentUser.getIdToken();
    const r = await fetch(`${FUNCTIONS_BASE}/${name}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || 'Error de conexión');
    return data;
}

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => '$' + Math.round(n || 0).toLocaleString('es-AR');
const restRef = () => db.collection('restaurants').doc(restaurantId);
const tableUrl = id => `${location.origin}/menu.html?r=${restaurantId}&mesa=${id}`;
const randomId = (n = 6) => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => 'abcdefghjkmnpqrstuvwxyz23456789'[b % 31]).join('');
const randomKey = () => Array.from(crypto.getRandomValues(new Uint8Array(20)), b => b.toString(16).padStart(2, '0')).join('');

function lsGet(key) { try { return localStorage.getItem(key); } catch { return null; } }
function lsSet(key, val) { try { localStorage.setItem(key, val); } catch { /* sin storage */ } }

function toastMsg(title, icon = 'success') {
    Swal.fire({ toast: true, position: 'top-end', icon, title, timer: 2200, showConfirmButton: false,
        background: getComputedStyle(document.body).getPropertyValue('--pd-surface'), color: getComputedStyle(document.body).getPropertyValue('--pd-text') });
}

// ── Auth y permisos ───────────────────────────────────────────

auth.onAuthStateChanged(async user => {
    if (!user) { window.location.href = './login.html'; return; }
    if (!restaurantId) { window.location.href = './dashboard.html'; return; }

    const restDoc = await restRef().get();
    const isSuperAdmin = user.email === SUPERADMIN_EMAIL;
    if (!restDoc.exists || (!isSuperAdmin && restDoc.data().ownerId !== user.uid)) {
        window.location.href = './dashboard.html'; return;
    }
    restName = restDoc.data().nombre || 'Mi Restaurante';
    document.getElementById('topbarRestName').textContent = restName;
    document.title = `Pedidos · ${restName}`;
    document.getElementById('editMenuLink').href = `./admin.html?r=${restaurantId}`;
    initThemeToggle('themeBtn');

    // Superadmin en un restaurante ajeno: solo con el código de soporte que le dio el dueño
    // (los pedidos tienen nombres de comensales; las reglas de Firestore también lo exigen)
    if (isSuperAdmin && restDoc.data().ownerId !== user.uid) {
        const grant = await SupportAccess.grant(restaurantId);
        if (!grant?.active) {
            document.querySelector('.pd-tabs').classList.add('pd-hidden');
            document.querySelectorAll('.pd-panel').forEach(p => p.classList.remove('active'));
            const msg = document.getElementById('lockedMsg');
            msg.querySelector('h2').textContent = 'Necesitás un código de soporte';
            msg.querySelector('p').innerHTML = 'Los pedidos y la configuración de este restaurante son privados. Pedile al cliente que genere un '
                + '<b>código de soporte</b> desde su panel (Contactar soporte → Dar acceso a soporte) y canjealo en el SuperAdmin.';
            msg.classList.remove('pd-hidden');
            return;
        }
        // Al vencer o si el dueño lo revoca, se vuelve a cargar (y queda bloqueado)
        setTimeout(() => location.reload(), Math.min(Math.max(grant.expiresAt - Date.now(), 0) + 1000, 2 ** 31 - 1));
        db.collection('supportGrants').doc(restaurantId).onSnapshot(d => { if (!d.exists || d.data().active !== true) location.reload(); }, () => location.reload());
    }

    // Beneficio del plan
    let allowed = isSuperAdmin;
    if (!isSuperAdmin) {
        const [uSnap, pSnap] = await Promise.all([
            db.collection('users').doc(user.uid).get(),
            db.collection('appConfig').doc('plans').get().catch(() => null),
        ]);
        const info = subscriptionInfo(uSnap.data()?.subscription, normalizePlans(pSnap?.exists ? pSnap.data() : {}));
        if (info.state === 'blocked') { window.location.href = './login.html?reason=blocked'; return; }
        if (info.state !== 'active' && info.state !== 'trial') { window.location.href = './checkout.html'; return; }
        allowed = !!hasBenefit(info.benefits, 'table_orders');   // en la prueba: todo incluido
    }
    if (!allowed) {
        document.querySelector('.pd-tabs').classList.add('pd-hidden');
        document.querySelectorAll('.pd-panel').forEach(p => p.classList.remove('active'));
        document.getElementById('lockedMsg').classList.remove('pd-hidden');
        return;
    }

    initTabs();
    initBoardControls();
    initTablesTab();
    initSettingsTab();

    restRef().collection('config').doc('ordering').onSnapshot(doc => {
        orderingCfg = doc.exists ? doc.data() : {};
        applyBizLabels(orderingCfg.businessType);
        renderChips();
        renderTables();
        renderTableStrip();
        fillSettings();
        processPrintQueue();
    });
    restRef().collection('mesas').onSnapshot(snap => {
        mesasState = Object.fromEntries(snap.docs.map(d => [d.id, d.data()]));
        renderTableStrip();
    });
    startWifiHeartbeat();
    restRef().collection('private').doc('ordering').get().then(doc => {
        privateCfg = doc.exists ? doc.data() : {};
        fillSettings();
    });
    listenOrders();
});

// ── Tabs ──────────────────────────────────────────────────────

function initTabs() {
    const tabs = document.querySelectorAll('.pd-tab');
    const show = name => {
        tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === name));
        document.querySelectorAll('.pd-panel').forEach(p => p.classList.toggle('active', p.id === `tab-${name}`));
        lsSet('pedidos_tab', name);
    };
    tabs.forEach(t => t.addEventListener('click', () => show(t.dataset.tab)));
    const saved = lsGet('pedidos_tab');
    if (saved && document.getElementById(`tab-${saved}`)) show(saved);
}

// ══════════════════════════════════════════════════════════════
//  TABLERO
// ══════════════════════════════════════════════════════════════

function initBoardControls() {
    const printerBox = document.getElementById('isPrinterDevice');
    printerBox.checked = lsGet(PRINTER_FLAG_KEY) === '1';
    printerBox.addEventListener('change', () => {
        lsSet(PRINTER_FLAG_KEY, printerBox.checked ? '1' : '0');
        renderChips();
        if (printerBox.checked) processPrintQueue();
    });
    const sound = document.getElementById('soundOn');
    sound.checked = lsGet('pedidos_sound') !== '0';
    sound.addEventListener('change', () => { lsSet('pedidos_sound', sound.checked ? '1' : '0'); renderSoundHint(); });
    document.getElementById('testSoundBtn').addEventListener('click', () => { unlockAudio(); setTimeout(beep, 50); });
    renderSoundHint();

    document.querySelector('.pd-board').addEventListener('click', onBoardClick);
    setInterval(() => { renderBoard(); renderTableStrip(); }, 30 * 1000); // refresca "hace X min"
}

function renderChips() {
    const st = document.getElementById('statusChip');
    st.className = `pd-chip ${orderingCfg.enabled ? 'on' : 'off'}`;
    st.innerHTML = orderingCfg.enabled ? `${licon('circle-dot', 13)} Recibiendo pedidos` : `${licon('circle-off', 13)} Pedidos apagados`;

    const mode = { browser: 'Impresora en esta PC/tablet', epson: 'Epson en la nube', star: 'Star CloudPRNT', none: 'Solo pantalla' }[orderingCfg.printMode || 'none'];
    document.getElementById('modeChip').innerHTML = `${licon('printer', 13)} ${mode} · ${orderingCfg.approvalMode === 'direct' ? 'directo a cocina' : 'con aprobación'}`;

    document.getElementById('printerChip').classList.toggle('pd-hidden', orderingCfg.printMode !== 'browser');
    document.getElementById('printerChip').classList.toggle('on', orderingCfg.printMode === 'browser' && isPrinterDevice());
}

const isPrinterDevice = () => lsGet(PRINTER_FLAG_KEY) === '1';

function listenOrders() {
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    restRef().collection('pedidos')
        .where('createdAt', '>=', firebase.firestore.Timestamp.fromDate(startOfDay))
        .orderBy('createdAt', 'asc')
        .onSnapshot(snap => {
            orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            const fresh = knownIds ? orders.filter(o => !knownIds.has(o.id)) : [];
            knownIds = new Set(orders.map(o => o.id));
            if (fresh.length) alertNewOrders(fresh);
            renderBoard(new Set(fresh.map(o => o.id)));
            renderTableStrip();
            processPrintQueue();
        }, err => {
            console.error('pedidos:', err);
            document.getElementById('col-pendiente').innerHTML = `<p class="pd-empty">Error al cargar pedidos: ${esc(err.message)}</p>`;
        });
}

const orderTime = o => (o.createdAt?.toDate?.() || new Date()).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

function minutesAgo(o) {
    const t = o.createdAt?.toDate?.();
    if (!t) return 'recién';
    const m = Math.floor((Date.now() - t.getTime()) / 60000);
    return m < 1 ? 'recién' : `hace ${m} min`;
}

function renderBoard(freshIds = new Set()) {
    const cols = { pendiente: [], en_cocina: [], listo: [] };
    const history = [];
    orders.forEach(o => (cols[o.status] || history).push(o));

    Object.entries(cols).forEach(([status, list]) => {
        document.getElementById(`cnt-${status}`).textContent = list.length;
        document.getElementById(`col-${status}`).innerHTML = list.length
            ? list.map(o => orderCard(o, freshIds.has(o.id))).join('')
            : `<p class="pd-empty">${{ pendiente: 'Sin pedidos nuevos', en_cocina: 'Nada en preparación', listo: 'Nada para entregar' }[status]}</p>`;
    });
    document.getElementById('pendingCount').textContent = cols.pendiente.length || '';

    const delivered = history.filter(o => o.status === 'entregado');
    document.getElementById('historySummary').textContent =
        `Entregados hoy: ${delivered.length} · ${money(delivered.reduce((s, o) => s + (o.total || 0), 0))}` +
        (history.length > delivered.length ? ` · Rechazados: ${history.length - delivered.length}` : '');
    const cat = orderingCfg.businessType === 'catering';
    document.getElementById('historyBody').innerHTML = history.length ? `
        <tr class="pd-history-head"><th>Hora</th><th>#</th><th>${cat ? 'Cliente' : 'Mesa'}</th><th>Pidió</th>
            <th>Productos</th><th>Estado</th><th style="text-align:right">Total</th></tr>`
        + history.slice().reverse().map(o => `
        <tr><td>${orderTime(o)}</td><td>#${o.number}</td><td>${esc(o.mesaLabel || '')}</td>
        <td>${o.customerName ? esc(o.customerName) : '<span class="pd-muted">Sin nombre</span>'}</td>
        <td>${(o.items || []).map(i => `${i.qty}× ${esc(i.nombre)}`).join(', ')}</td>
        <td>${STATUS_LABEL[o.status]}</td><td style="text-align:right">${money(o.total)}</td></tr>`).join('') : '';
}

function orderCard(o, isNew) {
    const actions = {
        pendiente: `<button class="pd-btn danger" data-act="reject" data-id="${o.id}">Rechazar</button>
                    <button class="pd-btn ok" data-act="accept" data-id="${o.id}">${licon('check', 14)} Aceptar y enviar a cocina</button>`,
        en_cocina: `<button class="pd-btn" data-act="reprint" data-id="${o.id}" title="Volver a imprimir">${licon('printer', 14)}</button>
                    <button class="pd-btn primary" data-act="ready" data-id="${o.id}">Listo</button>`,
        listo:     `<button class="pd-btn ok" data-act="deliver" data-id="${o.id}">Entregado</button>`,
    }[o.status] || '';
    const printTag = o.status === 'en_cocina' && orderingCfg.printMode && orderingCfg.printMode !== 'none'
        ? `<span class="pd-print-tag">${licon(o.printStatus === 'printed' ? 'check' : 'clock', 12)} ${o.printStatus === 'printed' ? 'Impreso' : 'Esperando impresora'}</span>` : '';
    return `
    <article class="pd-card${isNew ? ' is-new' : ''}">
        <div class="pd-card-head">
            <span class="pd-card-mesa">${esc(orderTitle(o))}</span>
            <span class="pd-card-num">#${o.number}</span>
        </div>
        <div class="pd-card-meta">${orderTime(o)} · ${minutesAgo(o)}${o.customerName ? ` · ${licon('user', 12)} <b>${esc(o.customerName)}</b>` : ''}</div>
        ${verificationBadges(o)}
        ${o.restrictions?.length ? `<div class="pd-restr">${o.restrictions.map(x =>
            `<span>${typeof restrictionIcon === 'function' ? restrictionIcon(x.id, 14) : ''} ${esc(x.label)}</span>`).join('')}</div>` : ''}
        <ul class="pd-items">${(o.items || []).map(i => `<li><b>${i.qty}×</b>${esc(i.nombre)}${i.nota ? `<small>${esc(i.nota)}</small>` : ''}</li>`).join('')}</ul>
        ${o.note ? `<div class="pd-note">${licon('message-square', 13)} ${esc(o.note)}</div>` : ''}
        <div class="pd-card-foot">
            <span class="pd-total">${money(o.total)} ${printTag}</span>
            <div class="pd-actions">${actions}</div>
        </div>
    </article>`;
}

// Cómo se verificó que el comensal estaba en el local
function verificationBadges(o) {
    const v = o.verification;
    if (!v) return '';
    const b = [];
    if (v.tableOpen) b.push(`<span class="pd-badge ok">${licon('check', 11)} Mesa abierta</span>`);
    if (v.wifi)      b.push(`<span class="pd-badge ok">${licon('wifi', 11)} Wi-Fi del local</span>`);
    if (v.gps)       b.push(`<span class="pd-badge ok">${licon('map-pin', 11)} GPS${o.distance != null ? ` · ${o.distance} m` : ''}</span>`);
    if (!b.length && o.status === 'pendiente' && o.kind !== 'catering') b.push(`<span class="pd-badge warn">${licon('alert-triangle', 11)} Sin verificar · confirmá que estén en la mesa</span>`);
    return b.length ? `<div class="pd-badges">${b.join('')}</div>` : '';
}

async function onBoardClick(e) {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const o = orders.find(x => x.id === btn.dataset.id);
    if (!o) return;
    const ref = restRef().collection('pedidos').doc(o.id);
    const now = firebase.firestore.FieldValue.serverTimestamp();
    btn.disabled = true;
    try {
        switch (btn.dataset.act) {
            case 'accept':
                await ref.update({ status: 'en_cocina', printStatus: 'queued', sentToKitchenAt: now, updatedAt: now });
                if (sessionsOn()) await setTableOpen(o.mesaId, true);
                break;
            case 'reject':  {
                const r = await Swal.fire({ title: `¿Rechazar el pedido #${o.number}?`, text: o.kind === 'catering' ? 'El cliente verá que su pedido no fue aceptado.' : 'El comensal verá "No aceptado — consultá al mozo".', showCancelButton: true, confirmButtonText: 'Rechazar', cancelButtonText: 'Volver', confirmButtonColor: '#c0392b' });
                if (r.isConfirmed) await ref.update({ status: 'rechazado', updatedAt: now });
                break;
            }
            case 'ready':   await ref.update({ status: 'listo', updatedAt: now }); break;
            case 'deliver': await ref.update({ status: 'entregado', updatedAt: now }); break;
            case 'reprint':
                if (orderingCfg.printMode === 'browser') printTicket(o);
                else await ref.update({ printStatus: 'queued', updatedAt: now });
                break;
        }
    } catch (err) {
        toastMsg('No se pudo actualizar: ' + err.message, 'error');
    }
    btn.disabled = false;
}

// ── Mesa abierta ──────────────────────────────────────────────

async function setTableOpen(mesaId, open) {
    const now = firebase.firestore.FieldValue.serverTimestamp();
    await restRef().collection('mesas').doc(mesaId).set(open
        ? (tableIsOpen(mesaId) ? { open: true, lastActivityAt: now } : { open: true, openedAt: now, lastActivityAt: now, openedBy: 'staff' })
        : { open: false, closedAt: now }, { merge: true });
}

// Pedidos (no rechazados) de la mesa desde que se abrió
function tableSessionOrders(mesaId) {
    const since = mesasState[mesaId]?.openedAt?.toMillis?.() || 0;
    return orders.filter(o => o.mesaId === mesaId && o.status !== 'rechazado' && (o.createdAt?.toMillis?.() || Date.now()) >= since);
}

function renderTableStrip() {
    const strip = document.getElementById('tableStrip');
    if (!strip) return;
    const tables = orderingCfg.tables || [];
    if (!sessionsOn() || !tables.length) { strip.innerHTML = ''; return; }
    strip.innerHTML = tables.map(t => {
        if (!tableIsOpen(t.id)) {
            return `<button class="pd-tchip" data-mesa="${t.id}" title="Abrir la mesa: sus pedidos van directo a cocina"><b>${esc(t.label)}</b><small>Cerrada</small></button>`;
        }
        const list  = tableSessionOrders(t.id);
        const total = list.reduce((s, o) => s + (o.total || 0), 0);
        return `<button class="pd-tchip open" data-mesa="${t.id}" title="Cerrar la mesa (cobrada)"><b>${esc(t.label)}</b><small>Abierta · ${list.length} ped. · ${money(total)}</small></button>`;
    }).join('');
}

async function onTableStripClick(e) {
    const chip = e.target.closest('[data-mesa]');
    if (!chip) return;
    const id = chip.dataset.mesa;
    const t  = (orderingCfg.tables || []).find(x => x.id === id);
    if (!t) return;
    if (!tableIsOpen(id)) {
        await setTableOpen(id, true);
        toastMsg(`${t.label} abierta`);
        return;
    }
    const list  = tableSessionOrders(id);
    const total = list.reduce((s, o) => s + (o.total || 0), 0);
    const r = await Swal.fire({
        title: `¿Cerrar ${esc(t.label)}?`,
        html: `${list.length} pedido${list.length === 1 ? '' : 's'} · <b>${money(total)}</b><br><small>Después de cerrarla, los pedidos nuevos de esta mesa los tiene que aceptar el mozo.</small>`,
        showCancelButton: true, confirmButtonText: 'Cerrar mesa (cobrada)', cancelButtonText: 'Volver',
    });
    if (r.isConfirmed) {
        await setTableOpen(id, false);
        toastMsg(`${t.label} cerrada`);
    }
}

// ── Wi-Fi del local ───────────────────────────────────────────
// Mientras esta pantalla está abierta, cada 5 min le avisa al servidor
// desde qué red está: esa es la red del local.

function startWifiHeartbeat() {
    document.getElementById('tableStrip').addEventListener('click', onTableStripClick);
    const beat = async () => {
        try {
            const r = await callFn('registerDevice', { r: restaurantId });
            if (r.ok) wifiInfo = { ip: r.ip, at: Date.now() };
        } catch (e) { console.warn('registerDevice:', e.message); }
        renderWifiStatus();
    };
    beat();
    setInterval(beat, 5 * 60 * 1000);
}

function renderWifiStatus() {
    const el = document.getElementById('wifiStatus');
    if (!el) return;
    el.innerHTML = wifiInfo
        ? `${licon('wifi', 14)} Red del local registrada desde este dispositivo (IP ${esc(wifiInfo.ip)}, ${new Date(wifiInfo.at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}). Se actualiza sola cada 5 minutos.`
        : `${licon('wifi-off', 14)} Todavía no se pudo registrar la red de este dispositivo.`;
}

// ── Alertas de pedido nuevo ───────────────────────────────────

// Los navegadores solo permiten audio después de que la persona interactúa con la
// página: si el AudioContext se crea antes, queda "suspended" y no suena (sin error).
// Por eso se crea/reanuda con el primer toque o tecla, y se avisa mientras esté bloqueado.
let audioCtx = null;

function unlockAudio() {
    try {
        audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume().then(renderSoundHint, () => {});
    } catch { /* sin soporte de audio */ }
    renderSoundHint();
}

const audioReady = () => audioCtx?.state === 'running';

function renderSoundHint() {
    const hint = document.getElementById('soundHint');
    if (!hint) return;
    hint.classList.toggle('pd-hidden', audioReady() || lsGet('pedidos_sound') === '0');
}

function beep() {
    if (lsGet('pedidos_sound') === '0' || !audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    // 3 tonos ascendentes, fuerte y corto, para escucharse en una cocina
    [[0, 784], [0.18, 988], [0.36, 1319]].forEach(([offset, freq]) => {
        const t = audioCtx.currentTime + offset;
        const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
        osc.type = 'triangle'; osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.6, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
        osc.connect(gain).connect(audioCtx.destination);
        osc.start(t); osc.stop(t + 0.32);
    });
}

['pointerdown', 'keydown', 'touchstart'].forEach(ev =>
    document.addEventListener(ev, unlockAudio, { passive: true }));

function alertNewOrders(fresh) {
    beep();
    const base = document.title.replace(/^\(\d+\) /, '');
    document.title = `(${fresh.length}) ${base}`;
    setTimeout(() => { document.title = base; }, 8000);
}

// ── Impresión desde el navegador ──────────────────────────────
// Solo imprime el dispositivo marcado como "impresora". Una transacción
// reclama cada pedido (queued → printing) para que no se imprima dos veces.

async function processPrintQueue() {
    if (orderingCfg.printMode !== 'browser' || !isPrinterDevice()) return;
    const queued = orders.filter(o => o.status === 'en_cocina' && o.printStatus === 'queued' && !printing.has(o.id));
    for (const o of queued) {
        printing.add(o.id);
        const ref = restRef().collection('pedidos').doc(o.id);
        try {
            const claimed = await db.runTransaction(async tx => {
                const snap = await tx.get(ref);
                if (snap.data()?.printStatus !== 'queued') return false;
                tx.update(ref, { printStatus: 'printing' });
                return true;
            });
            if (!claimed) continue;
            await printTicket(o);
            await ref.update({ printStatus: 'printed', printedAt: firebase.firestore.FieldValue.serverTimestamp() });
        } catch (err) {
            console.error('Impresión:', err);
            await ref.update({ printStatus: 'queued' }).catch(() => {});
        } finally {
            printing.delete(o.id);
        }
    }
}

function ticketHTML(o) {
    const w = orderingCfg.paperWidth === 58 ? 58 : 80;
    const time = (o.createdAt?.toDate?.() || new Date()).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    return `<!doctype html><html><head><meta charset="utf-8"><style>
        @page { size: ${w}mm auto; margin: 0; }
        body { width: ${w - 6}mm; margin: 0 3mm; font: ${w === 58 ? 12 : 14}px/1.35 'Courier New', monospace; color: #000; }
        h1 { font-size: 2em; margin: 2mm 0 0; } h2 { font-size: 1.5em; margin: 0 0 1mm; }
        .meta { font-size: .9em; } hr { border: 0; border-top: 1px dashed #000; margin: 2mm 0; }
        .it { font-size: 1.15em; font-weight: bold; margin: 1mm 0; } .nt { margin: 0 0 1mm 4mm; font-style: italic; }
        .note { border: 1px solid #000; padding: 1mm 2mm; margin-top: 2mm; }
        .restr { background: #000; color: #fff; font-weight: bold; font-size: 1.2em; text-align: center; padding: 1.5mm; margin-bottom: 2mm; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .end { height: 12mm; }
    </style></head><body>
        <h1>${esc(orderTitle(o))}</h1>
        <h2>Pedido #${o.number}</h2>
        <div class="meta">${time}${o.customerName ? ' · ' + esc(o.customerName) : ''}<br>${esc(restName)}</div>
        <hr>
        ${o.restrictions?.length ? `<div class="restr">${o.restrictions.map(x => esc(x.label).toUpperCase()).join('<br>')}</div>` : ''}
        ${(o.items || []).map(i => `<div class="it">${i.qty} x ${esc(i.nombre)}</div>${i.nota ? `<div class="nt">&gt; ${esc(i.nota)}</div>` : ''}`).join('')}
        ${o.note ? `<div class="note">NOTA: ${esc(o.note)}</div>` : ''}
        <hr><div class="end"></div>
    </body></html>`;
}

function printTicket(o) {
    return new Promise(resolve => {
        const frame = document.getElementById('printFrame');
        frame.onload = () => {
            setTimeout(() => {
                try { frame.contentWindow.focus(); frame.contentWindow.print(); } catch (e) { console.error(e); }
                resolve();
            }, 150);
        };
        frame.srcdoc = ticketHTML(o);
    });
}

// ══════════════════════════════════════════════════════════════
//  MESAS, QR Y NFC
// ══════════════════════════════════════════════════════════════

function initTablesTab() {
    document.getElementById('addTableBtn').addEventListener('click', () => addTables(1));
    document.getElementById('addManyBtn').addEventListener('click', async () => {
        const { value } = await Swal.fire({ title: isCatering() ? '¿Cuántos clientes agregar?' : '¿Cuántas mesas agregar?', input: 'number', inputValue: 10,
            inputAttributes: { min: 1, max: 100 }, showCancelButton: true, confirmButtonText: 'Agregar', cancelButtonText: 'Cancelar' });
        const n = parseInt(value);
        if (n > 0) addTables(Math.min(n, 100));
    });
    document.getElementById('printStickersBtn').addEventListener('click', () => printStickers(orderingCfg.tables || []));
    document.getElementById('tablesGrid').addEventListener('click', onTableClick);
    document.getElementById('tablesGrid').addEventListener('change', onTableRename);
    // Enter confirma el nombre (dispara el guardado al salir del campo)
    document.getElementById('tablesGrid').addEventListener('keydown', e => {
        if (e.key === 'Enter' && e.target.matches('.pd-table input')) { e.preventDefault(); e.target.blur(); }
    });

    // Grabar los stickers desde el celular: QR hacia nfc.html (no requiere iniciar sesión en el teléfono)
    const nfcPageUrl = `${location.origin}/nfc.html?r=${restaurantId}`;
    const onPhone = /Android|iPhone|iPad|iPod|Mobi/i.test(navigator.userAgent);
    document.body.classList.toggle('is-mobile', onPhone);
    document.getElementById('nfcPhoneQr').innerHTML = qrSvg(nfcPageUrl);
    document.getElementById('nfcPhoneLink').href = nfcPageUrl;
    document.querySelector('#nfcPhoneLink span').textContent = onPhone ? 'Abrir la página para grabar' : 'Abrir en este dispositivo';

    document.getElementById('nfcHelp').innerHTML = 'NDEFReader' in window
        ? `${licon('nfc', 13)} Este dispositivo puede grabar stickers NFC: tocá "Grabar NFC" en una mesa. Si el sticker ya tiene algo grabado, te lo muestra y te pregunta antes de reescribirlo.`
        : `${licon('info', 13)} Para grabar los stickers usá el código QR de arriba con tu celular. Los iPhone y Android leen el sticker sin instalar nada.`;
}

async function saveTables(tables) {
    await restRef().collection('config').doc('ordering').set({ tables }, { merge: true });
}

async function addTables(n) {
    const tables = [...(orderingCfg.tables || [])];
    const nums = tables.map(t => parseInt((t.label.match(/\d+/) || [0])[0])).filter(Boolean);
    let next = (nums.length ? Math.max(...nums) : 0) + 1;
    const base = isCatering() ? 'Cliente' : 'Mesa';
    for (let i = 0; i < n; i++) tables.push({ id: randomId(), label: `${base} ${next++}` });
    await saveTables(tables);
}

function qrSvg(text) {
    const qr = qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    return qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
}

function renderTables() {
    const grid = document.getElementById('tablesGrid');
    if (!grid) return;
    const tables = orderingCfg.tables || [];
    if (!tables.length) {
        grid.innerHTML = `<p class="pd-empty">${isCatering() ? 'Todavía no hay clientes. Agregá el primero.' : 'Todavía no hay mesas. Agregá la primera.'}</p>`;
        return;
    }
    const canNfc = 'NDEFReader' in window;
    const tip = isCatering()
        ? 'Tocá el nombre de un cliente para cambiarlo (por ejemplo: «Marcela» o «Oficina Centro»). Los pedidos llegan como «Pedido de Marcela».'
        : 'Tocá el nombre de una mesa para cambiarlo (por ejemplo: «Terraza 2» o «Barra»).';
    grid.innerHTML = `<p class="pd-tname-tip">${licon('pencil', 13)} ${tip}</p>` + tables.map(t => `
        <div class="pd-table" data-id="${t.id}">
            <label class="pd-tname" title="Tocá para cambiar el nombre de la mesa">
                <input class="pd-input" value="${esc(t.label)}" maxlength="30" aria-label="Nombre (editable)">
                <span class="pd-tname-icon" aria-hidden="true">${licon('pencil', 13)}</span>
            </label>
            <div class="pd-qr">${qrSvg(tableUrl(t.id))}</div>
            <div class="pd-actions">
                <button class="pd-btn" data-act="copy" title="Copiar link">${licon('link-2', 14)} Link</button>
                ${canNfc ? `<button class="pd-btn" data-act="nfc">${licon('nfc', 14)} Grabar NFC</button>` : ''}
                <button class="pd-btn" data-act="print" title="Imprimir sticker">${licon('printer', 14)}</button>
                <a class="pd-btn" href="${tableUrl(t.id)}" target="_blank" rel="noopener" title="Probar">${licon('external-link', 14)}</a>
                <button class="pd-btn danger" data-act="delete" title="Eliminar">${licon('trash-2', 14)}</button>
            </div>
        </div>`).join('');
}

async function onTableClick(e) {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const id = btn.closest('.pd-table').dataset.id;
    const table = (orderingCfg.tables || []).find(t => t.id === id);
    if (!table) return;
    const url = tableUrl(id);

    switch (btn.dataset.act) {
        case 'copy':
            await navigator.clipboard.writeText(url);
            toastMsg('Link copiado');
            break;
        case 'print':
            printStickers([table]);
            break;
        case 'delete': {
            const r = await Swal.fire({ title: `¿Eliminar ${table.label}?`, text: isCatering() ? 'Su link y su QR dejan de funcionar para pedir.' : 'Su QR y sticker NFC dejan de funcionar para pedir.', showCancelButton: true, confirmButtonText: 'Eliminar', cancelButtonText: 'Cancelar', confirmButtonColor: '#c0392b' });
            if (r.isConfirmed) await saveTables((orderingCfg.tables || []).filter(t => t.id !== id));
            break;
        }
        case 'nfc':
            // La grabación (con aviso si el sticker ya tiene algo, y protección) está en nfc.html
            window.open(`${location.origin}/nfc.html?r=${restaurantId}&mesa=${encodeURIComponent(id)}`, '_blank', 'noopener');
            break;
    }
}

async function onTableRename(e) {
    if (!e.target.matches('.pd-table input')) return;
    const id = e.target.closest('.pd-table').dataset.id;
    const label = e.target.value.trim() || 'Mesa';
    await saveTables((orderingCfg.tables || []).map(t => t.id === id ? { ...t, label } : t));
    toastMsg('Nombre guardado');
}

function printStickers(tables) {
    if (!tables.length) { toastMsg(isCatering() ? 'No hay clientes para imprimir' : 'No hay mesas para imprimir', 'info'); return; }
    const w = window.open('', '_blank');
    if (!w) { toastMsg('Permití las ventanas emergentes para imprimir', 'warning'); return; }
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Stickers · ${esc(restName)}</title><style>
        @page { size: A4; margin: 10mm; }
        body { margin: 0; font-family: system-ui, sans-serif; }
        .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6mm; }
        .st { border: 1px dashed #bbb; border-radius: 4mm; padding: 5mm; text-align: center; break-inside: avoid; }
        .st svg { width: 42mm; height: 42mm; }
        .mesa { font-size: 20pt; font-weight: 800; margin: 2mm 0 1mm; }
        .hint { font-size: 9pt; color: #444; line-height: 1.35; }
        .rest { font-size: 8pt; color: #888; margin-top: 2mm; letter-spacing: .5px; text-transform: uppercase; }
    </style></head><body><div class="grid">
        ${tables.map(t => `<div class="st">${qrSvg(tableUrl(t.id))}
            <div class="mesa">${esc(t.label)}</div>
            <div class="hint">${isCatering() ? 'Escaneá el QR<br>para hacer tu pedido' : 'Escaneá el QR o acercá tu celular<br>para ver el menú y pedir'}</div>
            <div class="rest">${esc(restName)}</div></div>`).join('')}
    </div><script>window.onload = () => setTimeout(() => window.print(), 300);<\/script></body></html>`);
    w.document.close();
}

// ══════════════════════════════════════════════════════════════
//  CONFIGURACIÓN
// ══════════════════════════════════════════════════════════════

let settingsDirty = false;

// Textos según el tipo de negocio (restaurante: mesas · catering: clientes)
function applyBizLabels(type) {
    const cat = type === 'catering';
    document.body.classList.toggle('is-catering', cat);
    const set = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
    set('tablesTabLabel', cat ? 'Clientes, QR y links' : 'Mesas, QR y NFC');
    set('tablesTitle',    cat ? 'Clientes' : 'Mesas');
    set('tablesIntro',    cat
        ? 'Cada cliente tiene un link único y su QR. Mandale el link por WhatsApp o imprimí su QR: al abrirlo ve tu menú y te hace el pedido, que llega como «Pedido de» y su nombre.'
        : 'Cada mesa tiene un link único. Imprimí el QR como sticker y grabá el mismo link en un sticker NFC (NTAG213 o NTAG215). El comensal escanea o acerca el celular y se abre el menú con esa mesa ya identificada.');
    set('addTableLabel',  cat ? 'Agregar cliente' : 'Agregar mesa');
    set('enabledTitle',   cat ? 'Recibir pedidos' : 'Pedidos desde la mesa');
    set('apManualTitle',  cat ? 'Lo confirmás vos' : 'Lo acepta el mozo o la caja');
    set('apManualText',   cat
        ? 'El pedido aparece en "Nuevos" y pasa a preparación (e imprime) recién cuando lo aceptás.'
        : 'El pedido aparece en "Nuevos" y pasa a cocina (e imprime) recién cuando alguien lo acepta. Con "Mesa abierta" activado, solo hay que aceptar el primero de cada mesa.');
    set('apDirectTitle',  cat ? 'Va directo a preparación' : 'Va directo a cocina si se verificó que el comensal está en el local');
    set('apDirectText',   cat
        ? 'Todos los pedidos pasan directo a cocina e imprimen, sin que tengas que aceptarlos.'
        : 'Mesa abierta, Wi-Fi del local o GPS. Si no se pudo verificar, queda en "Nuevos" para que lo acepte el mozo.');
}

// datetime-local ⇄ Date (hora del dispositivo)
const toLocalInput = d => {
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const fmtWhen = ms => {   // "miércoles 7 de octubre a las 00:00 h" (igual que en el menú y el servidor)
    const p = Object.fromEntries(new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires',
        weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
        .formatToParts(new Date(ms)).map(x => [x.type, x.value]));
    return `${p.weekday} ${p.day} de ${p.month} a las ${p.hour}:${p.minute} h`;
};

// Estado actual del límite y la pausa (lo que ve el cliente en el menú)
function renderCapacityStatus() {
    const el = document.getElementById('capacityStatus');
    if (!el) return;
    const now = Date.now();
    const pause = orderingCfg.pause?.until?.toMillis?.() || 0;
    const full  = orderingCfg.capacityFullUntil?.toMillis?.() || 0;
    if (pause > now) {
        el.className = 'pd-status-line warn';
        el.innerHTML = `${licon('pause-circle', 14)} Pedidos pausados hasta el ${esc(fmtWhen(pause))}.`;
    } else if (orderingCfg.limits?.enabled && full > now) {
        el.className = 'pd-status-line warn';
        el.innerHTML = `${licon('alert-triangle', 14)} Se llegó al límite: se vuelven a recibir pedidos el ${esc(fmtWhen(full))}.
            <button class="pd-btn" type="button" id="reopenNowBtn">Recibir pedidos ya</button>`;
        document.getElementById('reopenNowBtn').addEventListener('click', async () => {
            await restRef().collection('config').doc('ordering').set({ capacityFullUntil: firebase.firestore.FieldValue.delete() }, { merge: true });
            toastMsg('El menú vuelve a aceptar pedidos');
        });
    } else {
        el.className = 'pd-status-line';
        el.innerHTML = orderingCfg.limits?.enabled ? `${licon('check', 14)} Recibiendo pedidos.` : '';
    }
}

function initSettingsTab() {
    const panel = document.getElementById('tab-settings');
    panel.addEventListener('input', () => { settingsDirty = true; updateSettingsVisibility(); });
    panel.addEventListener('change', () => { settingsDirty = true; updateSettingsVisibility(); });

    document.getElementById('cfgRadius').addEventListener('input', e => {
        document.getElementById('radiusVal').textContent = `${e.target.value} m`;
    });
    document.getElementById('useMyLocation').addEventListener('click', () => {
        if (!navigator.geolocation) { toastMsg('Este navegador no permite obtener la ubicación', 'error'); return; }
        navigator.geolocation.getCurrentPosition(pos => {
            document.getElementById('cfgLat').value = pos.coords.latitude.toFixed(6);
            document.getElementById('cfgLng').value = pos.coords.longitude.toFixed(6);
            settingsDirty = true;
            updateSettingsVisibility();
            toastMsg(`Ubicación tomada (precisión ±${Math.round(pos.coords.accuracy)} m)`);
        }, err => toastMsg(err.code === 1 ? 'Permiso de ubicación denegado' : 'No se pudo obtener la ubicación', 'error'),
        { enableHighAccuracy: true, timeout: 15000 });
    });
    document.getElementById('testPrintBtn').addEventListener('click', () => printTicket({
        number: 0, mesaLabel: 'Mesa de prueba', customerName: 'Prueba',
        items: [{ qty: 2, nombre: 'Café con leche', nota: 'uno sin azúcar' }, { qty: 1, nombre: 'Medialunas x3' }],
        note: 'Ticket de prueba de Cubierto',
        restrictions: [{ id: 'sin_tacc', label: 'Sin TACC' }],
    }));
    document.getElementById('copyCloudUrl').addEventListener('click', async () => {
        await navigator.clipboard.writeText(document.getElementById('cloudUrl').textContent);
        toastMsg('URL copiada');
    });
    document.getElementById('regenKeyBtn').addEventListener('click', async () => {
        const r = await Swal.fire({ title: '¿Regenerar la clave?', text: 'La impresora va a dejar de recibir pedidos hasta que cargues la URL nueva.', showCancelButton: true, confirmButtonText: 'Regenerar', cancelButtonText: 'Cancelar' });
        if (!r.isConfirmed) return;
        privateCfg.printerKey = randomKey();
        await restRef().collection('private').doc('ordering').set({ printerKey: privateCfg.printerKey }, { merge: true });
        updateSettingsVisibility();
        toastMsg('Clave regenerada');
    });
    document.getElementById('saveCfgBtn').addEventListener('click', saveSettings);
    document.querySelectorAll('.url-here').forEach(el => { el.textContent = location.href.split('#')[0]; });
}

function fillSettings() {
    renderCapacityStatus();
    if (settingsDirty) return; // no pisar lo que el usuario está editando
    const c = orderingCfg;
    document.querySelector(`input[name="bizType"][value="${c.businessType === 'catering' ? 'catering' : 'restaurant'}"]`).checked = true;
    const lim = c.limits || {};
    document.getElementById('cfgLimitOn').checked = !!lim.enabled;
    document.getElementById('cfgLimitMax').value = lim.max || '';
    document.getElementById('cfgLimitPeriod').value = ['day', 'week', 'hours'].includes(lim.period) ? lim.period : 'day';
    document.getElementById('cfgLimitHours').value = lim.hours || 2;
    document.getElementById('cfgLimitMsg').value = lim.message || '';
    const pauseUntil = c.pause?.until?.toDate?.();
    document.getElementById('cfgPauseOn').checked = !!(pauseUntil && pauseUntil > new Date());
    document.getElementById('cfgPauseUntil').value = pauseUntil ? toLocalInput(pauseUntil) : '';
    document.getElementById('cfgPauseMsg').value = c.pause?.message || '';
    document.getElementById('cfgEnabled').checked = !!c.enabled;
    document.querySelector(`input[name="approval"][value="${c.approvalMode === 'direct' ? 'direct' : 'manual'}"]`).checked = true;
    document.getElementById('cfgSessions').checked = c.tableSessions !== false;
    document.getElementById('cfgWifi').checked = c.wifiCheck !== false;
    document.getElementById('cfgGeo').checked = !!c.geo?.enabled;
    document.getElementById('cfgLat').value = c.geo?.lat ?? '';
    document.getElementById('cfgLng').value = c.geo?.lng ?? '';
    document.getElementById('cfgRadius').value = c.geo?.radius || 150;
    document.getElementById('radiusVal').textContent = `${c.geo?.radius || 150} m`;
    document.querySelector(`input[name="printMode"][value="${c.printMode || 'browser'}"]`).checked = true;
    document.getElementById('cfgPaper').value = String(c.paperWidth || 80);
    document.getElementById('cfgWebhook').value = privateCfg.webhookUrl || '';
    document.getElementById('webhookSecret').textContent = privateCfg.webhookSecret || 'se genera al guardar';
    updateSettingsVisibility();
}

function updateSettingsVisibility() {
    const mode = document.querySelector('input[name="printMode"]:checked')?.value;
    document.getElementById('pm-browser').classList.toggle('pd-hidden', mode !== 'browser');
    document.getElementById('pm-cloud').classList.toggle('pd-hidden', mode !== 'epson' && mode !== 'star');
    document.getElementById('geoFields').style.opacity = document.getElementById('cfgGeo').checked ? '1' : '.45';
    document.getElementById('wifiStatus').style.opacity = document.getElementById('cfgWifi').checked ? '1' : '.45';
    // Tipo de negocio (vista previa de los textos antes de guardar), límite y pausa
    applyBizLabels(document.querySelector('input[name="bizType"]:checked')?.value);
    const limOn = document.getElementById('cfgLimitOn').checked;
    document.getElementById('limitFields').style.opacity = limOn ? '1' : '.45';
    document.getElementById('limitFields').querySelectorAll('input, select, textarea').forEach(i => { i.disabled = !limOn; });
    document.getElementById('limitHoursField').style.display = document.getElementById('cfgLimitPeriod').value === 'hours' ? '' : 'none';
    const pauseOn = document.getElementById('cfgPauseOn').checked;
    document.getElementById('pauseFields').style.display = pauseOn ? '' : 'none';

    const lat = document.getElementById('cfgLat').value, lng = document.getElementById('cfgLng').value;
    const map = document.getElementById('mapLink');
    if (lat && lng) map.href = `https://www.google.com/maps?q=${encodeURIComponent(lat)},${encodeURIComponent(lng)}`;
    else map.removeAttribute('href');

    if (mode === 'epson' || mode === 'star') {
        document.getElementById('cloudUrl').textContent = privateCfg.printerKey
            ? `${location.origin}/api/printerPoll?r=${restaurantId}&k=${privateCfg.printerKey}&t=${mode}`
            : 'Guardá la configuración para generar la URL';
        document.getElementById('cloudMenuName').textContent = mode === 'epson'
            ? 'Configuración de Server Direct Print' : 'CloudPRNT';
        document.getElementById('cloudSteps').innerHTML = mode === 'epson'
            ? `<ol><li>Entrá a la IP de la impresora desde un navegador (EpsonNet Config).</li><li>Server Direct Print → Activar → pegá la URL en "URL" (Server 1) e intervalo 5 segundos.</li><li>Guardá y reiniciá la impresora. Hacé un pedido de prueba.</li></ol>`
            : `<ol><li>Entrá a la IP de la impresora desde un navegador (o la app Star Quick Setup Utility).</li><li>CloudPRNT → Enable → pegá la URL en "Server URL" e intervalo 5 segundos.</li><li>Guardá y reiniciá la impresora. Hacé un pedido de prueba.</li></ol>`;
    }
}

async function saveSettings() {
    const btn = document.getElementById('saveCfgBtn');
    const msg = document.getElementById('saveMsg');
    const geoOn = document.getElementById('cfgGeo').checked;
    const lat = parseFloat(document.getElementById('cfgLat').value.replace(',', '.'));
    const lng = parseFloat(document.getElementById('cfgLng').value.replace(',', '.'));
    if (geoOn && (!isFinite(lat) || !isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180)) {
        toastMsg('Cargá la latitud y longitud del local (o usá "Usar mi ubicación actual")', 'warning');
        return;
    }
    const webhookUrl = document.getElementById('cfgWebhook').value.trim();
    if (webhookUrl && !/^https:\/\/\S+$/.test(webhookUrl)) {
        toastMsg('El webhook tiene que empezar con https://', 'warning');
        return;
    }
    const printMode = document.querySelector('input[name="printMode"]:checked').value;

    // Límite de pedidos y pausa
    const limitOn = document.getElementById('cfgLimitOn').checked;
    const limits = {
        enabled: limitOn,
        max:     parseInt(document.getElementById('cfgLimitMax').value) || 0,
        period:  document.getElementById('cfgLimitPeriod').value,
        hours:   Math.min(Math.max(parseInt(document.getElementById('cfgLimitHours').value) || 1, 1), 720),
        message: document.getElementById('cfgLimitMsg').value.trim(),
    };
    if (limitOn && limits.max < 1) { toastMsg('Indicá el máximo de pedidos (1 o más)', 'warning'); return; }
    const pauseOn = document.getElementById('cfgPauseOn').checked;
    const pauseDate = pauseOn ? new Date(document.getElementById('cfgPauseUntil').value) : null;
    if (pauseOn && (!pauseDate || isNaN(pauseDate) || pauseDate <= new Date())) {
        toastMsg('Elegí una fecha y hora futura para pausar los pedidos', 'warning'); return;
    }
    const pause = {
        until:   pauseOn ? firebase.firestore.Timestamp.fromDate(pauseDate) : null,
        message: document.getElementById('cfgPauseMsg').value.trim(),
    };
    // Si cambió el límite, el aviso de "lleno" se recalcula con el próximo pedido
    const normLimits = l => JSON.stringify([!!l?.enabled, l?.max || 0, l?.period || 'day', l?.hours || 1]);
    const limitsChanged = normLimits(orderingCfg.limits) !== normLimits(limits);

    btn.disabled = true;
    try {
        const priv = { ...privateCfg, webhookUrl };
        if (!priv.printerKey) priv.printerKey = randomKey();
        if (!priv.webhookSecret) priv.webhookSecret = randomKey();
        await Promise.all([
            restRef().collection('config').doc('ordering').set({
                businessType: document.querySelector('input[name="bizType"]:checked').value,
                limits,
                pause,
                ...(limitsChanged && { capacityFullUntil: firebase.firestore.FieldValue.delete() }),
                enabled:      document.getElementById('cfgEnabled').checked,
                approvalMode: document.querySelector('input[name="approval"]:checked').value,
                tableSessions: document.getElementById('cfgSessions').checked,
                wifiCheck:     document.getElementById('cfgWifi').checked,
                geo: {
                    enabled: geoOn,
                    lat: isFinite(lat) ? lat : null,
                    lng: isFinite(lng) ? lng : null,
                    radius: parseInt(document.getElementById('cfgRadius').value) || 150,
                },
                printMode,
                paperWidth: parseInt(document.getElementById('cfgPaper').value) || 80,
            }, { merge: true }),
            restRef().collection('private').doc('ordering').set({
                printerKey: priv.printerKey, webhookUrl: priv.webhookUrl, webhookSecret: priv.webhookSecret,
            }, { merge: true }),
        ]);
        privateCfg = priv;
        settingsDirty = false;
        fillSettings();
        msg.textContent = 'Guardado ✓';
        setTimeout(() => { msg.textContent = ''; }, 2500);
    } catch (err) {
        toastMsg('No se pudo guardar: ' + err.message, 'error');
    }
    btn.disabled = false;
}
