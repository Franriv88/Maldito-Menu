// menu-i18n.js — idioma del menú público (español, inglés, alemán, francés)
// - Textos fijos de la página (guía, pedidos, botones): diccionario de abajo, la clave es el texto en español.
// - Textos del restaurante (productos, descripciones, títulos, aviso del pie): se traducen solos con la
//   function translateMenu (Cloud Translation, con caché en Firestore). El restaurante escribe solo en español.
// El idioma elegido se recuerda en el celular para todos los menús. Carga ANTES de table-ordering.js y menu-viewers.js.

window.MenuI18n = (() => {
    const FUNCTIONS_BASE = 'https://us-central1-maldito-cafe.cloudfunctions.net';
    const LANGS = [
        { id: 'es', label: 'Español',  locale: 'es-AR' },
        { id: 'en', label: 'English',  locale: 'en-US' },
        { id: 'de', label: 'Deutsch',  locale: 'de-DE' },
        { id: 'fr', label: 'Français', locale: 'fr-FR' },
    ];
    const LANG_KEY = 'menu_lang';
    const DEFAULT_EXTRA = ['en'];   // mismo valor por defecto que functions (translateMenu)

    // [en, de, fr]
    const DICT = {
        // Guía
        'Bienvenido a nuestro menú': ['Welcome to our menu', 'Willkommen in unserer Speisekarte', 'Bienvenue sur notre carte'],
        '¿Cómo pedir?': ['How to order', 'So bestellen Sie', 'Comment commander ?'],
        'Entendido': ['Got it', 'Verstanden', 'Compris'],
        'Idioma': ['Language', 'Sprache', 'Langue'],
        'Ver instrucciones y cambiar idioma': ['Instructions and language', 'Anleitung und Sprache', 'Instructions et langue'],
        'Ver instrucciones': ['Instructions', 'Anleitung', 'Instructions'],
        'Traduciendo el menú…': ['Translating the menu…', 'Speisekarte wird übersetzt…', 'Traduction de la carte…'],
        'Menú traducido automáticamente.': ['Menu translated automatically.', 'Speisekarte automatisch übersetzt.', 'Carte traduite automatiquement.'],
        'La traducción automática no está disponible ahora: el menú se muestra en español.': [
            'Automatic translation is not available right now: the menu is shown in Spanish.',
            'Die automatische Übersetzung ist gerade nicht verfügbar: Die Speisekarte wird auf Spanisch angezeigt.',
            'La traduction automatique n’est pas disponible pour le moment : la carte est affichée en espagnol.'],
        'Tocá un producto': ['Tap a product', 'Tippen Sie auf ein Produkt', 'Touchez un produit'],
        'para ver su descripción. Volvé a tocarlo para cerrarla.': ['to see its description. Tap it again to close it.', 'um die Beschreibung zu sehen. Erneut tippen, um sie zu schließen.', 'pour voir sa description. Touchez-le à nouveau pour la fermer.'],
        'Recorré las secciones': ['Browse the sections', 'Blättern Sie durch die Bereiche', 'Parcourez les sections'],
        'deslizando hacia abajo.': ['by scrolling down.', 'indem Sie nach unten scrollen.', 'en faisant défiler vers le bas.'],
        'Compartí el menú': ['Share the menu', 'Teilen Sie die Speisekarte', 'Partagez la carte'],
        'con el botón Compartir.': ['with the Share button.', 'mit der Schaltfläche „Teilen“.', 'avec le bouton Partager.'],
        'para ver su descripción.': ['to see its description.', 'um die Beschreibung zu sehen.', 'pour voir sa description.'],
        'Agregalo con +': ['Add it with +', 'Mit + hinzufügen', 'Ajoutez-le avec +'],
        'y quitalo con −. Podés sumar varios.': ['and remove it with −. You can add several.', 'und mit − entfernen. Sie können mehrere hinzufügen.', 'et retirez-le avec −. Vous pouvez en ajouter plusieurs.'],
        'Revisá tu pedido': ['Check your order', 'Prüfen Sie Ihre Bestellung', 'Vérifiez votre commande'],
        'en la barra de abajo, escribí tu nombre y tocá Enviar pedido.': ['in the bar at the bottom, enter your name and tap Send order.', 'in der Leiste unten, geben Sie Ihren Namen ein und tippen Sie auf „Bestellung senden“.', 'dans la barre en bas, indiquez votre nom et touchez Envoyer la commande.'],
        'en la barra de abajo, confirmá tu nombre y tocá Enviar pedido.': ['in the bar at the bottom, confirm your name and tap Send order.', 'in der Leiste unten, bestätigen Sie Ihren Namen und tippen Sie auf „Bestellung senden“.', 'dans la barre en bas, confirmez votre nom et touchez Envoyer la commande.'],
        'Seguí el estado': ['Follow the status', 'Verfolgen Sie den Status', 'Suivez le statut'],
        'en Pedidos: ahí ves tus pedidos y los de toda la mesa.': ['in Orders: there you see your orders and the whole table’s.', 'unter „Bestellungen“: Dort sehen Sie Ihre Bestellungen und die des ganzen Tisches.', 'dans Commandes : vous y voyez vos commandes et celles de toute la table.'],
        'en Pedidos: ahí te avisamos cuando lo confirmamos y cuando está listo.': ['in Orders: we’ll let you know when we confirm it and when it’s ready.', 'unter „Bestellungen“: Wir sagen Ihnen Bescheid, wenn wir sie bestätigen und wenn sie fertig ist.', 'dans Commandes : nous vous prévenons quand nous la confirmons et quand elle est prête.'],

        // Menú
        'Compartir': ['Share', 'Teilen', 'Partager'],
        '¡Link copiado!': ['Link copied!', 'Link kopiert!', 'Lien copié !'],
        'FUERA DE CARTA EN PIZARRA': ['OFF-MENU SPECIALS ON THE BOARD', 'TAGESANGEBOTE AN DER TAFEL', 'SUGGESTIONS DU JOUR À L’ARDOISE'],
        'Escribir email': ['Write an email', 'E-Mail schreiben', 'Écrire un e-mail'],
        'Abrir en Gmail': ['Open in Gmail', 'In Gmail öffnen', 'Ouvrir dans Gmail'],
        'Copiar dirección': ['Copy address', 'Adresse kopieren', 'Copier l’adresse'],
        '¡Copiada!': ['Copied!', 'Kopiert!', 'Copiée !'],

        // Pedidos (table-ordering.js)
        'Esperando confirmación': ['Waiting for confirmation', 'Wartet auf Bestätigung', 'En attente de confirmation'],
        'En preparación': ['Being prepared', 'In Zubereitung', 'En préparation'],
        '¡Listo! Ya sale': ['Ready! On its way', 'Fertig! Kommt gleich', 'Prêt ! Ça arrive'],
        'Entregado': ['Delivered', 'Serviert', 'Servi'],
        'No aceptado — consultá al mozo': ['Not accepted — please ask the waiter', 'Nicht angenommen — bitte fragen Sie die Bedienung', 'Non acceptée — demandez au serveur'],
        'No aceptado — contactanos': ['Not accepted — please contact us', 'Nicht angenommen — bitte kontaktieren Sie uns', 'Non acceptée — contactez-nous'],
        'Agregar al pedido': ['Add to order', 'Zur Bestellung hinzufügen', 'Ajouter à la commande'],
        'Quitar uno del pedido': ['Remove one from the order', 'Eins aus der Bestellung entfernen', 'Retirer un de la commande'],
        'Quitar uno': ['Remove one', 'Eins entfernen', 'Retirer un'],
        'Agregar uno': ['Add one', 'Eins hinzufügen', 'Ajouter un'],
        'Cerrar': ['Close', 'Schließen', 'Fermer'],
        'Por ahora no podemos recibir más pedidos. Vas a poder volver a pedir desde el {hasta}.': [
            'We can’t take more orders for now. You’ll be able to order again from {hasta}.',
            'Wir können derzeit keine Bestellungen mehr annehmen. Sie können ab {hasta} wieder bestellen.',
            'Nous ne pouvons plus prendre de commandes pour le moment. Vous pourrez commander à nouveau à partir du {hasta}.'],
        'Por ahora no estamos tomando pedidos. Volvemos el {hasta}.': [
            'We’re not taking orders right now. We’ll be back on {hasta}.',
            'Wir nehmen gerade keine Bestellungen an. Wir sind ab {hasta} wieder da.',
            'Nous ne prenons pas de commandes pour le moment. Retour le {hasta}.'],
        'Pedido de {name} · Agregá productos tocando {plus}': ['{name}’s order · Add products by tapping {plus}', 'Bestellung von {name} · Produkte mit {plus} hinzufügen', 'Commande de {name} · Ajoutez des produits avec {plus}'],
        'Te confirmamos el pedido en breve': ['We’ll confirm your order shortly', 'Wir bestätigen Ihre Bestellung in Kürze', 'Nous confirmons votre commande sous peu'],
        '{name} · Pedí desde acá tocando {plus}': ['{name} · Order from here by tapping {plus}', '{name} · Bestellen Sie hier mit {plus}', '{name} · Commandez d’ici avec {plus}'],
        'El mozo confirma tu primer pedido': ['The waiter confirms your first order', 'Die Bedienung bestätigt Ihre erste Bestellung', 'Le serveur confirme votre première commande'],
        'Pedidos': ['Orders', 'Bestellungen', 'Commandes'],
        'Pedidos cerrados por ahora': ['Orders closed for now', 'Bestellungen derzeit geschlossen', 'Commandes fermées pour le moment'],
        'Ver pedido · {n} producto': ['View order · {n} item', 'Bestellung ansehen · {n} Produkt', 'Voir la commande · {n} produit'],
        'Ver pedido · {n} productos': ['View order · {n} items', 'Bestellung ansehen · {n} Produkte', 'Voir la commande · {n} produits'],
        'Agregá productos con +': ['Add products with +', 'Produkte mit + hinzufügen', 'Ajoutez des produits avec +'],
        'Tu pedido': ['Your order', 'Ihre Bestellung', 'Votre commande'],
        'Tu pedido · {mesa}': ['Your order · {mesa}', 'Ihre Bestellung · {mesa}', 'Votre commande · {mesa}'],
        '¿Alguna restricción? (opcional)': ['Any dietary restrictions? (optional)', 'Ernährungseinschränkungen? (optional)', 'Des restrictions alimentaires ? (facultatif)'],
        'Otras aclaraciones (opcional)': ['Other notes (optional)', 'Weitere Hinweise (optional)', 'Autres précisions (facultatif)'],
        'Ej: leche de almendras, la carne bien cocida…': ['E.g. almond milk, meat well done…', 'Z. B. Mandelmilch, Fleisch durchgebraten…', 'Ex. : lait d’amande, viande bien cuite…'],
        'Tu nombre': ['Your name', 'Ihr Name', 'Votre nom'],
        '¿A nombre de quién?': ['Who is the order for?', 'Auf welchen Namen?', 'Au nom de qui ?'],
        'Total': ['Total', 'Gesamt', 'Total'],
        'Pagás al final, en el local.': ['You pay at the end, at the venue.', 'Sie bezahlen am Ende vor Ort.', 'Vous payez à la fin, sur place.'],
        'Enviar pedido': ['Send order', 'Bestellung senden', 'Envoyer la commande'],
        'Tu navegador no permite compartir la ubicación.': ['Your browser doesn’t allow sharing your location.', 'Ihr Browser erlaubt keine Standortfreigabe.', 'Votre navigateur ne permet pas de partager la position.'],
        'Para pedir desde la mesa tenés que permitir el acceso a tu ubicación (lo usamos solo para confirmar que estás en el local).': [
            'To order from the table you need to allow access to your location (we only use it to confirm you are at the venue).',
            'Um vom Tisch aus zu bestellen, müssen Sie den Zugriff auf Ihren Standort erlauben (wir nutzen ihn nur, um zu bestätigen, dass Sie vor Ort sind).',
            'Pour commander depuis la table, vous devez autoriser l’accès à votre position (nous l’utilisons uniquement pour confirmer que vous êtes sur place).'],
        'No pudimos obtener tu ubicación. Activá el GPS e intentá de nuevo.': ['We couldn’t get your location. Turn on GPS and try again.', 'Wir konnten Ihren Standort nicht ermitteln. Aktivieren Sie GPS und versuchen Sie es erneut.', 'Nous n’avons pas pu obtenir votre position. Activez le GPS et réessayez.'],
        'Escribí tu nombre para enviar el pedido.': ['Enter your name to send the order.', 'Geben Sie Ihren Namen ein, um die Bestellung zu senden.', 'Indiquez votre nom pour envoyer la commande.'],
        'Enviando…': ['Sending…', 'Wird gesendet…', 'Envoi…'],
        'Verificando ubicación…': ['Checking location…', 'Standort wird geprüft…', 'Vérification de la position…'],
        'No se pudo enviar el pedido.': ['The order couldn’t be sent.', 'Die Bestellung konnte nicht gesendet werden.', 'La commande n’a pas pu être envoyée.'],
        '¡Pedido enviado!': ['Order sent!', 'Bestellung gesendet!', 'Commande envoyée !'],
        'El equipo lo confirma en un momento y pasa a cocina.': ['The team will confirm it in a moment and send it to the kitchen.', 'Das Team bestätigt sie gleich und gibt sie an die Küche weiter.', 'L’équipe la confirme dans un instant et l’envoie en cuisine.'],
        'Ya está en cocina.': ['It’s already in the kitchen.', 'Sie ist bereits in der Küche.', 'Elle est déjà en cuisine.'],
        'Podés seguir su estado en <b>Pedidos</b>.': ['You can follow its status in <b>Orders</b>.', 'Den Status sehen Sie unter <b>Bestellungen</b>.', 'Vous pouvez suivre son statut dans <b>Commandes</b>.'],
        'Seguir mirando el menú': ['Keep browsing the menu', 'Weiter in der Speisekarte stöbern', 'Continuer à parcourir la carte'],
        'Cargando…': ['Loading…', 'Wird geladen…', 'Chargement…'],
        'No se cobra': ['Not charged', 'Wird nicht berechnet', 'Non facturé'],
        'Subtotal': ['Subtotal', 'Zwischensumme', 'Sous-total'],
        'Todavía no hiciste pedidos desde este celular.': ['You haven’t ordered from this phone yet.', 'Sie haben von diesem Handy aus noch nicht bestellt.', 'Vous n’avez pas encore commandé depuis ce téléphone.'],
        'Pedido #{n}': ['Order #{n}', 'Bestellung #{n}', 'Commande n° {n}'],
        'Pedido #{n}: {status}': ['Order #{n}: {status}', 'Bestellung #{n}: {status}', 'Commande n° {n} : {status}'],
        'Tu total': ['Your total', 'Ihre Summe', 'Votre total'],
        'Cargando los pedidos…': ['Loading orders…', 'Bestellungen werden geladen…', 'Chargement des commandes…'],
        'Cargando los pedidos de la mesa…': ['Loading the table’s orders…', 'Bestellungen des Tisches werden geladen…', 'Chargement des commandes de la table…'],
        'Todavía no hay pedidos de {name}.': ['No orders from {name} yet.', 'Noch keine Bestellungen von {name}.', 'Pas encore de commandes de {name}.'],
        'Todavía no hay pedidos en esta mesa.': ['No orders at this table yet.', 'Noch keine Bestellungen an diesem Tisch.', 'Pas encore de commandes à cette table.'],
        'Sin nombre': ['No name', 'Ohne Namen', 'Sans nom'],
        '(vos)': ['(you)', '(Sie)', '(vous)'],
        'Total de la mesa': ['Table total', 'Summe des Tisches', 'Total de la table'],
        'No se pudieron cargar los pedidos.': ['The orders couldn’t be loaded.', 'Die Bestellungen konnten nicht geladen werden.', 'Les commandes n’ont pas pu être chargées.'],
        'Sin conexión. Reintentando…': ['No connection. Retrying…', 'Keine Verbindung. Neuer Versuch…', 'Pas de connexion. Nouvelle tentative…'],
        'Pedidos · {mesa}': ['Orders · {mesa}', 'Bestellungen · {mesa}', 'Commandes · {mesa}'],
        'Mis pedidos': ['My orders', 'Meine Bestellungen', 'Mes commandes'],
        'Pedidos de {name}': ['{name}’s orders', 'Bestellungen von {name}', 'Commandes de {name}'],
        'Pedidos de la mesa': ['Table orders', 'Bestellungen des Tisches', 'Commandes de la table'],

        // Restricciones (Js/restrictions.js)
        'Sin TACC': ['Gluten-free', 'Glutenfrei', 'Sans gluten'],
        'Sin lactosa': ['Lactose-free', 'Laktosefrei', 'Sans lactose'],
        'Vegano': ['Vegan', 'Vegan', 'Végétalien'],
        'Vegetariano': ['Vegetarian', 'Vegetarisch', 'Végétarien'],
        'Sin azúcar': ['Sugar-free', 'Zuckerfrei', 'Sans sucre'],
        'Sin frutos secos': ['Nut-free', 'Ohne Nüsse', 'Sans fruits à coque'],
        'Sin huevo': ['Egg-free', 'Ohne Ei', 'Sans œuf'],
        'Sin pescado ni mariscos': ['No fish or seafood', 'Ohne Fisch und Meeresfrüchte', 'Sans poisson ni fruits de mer'],
    };
    const IDX = { en: 0, de: 1, fr: 2 };

    const lsGet = k => { try { return localStorage.getItem(k); } catch { return null; } };
    const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch { /* modo privado */ } };

    // Primera visita: el idioma del celular si es uno de los disponibles
    function initialLang() {
        const saved = lsGet(LANG_KEY);
        if (LANGS.some(l => l.id === saved)) return saved;
        const nav = (navigator.languages || [navigator.language || 'es']).map(x => String(x).slice(0, 2).toLowerCase());
        return nav.find(x => LANGS.some(l => l.id === x)) || 'es';
    }
    // preferred: lo que eligió (o el idioma del celular); lang: lo que se muestra en ESTE menú, que solo
    // puede ser un idioma habilitado por el restaurante (styles.menuLangs). Hasta saberlo, español:
    // así no se pide (ni se gasta) ninguna traducción que el restaurante no ofrece.
    let preferred = initialLang();
    let lang = 'es';
    let allowed = ['es'];

    // Texto fijo traducido; {var} se reemplaza con vars (los valores no se escapan: escaparlos antes)
    function t(es, vars) {
        let s = lang !== 'es' && DICT[es] ? DICT[es][IDX[lang]] : es;
        if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => k in vars ? vars[k] : m);
        return s;
    }

    // ── Textos del restaurante ────────────────────────────────
    const restaurantId = new URLSearchParams(location.search).get('r');
    let content = {};                  // { textoOriginal: traducción } del idioma actual
    let contentState = 'idle';         // idle | loading | ready | error
    let requestSeq = 0;
    const cacheKey = l => `menu_tr_${restaurantId}_${l}`;

    async function loadContent() {
        const seq = ++requestSeq;
        if (lang === 'es' || !restaurantId) { content = {}; contentState = 'idle'; emit(); return; }
        // Lo guardado en esta visita se muestra al instante; igual se pide la versión actual
        try { content = JSON.parse(sessionStorage.getItem(cacheKey(lang))) || {}; } catch { content = {}; }
        contentState = Object.keys(content).length ? 'ready' : 'loading';
        emit();
        try {
            const r = await fetch(`${FUNCTIONS_BASE}/translateMenu`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ r: restaurantId, lang }),
            });
            const data = await r.json().catch(() => ({}));
            if (seq !== requestSeq) return;
            if (!r.ok || !data.map) throw new Error(data.error || 'translate');
            content = data.map;
            contentState = 'ready';
            try { sessionStorage.setItem(cacheKey(lang), JSON.stringify(content)); } catch { /* sin espacio */ }
        } catch (err) {
            if (seq !== requestSeq) return;
            console.warn('translateMenu:', err.message);
            if (contentState !== 'ready') contentState = 'error';
        }
        emit();
    }

    // Texto del restaurante en el idioma actual (si todavía no está traducido, el original).
    // Si aparece un texto nuevo (el restaurante editó el menú), se vuelve a pedir la traducción.
    // Cada texto faltante dispara a lo sumo un pedido (el servidor no traduce, por ejemplo, textos sin letras).
    let refetchTimer = null;
    const asked = new Set();
    function tc(text) {
        const key = String(text ?? '').trim();
        if (lang === 'es' || !key) return text;
        if (typeof content[key] === 'string') return content[key];
        if (contentState === 'ready' && /\p{L}/u.test(key) && !asked.has(lang + '|' + key)) {
            asked.add(lang + '|' + key);
            clearTimeout(refetchTimer);
            refetchTimer = setTimeout(loadContent, 1500);
        }
        return text;
    }

    function emit() { document.dispatchEvent(new CustomEvent('menulang', { detail: { lang, contentState } })); }

    function apply(next) {
        if (next === lang) { emit(); return; }
        lang = next;
        document.documentElement.lang = lang;
        loadContent();
    }
    function setLang(next) {
        if (!allowed.includes(next)) return;
        lsSet(LANG_KEY, next);
        preferred = next;
        apply(next);
    }
    // Idiomas que ofrece el restaurante además del español (sin configurar: inglés)
    function setAllowed(list) {
        const extra = Array.isArray(list) ? list : DEFAULT_EXTRA;
        allowed = ['es', ...LANGS.map(l => l.id).filter(id => id !== 'es' && extra.includes(id))];
        apply(allowed.includes(preferred) ? preferred : 'es');
    }

    const locale = () => LANGS.find(l => l.id === lang).locale;

    return { LANGS, langs: () => LANGS.filter(l => allowed.includes(l.id)), t, tc, setLang, setAllowed,
             lang: () => lang, locale, contentState: () => contentState };
})();
