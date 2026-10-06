# CLAUDE.md — Maldito Menú / Cubierto

Guía de referencia rápida para Claude Code. Leer esto antes de explorar archivos.

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | HTML + JS vanilla (sin bundler) |
| Auth | Firebase Auth (Google Sign-In) |
| DB | Firestore (multi-tenant) |
| Storage | Firebase Storage (logos/favicons) |
| Hosting | Firebase Hosting → **`cubierto.menu`** (los dominios `maldito-cafe.*` redirigen por JS; no mostrar "Maldito" en nada visible) |
| Pagos | Mercado Pago (redirect + webhook client-side) |
| Íconos | **Lucide Icons v0.309.0** via jsDelivr CDN |
| Fuentes | Google Fonts (Playfair Display, Cinzel, Lobster, etc.) |

---

## Archivos clave

```
admin.html          Panel del restaurante (tenant) — edita menú, estilos, logo, redes
script.js           Toda la lógica del admin (47KB+)
superadmin.html     Panel del dueño del SaaS (frivasv2388@gmail.com)
dashboard.html      Lista de restaurantes del usuario
Js/dashboard.js     Lógica del dashboard
Js/menu-viewers.js  Menú público (solo lectura, listeners Firestore en tiempo real)
menu.html           Menú público del restaurante
checkout.html       Pantalla de pago / selección de plan
login.html          Login con Google
styles.css          Estilos del admin + superadmin (dark/light mode)
Css/menu-styles.css Estilos del menú público (CSS variables)
Js/theme.js         Toggle dark/light + helper licon() global
Js/firebase-config.js Config de Firebase (compartida)
pedidos.html        Pedidos en mesa (restaurante): tablero/comandera, mesas QR/NFC, config
Js/pedidos.js       Lógica de pedidos.html (impresión desde navegador, QR, Web NFC)
Js/table-ordering.js Carrito del comensal en menu.html (se activa con ?mesa=)
functions/index.js  Cloud Functions: OTP, pagos MP, cupones, placeOrder, printerPoll
```

---

## Íconos — Lucide v0.309.0

**IMPORTANTE**: En v0.309.0, `createElement` recibe la **definición** del ícono, no un string.

```javascript
// ✅ Correcto
const def = lucide['Sun'];          // PascalCase lookup
const el  = lucide.createElement(def);

// ❌ Incorrecto — falla silenciosamente
lucide.createElement('sun');
```

El helper `licon(name, size)` en `Js/theme.js` maneja esto automáticamente y es **global** en todas las páginas que carguen theme.js. Para checkout.html (que no carga theme.js) hay una copia local idéntica.

```javascript
licon('sun', 16)          // → SVG string listo para innerHTML
licon('trash-2', 13)      // kebab-case, se convierte a PascalCase internamente
```

**Aliases** (íconos renombrados en versiones más nuevas de Lucide). Ojo: los nombres nuevos NO existen en
v0.309, por eso `licon` prueba el alias y si no existe cae al nombre original:
```javascript
'check-circle-2' → 'circle-check-big'
'x-circle'       → 'circle-x'
'alert-triangle' → 'triangle-alert'
```

Para HTML estático usar `<i data-lucide="name"></i>` + llamar `lucide.createIcons()` en DOMContentLoaded.

---

## Firestore — Estructura multi-tenant

