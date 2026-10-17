// ── Instructivo paso a paso (editor del menú y Pedidos) ──────────────────
// Botón flotante «Instructivo» + ventana con pasos (imagen, título y texto; Anterior / Siguiente).
// Se abre solo la primera vez que el dueño entra a la sección: se recuerda en el dispositivo
// (localStorage) y en su cuenta (users/{uid}.guidesSeen.{id}), así no se repite en otro dispositivo.
//
//   CubiertoGuide.setup({ id: 'editor', title: 'Cómo armar tu menú', steps: () => [...], uid, auto: true })
//   step: { img: 'img/guide/editor-1', title, html }   ← img sin extensión: se elige -dark/-light.webp según el tema
(function () {
    let current = null;   // { cfg, steps, i }
    let overlay = null;

    const seenKey = (id, uid) => `guide_seen_${id}_${uid || 'anon'}`;
    const lsGet = k => { try { return localStorage.getItem(k); } catch { return null; } };
    const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
    const icon = (name, size) => (typeof licon === 'function' ? licon(name, size) : '');
    const theme = () => (document.body.classList.contains('light') ? 'light' : 'dark');
    const imgUrl = (img, cfg) => `${window.GUIDE_IMG_BASE || ''}${img}-${theme()}.webp?v=${cfg.imgVersion || 1}`;

    async function alreadySeen(id, uid) {
        if (lsGet(seenKey(id, uid))) return true;
        if (!uid || typeof db === 'undefined') return false;
        try {
            const snap = await db.collection('users').doc(uid).get();
            const seen = !!snap.data()?.guidesSeen?.[id];
            if (seen) lsSet(seenKey(id, uid), '1');
            return seen;
        } catch { return false; }
    }

    function markSeen(id, uid) {
        lsSet(seenKey(id, uid), '1');
        if (!uid || typeof db === 'undefined') return;
        db.collection('users').doc(uid).update({ [`guidesSeen.${id}`]: true }).catch(() => {});
    }

    function build() {
        overlay = document.createElement('div');
        overlay.className = 'gd-overlay';
        overlay.hidden = true;
        overlay.innerHTML = `
            <div class="gd-card" role="dialog" aria-modal="true" aria-labelledby="gdTitle">
                <div class="gd-top">
                    <span class="gd-kicker"></span>
                    <button type="button" class="gd-close" aria-label="Cerrar el instructivo" title="Cerrar">${icon('x', 16)}</button>
                </div>
                <div class="gd-media"><img alt="" decoding="async"></div>
                <div class="gd-body">
                    <p class="gd-step"></p>
                    <h2 id="gdTitle" class="gd-title"></h2>
                    <div class="gd-text"></div>
                </div>
                <div class="gd-foot">
                    <button type="button" class="gd-prev">${icon('chevron-left', 16)} Anterior</button>
                    <div class="gd-dots" role="tablist"></div>
                    <button type="button" class="gd-next">Siguiente ${icon('chevron-right', 16)}</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);
        overlay.querySelector('.gd-close').addEventListener('click', close);
        overlay.querySelector('.gd-prev').addEventListener('click', () => go(current.i - 1));
        overlay.querySelector('.gd-next').addEventListener('click', () => {
            if (current.i >= current.steps.length - 1) close(); else go(current.i + 1);
        });
        overlay.querySelector('.gd-dots').addEventListener('click', e => {
            const b = e.target.closest('button[data-i]');
            if (b) go(+b.dataset.i);
        });
        overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
        document.addEventListener('keydown', e => {
            if (!current || overlay.hidden) return;
            if (e.key === 'Escape') close();
            else if (e.key === 'ArrowRight' && current.i < current.steps.length - 1) go(current.i + 1);
            else if (e.key === 'ArrowLeft' && current.i > 0) go(current.i - 1);
        });
        // Deslizar con el dedo para pasar de paso
        let x0 = null;
        overlay.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
        overlay.addEventListener('touchend', e => {
            if (x0 == null || !current) return;
            const dx = e.changedTouches[0].clientX - x0; x0 = null;
            if (dx < -50 && current.i < current.steps.length - 1) go(current.i + 1);
            else if (dx > 50 && current.i > 0) go(current.i - 1);
        });
        const img = overlay.querySelector('.gd-media img');
        img.addEventListener('error', () => overlay.querySelector('.gd-media').classList.add('gd-noimg'));
        img.addEventListener('load', () => overlay.querySelector('.gd-media').classList.remove('gd-noimg'));
    }

    function go(i) {
        const { steps, cfg } = current;
        current.i = Math.max(0, Math.min(i, steps.length - 1));
        const s = steps[current.i];
        overlay.querySelector('.gd-kicker').innerHTML = `${icon('book-open', 14)} ${cfg.title}`;
        overlay.querySelector('.gd-step').textContent = `Paso ${current.i + 1} de ${steps.length}`;
        overlay.querySelector('.gd-title').textContent = s.title;
        overlay.querySelector('.gd-text').innerHTML = s.html;
        const media = overlay.querySelector('.gd-media');
        const img = media.querySelector('img');
        if (s.img) {
            media.hidden = false;
            media.classList.remove('gd-noimg');
            img.src = imgUrl(s.img, cfg);
            img.alt = s.title;
        } else media.hidden = true;
        overlay.querySelector('.gd-dots').innerHTML = steps.map((_, k) =>
            `<button type="button" data-i="${k}" class="${k === current.i ? 'on' : ''}" aria-label="Paso ${k + 1}"></button>`).join('');
        overlay.querySelector('.gd-prev').disabled = current.i === 0;
        const last = current.i === steps.length - 1;
        overlay.querySelector('.gd-next').innerHTML = last ? `${icon('check', 16)} ¡Listo!` : `Siguiente ${icon('chevron-right', 16)}`;
        overlay.querySelector('.gd-next').classList.toggle('gd-done', last);
        overlay.querySelector('.gd-body').scrollTop = 0;
        // Precargar la imagen del paso siguiente
        const nx = steps[current.i + 1];
        if (nx?.img) { const p = new Image(); p.src = imgUrl(nx.img, cfg); }
    }

    function open(cfg) {
        if (!overlay) build();
        current = { cfg, steps: cfg.steps(), i: 0 };
        overlay.hidden = false;
        document.body.classList.add('gd-open');
        go(0);
        overlay.querySelector('.gd-next').focus({ preventScroll: true });
    }

    function close() {
        if (!current) return;
        overlay.hidden = true;
        document.body.classList.remove('gd-open');
        markSeen(current.cfg.id, current.cfg.uid);
        current = null;
    }

    function setup(cfg) {
        let btn = document.getElementById('guideBtn');
        if (!btn) {
            btn = document.createElement('button');
            btn.type = 'button';
            btn.id = 'guideBtn';
            btn.className = 'gd-fab';
            btn.title = 'Ver el instructivo paso a paso';
            btn.innerHTML = `${icon('book-open', 17)}<span>Instructivo</span>`;
            document.body.appendChild(btn);
        }
        btn.onclick = () => open(cfg);
        if (cfg.auto) {
            alreadySeen(cfg.id, cfg.uid).then(seen => {
                if (seen) return;
                // Esperar a que no haya otro aviso abierto (SweetAlert) antes de mostrarlo
                let tries = 0;
                const tryOpen = () => {
                    const busy = (typeof Swal !== 'undefined' && Swal.isVisible?.()) || (overlay && !overlay.hidden);
                    if (busy && tries++ < 120) { setTimeout(tryOpen, 1000); return; }
                    if (!busy) open(cfg);
                };
                setTimeout(tryOpen, cfg.delay ?? 900);
            });
        }
    }

    window.CubiertoGuide = { setup, open: id => document.getElementById('guideBtn')?.click() };
})();
