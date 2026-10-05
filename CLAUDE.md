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
    images:      { img1..img4: URL de Storage (o base64 viejo), img1_layout, img1_height, img1_flipH,
                   encuadre: img1_pos / img1_posY (anclaje 0–100 = centro del zoom),
                   img1_shiftX / img1_shiftY (desplazamiento en % del recuadro),
                   img1_zoom (20–300, % del alto del recuadro),
                   img1_mode: text-image | text-text (2 columnas) | image-wide (imagen a lo ancho + productos debajo) }
                 ← text-text / image-wide requieren el beneficio opt-in "section_layouts" del plan
                 ← imágenes de sección en Storage: restaurants/{id}/section-imgN-{ts}.webp (≤1600 px)
    footer:      { notice, address, socials: [{network, url, color}] }
    categoryTitles: { 'CAFÉ DE ESPECIALIDAD': 'Título custom', ... }

users/{uid}/
  { email, displayName, lastLogin, createdAt,
    subscription: { status, planType, paidUntil, paidAt, paymentInitiated } }

  config/ordering:  { enabled, approvalMode: 'manual'|'direct', tableSessions, wifiCheck,
                     geo: {enabled, lat, lng, radius},
                     tables: [{id, label}], printMode: 'browser'|'epson'|'star'|'none', paperWidth }
  mesas/{tableId}:  { open, openedAt, lastActivityAt, openedBy }  ← "mesa abierta" (vence a las 6 h sin actividad)
  private/ordering: { printerKey, webhookUrl, webhookSecret, counter, counterDay, rate, knownIps }  ← solo dueño
  pedidos/{id}:     { number, mesaId, mesaLabel, items, total, note, customerName,
                     status: pendiente|en_cocina|listo|entregado|rechazado,
                     printStatus: none|queued|printing|printed }  ← los crea solo placeOrder

appConfig/
  coupons:  { list: [...] }  ← NO legible por clientes; se canjea con la function redeemCoupon
  plans:    { list: [{id, label, price, durationDays, mpLink, savingsLabel, recommended}] }
  payments: { mpLinkMonthly, mpLinkQuarterly }  ← legacy, migrar a plans
```

**Estados de suscripción**: `active` | `unpaid` | `pending_payment` | `blocked`

---

## Categorías internas (hardcodeadas)

```javascript
// En script.js — SECCIONES_CONFIG
['CAFÉ DE ESPECIALIDAD', 'CAFÉ FRÍO']   → img1
['BEBIDAS', 'EXTRAS']                   → img2
['SALADOS', 'LAMINADOS']                → img3
['DULCES']                              → img4
```

Los **títulos visibles** se pueden personalizar y se guardan en `config/categoryTitles`.
Los nombres internos nunca cambian (son las claves en productos de Firestore).

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

1. `checkout.html` llama a la function `createPayment` → crea preferencia de Checkout Pro con
   el precio de `appConfig/plans` y `external_reference = "uid|planId"` → redirige a `init_point`
2. `mpWebhook` (firma HMAC obligatoria) consulta el pago a la API de MP y activa/extiende el plan
3. Al volver, `checkout.html` llama a `checkPayment` (respaldo del webhook; nunca confía en `?status=`)
4. Pagos que no se pueden asociar quedan en la colección `unmatchedPayments`
5. `mpLink` en los planes es legacy: ya no se usa

## Pedidos en mesa (beneficio `table_orders`, opt-in por plan)

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