```
restaurants/{restaurantId}/
  productos/          ← items del menú
    {docId}: { nombre, precio, categoria, descripcion, orden, ordenProducto }

  config/
    styles:      { fontFamily, titleFontFamily, fontSize, titleFontSize,
                   titleColor, textColor, bgPage, bgMenu, headerMode,
                   logoBase64, logoStorageUrl, faviconBase64, faviconStorageUrl,
                   logoSize, logoOpacity }
    images:      { (img1..img4 viejos: se migran solos a imageData al abrir el editor),
                   img1_layout, img1_height, img1_flipH,
                   encuadre: img1_pos / img1_posY (anclaje 0–100 = centro del zoom),
                   img1_shiftX / img1_shiftY (desplazamiento en % del recuadro),
                   img1_zoom (20–300, % del alto del recuadro),
                   img1_mode: text-image | text-text (2 columnas) | image-wide (SOLO imagen a lo ancho; sus productos no se muestran) }
                 ← text-text / image-wide requieren el beneficio opt-in "section_layouts" del plan
    images.sections: [{ key: 'img1', cats: ['CAFÉ DE ESPECIALIDAD'] }, { key: 'img5', cats: ['c_lx2k9a', …] }, …]
                 ← secciones dinámicas EN ORDEN (botón "+" agrega imgN nuevas, nunca reutiliza una clave);
                   cada sección tiene 1+ títulos (cats) con sus productos. Sin este campo (restaurantes
                   anteriores) se arma desde SECCIONES_CONFIG + images.sectionOrder (que se sigue escribiendo)
                 ← imágenes de sección en Storage: restaurants/{id}/section-imgN-{ts}.webp (≤1600 px)
    footer:      { notice, address, socials: [{network, url, color}] }
    categoryTitles: { 'CAFÉ DE ESPECIALIDAD': 'Entradas', c_lx2k9a: 'Pastas', c_x: '' }  ← '' = sin encabezado

users/{uid}/
  { email, displayName, lastLogin, createdAt,
    subscription: { status: trial|active|unpaid|pending_payment|blocked, planType (id de nivel), period,
                    paidUntil, trialEndsAt, trialUsed, scheduled: { planType, period, startsAt }, coupon,
                    mpPaymentId, paidAt, paymentInitiated } }
    ← estado efectivo: subscriptionInfo() en Js/benefits-config.js (= effectiveSub() en functions)

  imageData/{imgN}: { src }       ← cada imagen de sección en SU PROPIO documento (límite 1 MB c/u;
                                     antes iban todas juntas en config/images y MALIK llegó a 1022 KB)
  config/ordering:  { enabled, businessType: 'restaurant'|'catering', approvalMode: 'manual'|'direct', tableSessions, wifiCheck,
                     limits: { enabled, max, period: 'day'|'week'|'hours', hours, message }, pause: { until, message },
                     capacityFullUntil (lo escribe placeOrder al llenarse),
                     geo: {enabled, lat, lng, radius},
                     tables: [{id, label}], printMode: 'browser'|'epson'|'star'|'none', paperWidth }
  mesas/{tableId}:  { open, openedAt, lastActivityAt, openedBy }  ← "mesa abierta" (vence a las 6 h sin actividad)
  private/ordering: { printerKey, webhookUrl, webhookSecret, counter, counterDay, rate, knownIps }  ← solo dueño
  pedidos/{id}:     { number, mesaId, mesaLabel, items, total, note, customerName,
                     status: pendiente|en_cocina|listo|entregado|rechazado,
                     printStatus: none|queued|printing|printed }  ← los crea solo placeOrder

appConfig/
  coupons:  { list: [...] }  ← NO legible por clientes; se canjea con la function redeemCoupon
  plans:    { tiers: [{ id, label, monthlyPrice, benefits, recommended }],
              periods: { monthly|quarterly|annual|biennial: { discount, enabled } } }
            ← precio = mensual × meses × (1 − descuento). El formato viejo { list } se convierte solo (normalizePlans)
  support:  { email, whatsapp, hours }  ← botón "Soporte" del dashboard (se edita en el superadmin)
  payments: { mpLinkMonthly, mpLinkQuarterly }  ← legacy, migrar a plans
```

**Estados de suscripción**: `trial` | `active` | `unpaid` | `pending_payment` | `blocked`

paymentQuotes/{id}: { uid, tierId, period, kind: new|renew|upgrade, amount, usedAt, paymentId } ← solo servidor

---

## Secciones y categorías

