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
| Hosting | Firebase Hosting → `maldito-cafe.web.app` |
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

**Aliases** (íconos renombrados en versiones más nuevas de Lucide):
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
    images:      { img1, img2, img3, img4, img1_layout, img1_pos, img1_height, ... }
    footer:      { notice, address, socials: [{network, url, color}] }
    categoryTitles: { 'CAFÉ DE ESPECIALIDAD': 'Título custom', ... }

users/{uid}/
  { email, displayName, lastLogin, createdAt,
    subscription: { status, planType, paidUntil, paidAt, paymentInitiated } }

appConfig/
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

1. Usuario elige plan en `checkout.html` → escribe `pending_payment` en Firestore
2. MP redirige de vuelta con `?status=approved` → `checkout.html` activa suscripción automáticamente
3. `?status=pending` → queda en `pending_payment` (superadmin confirma manualmente)
4. Plans se leen de `appConfig/plans`, con fallback a `appConfig/payments` (legacy)

---

## Gotchas conocidos

- `licon()` puede devolver `''` si el ícono no existe — fallar silenciosamente está intencional
- `textContent` borra íconos SVG — usar `innerHTML` para restaurar contenido con íconos
- `lucide.createIcons()` solo procesa `<i data-lucide>` existentes al momento del call
- Google Fonts cargadas en `admin.html` y `menu.html` — agregarlas en ambos si se suman fuentes
- `SECCIONES_CONFIG` también existe en `Js/menu-viewers.js` (copia local para el menú público)
- El helper `licon` es global vía `theme.js`, pero `checkout.html` tiene su propia copia (no carga theme.js)
