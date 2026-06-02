// Js/dashboard.js

const grid        = document.getElementById('restaurantsGrid');
const newRestModal = document.getElementById('newRestModal');
const qrModal      = document.getElementById('qrModal');

// ── Auth guard ────────────────────────────────────────────────

auth.onAuthStateChanged(async user => {
    if (!user) { window.location.href = './index.html'; return; }

    document.getElementById('userName').textContent = user.displayName || user.email;
    document.getElementById('logoutBtn').addEventListener('click', () => auth.signOut());

    // Registrar/actualizar perfil en Firestore
    try {
        const userRef = db.collection('users').doc(user.uid);
        const userDoc = await userRef.get();
        await userRef.set({
            email:       user.email,
            displayName: user.displayName || user.email.split('@')[0],
            lastLogin:   firebase.firestore.FieldValue.serverTimestamp(),
            ...(!userDoc.exists && { createdAt: firebase.firestore.FieldValue.serverTimestamp() }),
        }, { merge: true });

        // Verificar suscripción
        if (userDoc.exists && userDoc.data().subscription?.status === 'blocked') {
            showBlockedScreen();
            return;
        }
    } catch (err) {
        console.warn('Error actualizando perfil:', err);
    }

    await loadRestaurants(user.uid);
});

function showBlockedScreen() {
    document.querySelector('.dash-main').innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:60vh;gap:1.2rem;text-align:center;padding:2rem">
            <div style="font-size:2.5rem">🚫</div>
            <h2 style="color:#c8b89a;font-size:1.3rem;margin:0">Cuenta suspendida</h2>
            <p style="color:rgba(200,184,154,.5);max-width:380px;font-size:.9rem;line-height:1.6;margin:0">
                Tu suscripción está vencida o fue suspendida.<br>
                Contactá al administrador para regularizar tu cuenta.
            </p>
            <a href="mailto:frivasv2388@gmail.com" style="margin-top:.5rem;color:#c8b89a;font-size:.85rem;border:1px solid rgba(200,184,154,.25);padding:.5rem 1.2rem;border-radius:8px;text-decoration:none">
                Contactar soporte
            </a>
        </div>`;
}

// ── Cargar restaurantes ────────────────────────────────────────

async function loadRestaurants(uid) {
    try {
        const snap = await db.collection('restaurants')
            .where('ownerId', '==', uid)
            .get();

        if (snap.empty) {
            grid.innerHTML = `<div class="empty-state">
                Todavía no tenés restaurantes.<br>
                Hacé clic en <strong>+ Nuevo restaurante</strong> para empezar.
            </div>`;
            return;
        }

        const docs = [];
        snap.forEach(doc => docs.push({ id: doc.id, data: doc.data() }));
        docs.sort((a, b) => (b.data.createdAt?.seconds ?? 0) - (a.data.createdAt?.seconds ?? 0));

        grid.innerHTML = '';
        docs.forEach(({ id, data }) => grid.appendChild(buildCard(id, data)));
    } catch (err) {
        console.error(err);
        grid.innerHTML = `<div class="empty-state">Error al cargar. Recargá la página.</div>`;
    }
}

function buildCard(id, data) {
    const menuUrl = `${location.origin}/menu.html?r=${id}`;
    const card = document.createElement('div');
    card.className = 'rest-card';
    card.innerHTML = `
        <div class="card-name-row">
            <h3 class="rest-name">${esc(data.nombre)}</h3>
            <button class="btn-rename" data-rename="${id}" title="Renombrar">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
            </button>
        </div>
        <div class="card-actions">
            <a href="admin.html?r=${id}" class="btn-card btn-edit">✏ Editar menú</a>
            <a href="${menuUrl}" target="_blank" class="btn-card">👁 Ver menú</a>
            <button class="btn-card" data-qr="${id}" data-name="${esc(data.nombre)}">QR / Link</button>
            <button class="btn-card btn-delete" data-del="${id}" data-name="${esc(data.nombre)}">Eliminar</button>
        </div>`;
    return card;
}

// Delegación de clicks en la grilla
grid.addEventListener('click', e => {
    const qrBtn     = e.target.closest('[data-qr]');
    const delBtn    = e.target.closest('[data-del]');
    const renameBtn = e.target.closest('[data-rename]');
    if (qrBtn)     showQR(qrBtn.dataset.qr, qrBtn.dataset.name);
    if (delBtn)    deleteRestaurant(delBtn.dataset.del, delBtn.dataset.name);
    if (renameBtn) startRename(renameBtn);
});

function startRename(btn) {
    const row  = btn.closest('.card-name-row');
    const h3   = row.querySelector('.rest-name');
    const id   = btn.dataset.rename;
    const prev = h3.textContent.trim();

    const input = document.createElement('input');
    input.type      = 'text';
    input.value     = prev;
    input.className = 'rename-input';
    h3.replaceWith(input);
    btn.style.visibility = 'hidden';
    input.focus();
    input.select();

    const finish = async () => {
        const next = input.value.trim() || prev;
        const newH3 = document.createElement('h3');
        newH3.className   = 'rest-name';
        newH3.textContent = next;
        input.replaceWith(newH3);
        btn.style.visibility = '';

        if (next !== prev) {
            try {
                await db.collection('restaurants').doc(id).update({ nombre: next });
            } catch (err) {
                console.error('Error al renombrar:', err);
                newH3.textContent = prev;
            }
        }
    };

    input.addEventListener('blur', finish);
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter')  input.blur();
        if (e.key === 'Escape') { input.value = prev; input.blur(); }
    });
}

// ── Crear restaurante ──────────────────────────────────────────

document.getElementById('newRestBtn').addEventListener('click', () => {
    document.getElementById('newRestName').value = '';
    newRestModal.classList.add('visible');
    setTimeout(() => document.getElementById('newRestName').focus(), 50);
});

document.getElementById('cancelNewRest').addEventListener('click', () => {
    newRestModal.classList.remove('visible');
});

newRestModal.addEventListener('click', e => {
    if (e.target === newRestModal) newRestModal.classList.remove('visible');
});

document.getElementById('confirmNewRest').addEventListener('click', createRestaurant);
document.getElementById('newRestName').addEventListener('keydown', e => {
    if (e.key === 'Enter') createRestaurant();
});

async function createRestaurant() {
    const nombre = document.getElementById('newRestName').value.trim();
    if (!nombre) { document.getElementById('newRestName').focus(); return; }

    const btn = document.getElementById('confirmNewRest');
    btn.disabled = true;
    btn.textContent = 'Creando...';

    try {
        const user = auth.currentUser;
        const docRef = await db.collection('restaurants').add({
            ownerId:   user.uid,
            nombre,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        window.location.href = `admin.html?r=${docRef.id}`;
    } catch (err) {
        console.error(err);
        alert('Error al crear el restaurante.');
        btn.disabled = false;
        btn.textContent = 'Crear';
    }
}

// ── Eliminar restaurante ───────────────────────────────────────

async function deleteRestaurant(id, nombre) {
    if (!confirm(`¿Eliminar "${nombre}"? Se borrarán todos sus productos e imágenes. Esta acción no se puede deshacer.`)) return;

    try {
        // Borrar subcollections productos y config
        const batch = db.batch();
        const prods  = await db.collection('restaurants').doc(id).collection('productos').get();
        const config = await db.collection('restaurants').doc(id).collection('config').get();
        prods.forEach(d  => batch.delete(d.ref));
        config.forEach(d => batch.delete(d.ref));
        batch.delete(db.collection('restaurants').doc(id));
        await batch.commit();

        // Recargar
        const uid = auth.currentUser.uid;
        await loadRestaurants(uid);
    } catch (err) {
        console.error(err);
        alert('Error al eliminar.');
    }
}

// ── QR Modal ──────────────────────────────────────────────────

async function showQR(id, nombre) {
    const url = `${location.origin}/menu.html?r=${id}`;
    document.getElementById('qrRestName').textContent = nombre;
    document.getElementById('qrUrl').value = url;
    document.getElementById('qrDownloadBtn').removeAttribute('href');
    qrModal.classList.add('visible');

    const canvas = document.getElementById('qrCanvas');
    const ctx    = canvas.getContext('2d');
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let logoBase64 = null;
    try {
        const doc = await db.collection('restaurants').doc(id).collection('config').doc('styles').get();
        if (doc.exists) logoBase64 = doc.data().logoBase64 || null;
    } catch (_) {}

    const dataUrl = await buildQRDataUrl(url, logoBase64);
    if (!dataUrl) return;

    try {
        const img = await loadImage(dataUrl);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        document.getElementById('qrDownloadBtn').href = dataUrl;
    } catch (_) {}
}

async function buildQRDataUrl(url, logoBase64) {
    const SIZE = 340;

    // ── Intento 1: QRCodeStyling (módulos redondeados, logo nativo) ──
    if (typeof QRCodeStyling !== 'undefined') {
        try {
            const opts = {
                width: SIZE, height: SIZE,
                data: url,
                margin: 12,
                qrOptions: { errorCorrectionLevel: 'H' },
                dotsOptions:          { color: '#000000', type: 'extra-rounded' },
                cornersSquareOptions: { color: '#000000', type: 'extra-rounded' },
                cornersDotOptions:    { color: '#000000', type: 'dot' },
                backgroundOptions:    { color: '#ffffff' },
            };
            if (logoBase64) {
                opts.image = logoBase64;
                opts.imageOptions = { margin: 6, imageSize: 0.3, hideBackgroundDots: true };
            }
            const qr   = new QRCodeStyling(opts);
            const blob = await qr.getRawData('png');
            if (blob) return await blobToDataUrl(blob);
        } catch (e) {
            console.warn('QRCodeStyling falló, usando fallback:', e);
        }
    }

    // ── Fallback: qrserver.com + logo manual en canvas ──────────────
    const apiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${SIZE}x${SIZE}&ecc=H&data=${encodeURIComponent(url)}`;
    try {
        const resp = await fetch(apiUrl);
        if (!resp.ok) throw new Error('QR API error');
        const qrDataUrl = await blobToDataUrl(await resp.blob());

        const canvas = document.createElement('canvas');
        canvas.width = SIZE; canvas.height = SIZE;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(await loadImage(qrDataUrl), 0, 0, SIZE, SIZE);

        if (logoBase64) {
            const LOGO = Math.round(SIZE * 0.2);
            const x = (SIZE - LOGO) / 2, y = (SIZE - LOGO) / 2, pad = 6;
            const logoImg = await loadImage(logoBase64);
            ctx.fillStyle = '#ffffff';
            qrRoundRect(ctx, x - pad, y - pad, LOGO + pad * 2, LOGO + pad * 2, 8);
            ctx.fill();
            ctx.drawImage(logoImg, x, y, LOGO, LOGO);
        }
        return canvas.toDataURL('image/png');
    } catch (err) {
        console.error('Error generando QR:', err);
        return null;
    }
}

function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload  = () => resolve(img);
        img.onerror = () => reject(new Error('No se pudo cargar la imagen'));
        img.src = src;
    });
}

function qrRoundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);     ctx.arcTo(x + w, y,     x + w, y + r,     r);
    ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);     ctx.arcTo(x, y + h,     x, y + h - r,     r);
    ctx.lineTo(x, y + r);         ctx.arcTo(x, y,         x + r, y,         r);
    ctx.closePath();
}

document.getElementById('closeQrModal').addEventListener('click', () => qrModal.classList.remove('visible'));
qrModal.addEventListener('click', e => { if (e.target === qrModal) qrModal.classList.remove('visible'); });

document.getElementById('copyUrlBtn').addEventListener('click', () => {
    const input = document.getElementById('qrUrl');
    const btn   = document.getElementById('copyUrlBtn');
    navigator.clipboard.writeText(input.value).then(() => {
        btn.textContent = '¡Copiado!';
        btn.classList.add('copied');
        setTimeout(() => { btn.textContent = 'Copiar'; btn.classList.remove('copied'); }, 2000);
    });
});

// ── Helpers ───────────────────────────────────────────────────

function esc(str) {
    return String(str)
        .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
        .replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