Las 4 secciones iniciales (y sus categorías viejas) siguen en `SECCIONES_CONFIG`, solo como punto de partida
y para los restaurantes que todavía no tienen `config/images.sections`:

```javascript
// En script.js — SECCIONES_CONFIG (copia en Js/menu-viewers.js)
['CAFÉ DE ESPECIALIDAD', 'CAFÉ FRÍO']   → img1
['BEBIDAS', 'EXTRAS']                   → img2
['SALADOS', 'LAMINADOS']                → img3
['DULCES']                              → img4
```

- Las categorías nuevas usan claves `c_xxxx` (`newCatKey()`); la clave es `productos.categoria` y nunca cambia.
- El texto visible está en `config/categoryTitles`. Sin título guardado: las categorías viejas muestran su
  nombre (como siempre) y el editor propone uno genérico (`DEFAULT_TITLES`) si están vacías.
  "Guardar Menú" guarda todos los títulos tal cual se ven en el editor.
- Sin el beneficio `extra_sections` el editor solo muestra img1 e img2; el resto se conserva intacto.

---

## CSS Variables (menu-styles.css)

```css
--main-font-family   /* fuente del cuerpo */
--title-font-family  /* fuente de títulos h2 */
--text-color         /* color productos */
--title-color        /* color títulos */
--primary-color      /* fondo del menú */
--bg-page            /* fondo de página */
--base-font-size     /* tamaño fuente cuerpo */
--title-font-size    /* tamaño fuente títulos */
--logo-size          /* ancho máximo del logo */
--logo-opacity       /* opacidad del logo */
```

---

## Patrones frecuentes

### Guardar un campo de estilo
```javascript
await restRef().collection('config').doc('styles').set({ [key]: value }, { merge: true });
// Helper ya disponible:
await saveStyleField('titleColor', '#7C6C5C');
```

### Guardar un título de categoría
```javascript
await saveCategoryTitle('CAFÉ DE ESPECIALIDAD', 'Mi Café');
```

### Renderizar después de cambio dinámico
`renderSocialsEditor()`, `renderPlans()`, `renderTable()`, `renderStats()` — todas re-renderizan su sección.

### Preview mode (superadmin impersonando cliente)
URL: `admin.html?r={id}&readonly=1`  
CSS: `body.preview-mode` deshabilita todos los controles.

---

## Auth

- **Superadmin**: `frivasv2388@gmail.com` — único usuario con acceso a `superadmin.html`
- **Tenants**: cualquier cuenta Google con restaurante en Firestore
- El admin verifica `restDoc.data().ownerId === user.uid` (o superadmin bypass)

---

## Light mode

Clase `body.light` agregada por `Js/theme.js` al cargar (lee localStorage).  
Todos los overrides en `styles.css` bajo `body.light .clase { ... }`.  
Los inputs hardcodeados con `background: #111` necesitan override `body.light` para funcionar.

---

## Flujo de pago (Mercado Pago)

**`users/{uid}.subscription` solo la escribe el servidor** (o el superadmin) — las reglas lo bloquean al cliente.

- **Prueba gratis**: 14 días con todo incluido (`startTrial`, una vez por cuenta, la piden dashboard/admin).
  Al vencer, el editor manda al checkout; el menú público sigue visible.
- **Cambios de plan** (`quotePurchase` en functions): sin plan/en prueba/vencido → `new` (en prueba arranca
  al terminar la prueba); activo + nivel más caro → `upgrade` inmediato pagando la diferencia proporcional a los
  días restantes (vencimiento igual; < $100 se aplica sin cobrar); activo + mismo nivel, más barato u otro
  período → `renew`: se suma al final y el cambio queda en `subscription.scheduled` hasta esa fecha.

