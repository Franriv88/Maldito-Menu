// Js/dashboard.js

const grid        = document.getElementById('restaurantsGrid');
const newRestModal = document.getElementById('newRestModal');
const qrModal      = document.getElementById('qrModal');

// ── Auth guard ────────────────────────────────────────────────

auth.onAuthStateChanged(async user => {
    if (!user) { window.location.href = './index.html'; return; }

    document.getElementById('userName').textContent = user.displayName || user.email;
    document.getElementById('logoutBtn').addEventListener('click', () => auth.signOut());

    await loadRestaurants(user.uid);
});

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
        <h3>${esc(data.nombre)}</h3>
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
    const qrBtn  = e.target.closest('[data-qr]');
    const delBtn = e.target.closest('[data-del]');
    if (qrBtn)  showQR(qrBtn.dataset.qr, qrBtn.dataset.name);
    if (delBtn) deleteRestaurant(delBtn.dataset.del, delBtn.dataset.name);
});

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

function showQR(id, nombre) {
    const url    = `${location.origin}/menu.html?r=${id}`;
    const qrSrc  = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;

    document.getElementById('qrRestName').textContent = nombre;
    document.getElementById('qrImage').src = qrSrc;
    document.getElementById('qrUrl').value = url;
    document.getElementById('qrDownloadBtn').href = qrSrc;

    qrModal.classList.add('visible');
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
