// table-ordering.js — pedidos desde la mesa (lado comensal)
// Se activa solo si la URL trae ?r={restaurante}&mesa={idMesa} (QR o sticker NFC)
// y el restaurante tiene los pedidos habilitados en config/ordering.

(function () {
    const params       = new URLSearchParams(location.search);
    const restaurantId = params.get('r');
    const mesaId       = params.get('mesa');
    if (!restaurantId || !mesaId) return;

    const FUNCTIONS_BASE = 'https://us-central1-maldito-cafe.cloudfunctions.net';
    const CART_KEY   = `cart_${restaurantId}_${mesaId}`;
    const ORDERS_KEY = `orders_${restaurantId}`;

    const STATUS = {
        pendiente: { label: 'Esperando confirmación', cls: 'st-wait' },
        en_cocina: { label: 'En preparación',         cls: 'st-cook' },
        listo:     { label: '¡Listo! Ya sale',         cls: 'st-ready' },
        entregado: { label: 'Entregado',              cls: 'st-done' },
        rechazado: { label: 'No aceptado — consultá al mozo', cls: 'st-rej' },
    };

    let cfg = null, table = null, hidePrices = false, active = false, tableOpen = false;
    let cart = load(sessionStorage, CART_KEY, {});        // { productId: { qty, name, price } }
    let myOrders = load(localStorage, ORDERS_KEY, []);    // [{ id, number, at }]
    const orderUnsubs = {};
    const orderState  = {};

    function load(store, key, fallback) {
        try { return JSON.parse(store.getItem(key)) ?? fallback; } catch { return fallback; }
    }
    function save(store, key, val) {
        try { store.setItem(key, JSON.stringify(val)); } catch { /* modo privado */ }
    }
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const parsePrice = p => Number(String(p ?? '').replace(/[^\d.,]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.')) || 0;
    const money = n => '$' + Math.round(n).toLocaleString('es-AR');

    // ── API pública para menu-viewers.js ──────────────────────
    window.TableOrdering = {
        decorate(container) {
            if (!active) return;
            container.querySelectorAll('.menu-item[data-id]').forEach(item => {
                if (item.querySelector('.to-add')) return;
                const btn = document.createElement('button');
                btn.className = 'to-add';
                btn.type = 'button';
                btn.setAttribute('aria-label', 'Agregar al pedido');
                btn.textContent = '+';
                btn.addEventListener('click', e => {
                    e.stopPropagation(); // no abrir el acordeón
                    addToCart(item.dataset.id, item.querySelector('.producto')?.textContent || '', parsePrice(item.dataset.price));
                    btn.classList.remove('pop'); void btn.offsetWidth; btn.classList.add('pop');
                });
                item.querySelector('.item-header')?.appendChild(btn);
                updateItemBadge(item);
            });
        },
    };

    document.addEventListener('DOMContentLoaded', () => {
        if (typeof db === 'undefined') return;
        const restRef = db.collection('restaurants').doc(restaurantId);

        restRef.collection('config').doc('ordering').onSnapshot(doc => {
            cfg   = doc.exists ? doc.data() : {};
            table = (cfg.tables || []).find(t => t.id === mesaId) || null;
            const wasActive = active;
            active = !!(cfg.enabled && table);
            if (active && !wasActive) mountUI();
            if (!active && wasActive) unmountUI();
            if (active) renderBar();
        }, err => console.warn('ordering config:', err));

        // Estado de la mesa (abierta por el mozo → el pedido va directo a cocina)
        restRef.collection('mesas').doc(mesaId).onSnapshot(doc => {
            const m = doc.data();
            const last = m?.lastActivityAt?.toMillis?.() || m?.openedAt?.toMillis?.() || 0;
            tableOpen = !!m?.open && Date.now() - last < 6 * 3600 * 1000;
            if (active) renderBar();
        }, () => {});

        restRef.collection('config').doc('styles').onSnapshot(doc => {
            hidePrices = !!doc.data()?.hidePrices;
            if (active) renderBar();
        }, () => {});

        myOrders.forEach(o => watchOrder(o.id));
    });

    // ── UI ────────────────────────────────────────────────────
    function mountUI() {
        document.body.classList.add('ordering-on');
        document.getElementById('shareBtn')?.style.setProperty('display', 'none', 'important');

        const banner = document.createElement('div');
        banner.id = 'toBanner';
        banner.className = 'to-banner';
        document.querySelector('.page-wrapper')?.prepend(banner);

        const bar = document.createElement('div');
        bar.id = 'toBar';
        bar.className = 'to-bar';
        document.body.appendChild(bar);

        const sheet = document.createElement('div');
        sheet.id = 'toSheet';
        sheet.className = 'to-sheet-backdrop';
        sheet.innerHTML = '<div class="to-sheet" role="dialog" aria-modal="true"></div>';
        sheet.addEventListener('click', e => { if (e.target === sheet) closeSheet(); });
        document.body.appendChild(sheet);

        const toast = document.createElement('div');
        toast.id = 'toToast';
        toast.className = 'to-toast';
        document.body.appendChild(toast);

        const container = document.getElementById('menu-container');
        if (container) window.TableOrdering.decorate(container);
    }

    function unmountUI() {
        document.body.classList.remove('ordering-on');
        ['toBanner', 'toBar', 'toSheet', 'toToast'].forEach(id => document.getElementById(id)?.remove());
        document.querySelectorAll('.to-add, .to-qty-badge').forEach(el => el.remove());
    }

    function cartCount() { return Object.values(cart).reduce((s, l) => s + l.qty, 0); }
    function cartTotal() { return Object.values(cart).reduce((s, l) => s + l.qty * l.price, 0); }

    function renderBar() {
        const banner = document.getElementById('toBanner');
        if (banner) banner.innerHTML = `<span class="to-banner-dot"></span> ${esc(table.label)} · Pedí desde acá tocando <b>+</b>`
            + (cfg.tableSessions !== false && !tableOpen ? '<small class="to-banner-sub">El mozo confirma tu primer pedido</small>' : '');

        const bar = document.getElementById('toBar');
        if (!bar) return;
        const n = cartCount();
        const live = myOrders.filter(o => !['entregado', 'rechazado'].includes(orderState[o.id]?.status));
        bar.innerHTML = `
            ${myOrders.length ? `<button class="to-bar-orders" type="button">Mis pedidos${live.length ? ` <span class="to-pill">${live.length}</span>` : ''}</button>` : ''}
            <button class="to-bar-cart" type="button" ${n ? '' : 'disabled'}>
                ${n ? `Ver pedido · ${n} ${n === 1 ? 'producto' : 'productos'}${hidePrices ? '' : ` · ${money(cartTotal())}`}` : 'Agregá productos con +'}
            </button>`;
        bar.querySelector('.to-bar-cart')?.addEventListener('click', openCart);
        bar.querySelector('.to-bar-orders')?.addEventListener('click', openOrders);
        document.querySelectorAll('.menu-item[data-id]').forEach(updateItemBadge);
    }

    function updateItemBadge(item) {
        const qty = cart[item.dataset.id]?.qty || 0;
        let badge = item.querySelector('.to-qty-badge');
        if (!qty) { badge?.remove(); return; }
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'to-qty-badge';
            item.querySelector('.to-add')?.before(badge);
        }
        badge.textContent = `×${qty}`;
    }

    function addToCart(id, name, price) {
        cart[id] = cart[id] || { qty: 0, name: name.trim(), price };
        cart[id].qty = Math.min(cart[id].qty + 1, 20);
        save(sessionStorage, CART_KEY, cart);
        renderBar();
    }

    function setQty(id, qty) {
        if (qty <= 0) delete cart[id];
        else cart[id].qty = Math.min(qty, 20);
        save(sessionStorage, CART_KEY, cart);
        renderBar();
    }

    function openSheet(html) {
        const sheet = document.getElementById('toSheet');
        sheet.querySelector('.to-sheet').innerHTML = html;
        sheet.classList.add('open');
        document.body.style.overflow = 'hidden';
        return sheet.querySelector('.to-sheet');
    }
    function closeSheet() {
        document.getElementById('toSheet')?.classList.remove('open');
        document.body.style.overflow = '';
    }

    function openCart() {
        const lines = Object.entries(cart);
        if (!lines.length) { closeSheet(); return; }
        const el = openSheet(`
            <div class="to-sheet-head">
                <h3>Tu pedido · ${esc(table.label)}</h3>
                <button class="to-x" type="button" aria-label="Cerrar">×</button>
            </div>
            <div class="to-lines">
                ${lines.map(([id, l]) => `
                    <div class="to-line" data-id="${esc(id)}">
                        <div class="to-line-name">${esc(l.name)}${hidePrices ? '' : `<small>${money(l.price * l.qty)}</small>`}</div>
                        <div class="to-stepper">
                            <button type="button" data-d="-1" aria-label="Quitar uno">−</button>
                            <span>${l.qty}</span>
                            <button type="button" data-d="1" aria-label="Agregar uno">+</button>
                        </div>
                    </div>`).join('')}
            </div>
            <label class="to-field">Aclaraciones (opcional)
                <textarea id="toNote" maxlength="300" rows="2" placeholder="Ej: sin azúcar, leche de almendras…"></textarea>
            </label>
            <label class="to-field">Tu nombre (opcional)
                <input id="toName" maxlength="60" placeholder="Para que el mozo te encuentre">
            </label>
            ${hidePrices ? '' : `<div class="to-total"><span>Total</span><b>${money(cartTotal())}</b></div>`}
            <p class="to-hint">Pagás al final, en el local.</p>
            <p class="to-error" id="toError"></p>
            <button class="to-send" type="button" id="toSend">Enviar pedido</button>`);

        el.querySelector('.to-x').addEventListener('click', closeSheet);
        el.querySelectorAll('.to-stepper button').forEach(b => b.addEventListener('click', () => {
            const id = b.closest('.to-line').dataset.id;
            setQty(id, (cart[id]?.qty || 0) + Number(b.dataset.d));
            const note = el.querySelector('#toNote').value, name = el.querySelector('#toName').value;
            openCart();
            const again = document.querySelector('#toSheet .to-sheet');
            if (again?.querySelector('#toNote')) { again.querySelector('#toNote').value = note; again.querySelector('#toName').value = name; }
        }));
        el.querySelector('#toSend').addEventListener('click', () => sendOrder(el));
    }

    function getLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) { reject(new Error('Tu navegador no permite compartir la ubicación.')); return; }
            navigator.geolocation.getCurrentPosition(
                pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
                err => reject(new Error(err.code === 1
                    ? 'Para pedir desde la mesa tenés que permitir el acceso a tu ubicación (lo usamos solo para confirmar que estás en el local).'
                    : 'No pudimos obtener tu ubicación. Activá el GPS e intentá de nuevo.')),
                { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
            );
        });
    }

    async function sendOrder(el) {
        const btn = el.querySelector('#toSend');
        const errEl = el.querySelector('#toError');
        errEl.textContent = '';
        btn.disabled = true;

        const payload = {
            r: restaurantId,
            mesa: mesaId,
            items: Object.entries(cart).map(([id, l]) => ({ id, qty: l.qty })),
            note: el.querySelector('#toNote').value.trim(),
            name: el.querySelector('#toName').value.trim(),
        };
        const post = async body => {
            const r = await fetch(`${FUNCTIONS_BASE}/placeOrder`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            return { ok: r.ok, data: await r.json().catch(() => ({})) };
        };

        try {
            // Primero sin ubicación: si la mesa está abierta o el comensal está en el
            // Wi-Fi del local, el servidor ya lo verifica y no hace falta pedir GPS.
            btn.textContent = 'Enviando…';
            let { ok, data } = await post(payload);
            if (!ok && data.code === 'need_location') {
                btn.textContent = 'Verificando ubicación…';
                const coords = await getLocation();
                btn.textContent = 'Enviando…';
                ({ ok, data } = await post({ ...payload, coords }));
            }
            if (!ok) throw new Error(data.error || 'No se pudo enviar el pedido.');

            cart = {};
            save(sessionStorage, CART_KEY, cart);
            myOrders.unshift({ id: data.orderId, number: data.number, at: Date.now() });
            myOrders = myOrders.slice(0, 10);
            save(localStorage, ORDERS_KEY, myOrders);
            watchOrder(data.orderId);
            renderBar();
            openSheet(`
                <div class="to-done">
                    <div class="to-done-num">#${data.number}</div>
                    <h3>¡Pedido enviado!</h3>
                    <p>${data.status === 'pendiente'
                        ? 'El equipo lo confirma en un momento y pasa a cocina.'
                        : 'Ya está en cocina.'}</p>
                    <p class="to-hint">Podés seguir su estado en <b>Mis pedidos</b>.</p>
                    <button class="to-send" type="button">Seguir mirando el menú</button>
                </div>`).querySelector('.to-send').addEventListener('click', closeSheet);
        } catch (e) {
            errEl.textContent = e.message;
            btn.disabled = false;
            btn.textContent = 'Enviar pedido';
        }
    }

    function openOrders() {
        const el = openSheet(`
            <div class="to-sheet-head">
                <h3>Mis pedidos</h3>
                <button class="to-x" type="button" aria-label="Cerrar">×</button>
            </div>
            <div class="to-orders">
                ${myOrders.map(o => {
                    const d  = orderState[o.id];
                    const st = STATUS[d?.status] || { label: 'Cargando…', cls: '' };
                    return `
                    <div class="to-order">
                        <div class="to-order-head"><b>Pedido #${o.number}</b><span class="to-status ${st.cls}">${st.label}</span></div>
                        ${d ? `<ul>${d.items.map(i => `<li>${i.qty} × ${esc(i.nombre)}</li>`).join('')}</ul>` : ''}
                    </div>`;
                }).join('')}
            </div>`);
        el.querySelector('.to-x').addEventListener('click', closeSheet);
    }

    function watchOrder(id) {
        if (orderUnsubs[id] || typeof db === 'undefined') return;
        orderUnsubs[id] = db.collection('restaurants').doc(restaurantId).collection('pedidos').doc(id)
            .onSnapshot(doc => {
                if (!doc.exists) return;
                const prev = orderState[id]?.status;
                orderState[id] = doc.data();
                const now = orderState[id].status;
                if (prev && prev !== now && STATUS[now]) toast(`Pedido #${orderState[id].number}: ${STATUS[now].label}`);
                if (active) renderBar();
                if (document.querySelector('#toSheet.open .to-orders')) openOrders();
            }, () => {});
    }

    function toast(msg) {
        const t = document.getElementById('toToast');
        if (!t) return;
        t.textContent = msg;
        t.classList.add('show');
        if (navigator.vibrate) navigator.vibrate(200);
        clearTimeout(t._h);
        t._h = setTimeout(() => t.classList.remove('show'), 4500);
    }
})();