- **Débito automático** (Mercado Pago Suscripciones / preapproval): altas, renovaciones, downgrades y cambios de
  período van por `subscribe` (con `preview: true` solo cotiza). `billingSubs/{id}` + `subscription.billing`;
  `external_reference = "uid|s|billingSubId"`. Cada débito aprobado (`applyRecurringCharge`, idempotente por
  `processedPayments/{paymentId}`) extiende `paidUntil` un período. Downgrade con el mismo período = PUT del monto
  del preapproval (rige el próximo débito); cambio de período = preapproval nuevo que arranca al terminar lo pagado
  (al autorizarse se cancela el anterior). Débito fallido → `billing.lastFailureAt`, **5 días de gracia** (GRACE_MS /
  GRACE_DAYS) antes de bloquear la edición. En prueba, el primer débito es el día que termina. `cancelSubscription`
  cancela la renovación (el plan sigue hasta el vencimiento). El webhook de MP tiene que tener activados los temas de
  pagos y de suscripciones (subscription_preapproval y subscription_authorized_payment).
- `createPayment` solo cobra la **diferencia de un upgrade** (pago único) y después ajusta el monto de los débitos.

1. `checkout.html` llama a `createPayment {planId, period}` (con `preview: true` solo cotiza) → guarda la
   cotización en `paymentQuotes` y crea la preferencia con `external_reference = "uid|q|quoteId"`
2. `mpWebhook` (firma HMAC obligatoria) consulta el pago a la API de MP y aplica la cotización (idempotente:
   la cotización guarda el paymentId; un pago menor o una cotización reusada van a `unmatchedPayments`)
3. Al volver, `checkout.html` llama a `checkPayment` (respaldo del webhook; nunca confía en `?status=`)
4. Pagos que no se pueden asociar quedan en la colección `unmatchedPayments`
5. `mpLink` en los planes es legacy: ya no se usa

## Pedidos en mesa (beneficio `table_orders`, opt-in por plan)

- **Catering** (`businessType: 'catering'`): las mesas son clientes ("Pedido de Marcela"), sin verificación de
  presencia; los pedidos llevan `kind: 'catering'`. **Límite y pausa** valen para ambos tipos y los aplica placeOrder
  en la transacción (los rechazados no cuentan); `{hasta}` en el mensaje = fecha de reapertura.
- Nombre del comensal obligatorio (cliente y placeOrder).

- URL de mesa: `menu.html?r={id}&mesa={tableId}` (mismo link en QR y sticker NFC)
- `placeOrder` valida plan del dueño, mesa, precios desde Firestore y límite por mesa
- Verificación de presencia, en orden: mesa abierta → mismo Wi-Fi que el tablero (IP registrada por
  `registerDevice` cada 5 min, válida 30 min; IPv6 se compara por prefijo /64) → GPS (solo si lo anterior falla).
  Va directo a cocina si la mesa está abierta, o si el modo es `direct` y se verificó por Wi-Fi/GPS.
  Si no, queda `pendiente`; al aceptarlo el mozo, la mesa se abre.
- La IP del cliente es la ÚLTIMA entrada de X-Forwarded-For (las anteriores las puede falsificar el cliente)
- Comanderas: navegador (cualquier impresora, `--kiosk-printing`), Epson Server Direct Print y
  Star CloudPRNT vía `printerPoll?r=&k=&t=epson|star`, y webhook firmado para POS (`onOrderWritten`)

---

## Gotchas conocidos

- `licon()` puede devolver `''` si el ícono no existe — fallar silenciosamente está intencional
- `textContent` borra íconos SVG — usar `innerHTML` para restaurar contenido con íconos
- `lucide.createIcons()` solo procesa `<i data-lucide>` existentes al momento del call
- Google Fonts cargadas en `admin.html` y `menu.html` — agregarlas en ambos si se suman fuentes
- `SECCIONES_CONFIG` también existe en `Js/menu-viewers.js` (copia local para el menú público)
- El helper `licon` es global vía `theme.js`, pero `checkout.html` tiene su propia copia (no carga theme.js)
