# Integración con Mercado Pago — Cubierto

Documentación del sistema de pagos automáticos implementado el 5 de junio de 2026.

---

## Arquitectura general

```
Usuario elige plan (checkout.html)
    ↓
Redirige a MP con external_reference=uid
    ↓
Usuario paga en MP
    ↓
MP llama al webhook (mpWebhook) automáticamente
    ↓
Webhook verifica el pago con la API de MP
    ↓
Activa suscripción en Firestore
```

---

## Firebase Functions desplegadas

| Función | URL | Propósito |
|---|---|---|
| `mpWebhook` | `https://mpwebhook-p3wtbixxcq-uc.a.run.app` | Recibe notificaciones de MP y activa suscripciones |
| `sendOTP` | `https://sendotp-p3wtbixxcq-uc.a.run.app` | Envía código OTP por email (SendGrid) |
| `verifyOTPAndSignIn` | `https://verifyotpandsignin-p3wtbixxcq-uc.a.run.app` | Verifica OTP y genera custom token de Firebase Auth |

Región: `us-central1` — Runtime: Node.js 24 (Gen 2)

---

## Secretos configurados en Firebase

```
MP_ACCESS_TOKEN     → Access Token de producción de Mercado Pago
MP_WEBHOOK_SECRET   → Clave secreta del webhook (generada por MP al configurar el webhook)
SENDGRID_API_KEY    → API Key de SendGrid para envío de emails OTP
```

Para actualizarlos:
```powershell
firebase functions:secrets:set MP_ACCESS_TOKEN
firebase functions:secrets:set MP_WEBHOOK_SECRET
firebase functions:secrets:set SENDGRID_API_KEY
```

---

## Webhook de Mercado Pago

### Configuración en el panel de MP

- **Panel**: mercadopago.com.ar/developers/panel → tu app → Webhooks
- **URL de producción**: `https://mpwebhook-p3wtbixxcq-uc.a.run.app`
- **Modo**: Productivo
- **Eventos**: Pagos

### Cómo funciona la validación de firma

MP envía el header `x-signature: ts=<timestamp>,v1=<hmac>` en cada request.

El webhook verifica:
```
manifest = "id:<payment_id>;request-id:<x-request-id>;ts:<timestamp>;"
expected = HMAC-SHA256(manifest, MP_WEBHOOK_SECRET)
```

Si la firma no coincide, el webhook ignora el request (pero igual responde 200 para que MP no reintente).

### Lógica de activación

1. Responde `200 OK` a MP inmediatamente
2. Verifica la firma criptográfica
3. Consulta la API de MP para confirmar que el pago está `approved`
4. Busca al usuario por `external_reference` (UID de Firebase) — o fallback por `planType + pending_payment`
5. Escribe en `users/{uid}/subscription`:
   ```json
   {
     "status": "active",
     "planType": "monthly|quarterly|...",
     "paidUntil": "<timestamp>",
     "paidAt": "<server timestamp>",
     "mpPaymentId": "<id del pago>"
   }
   ```

---

## Flujo del cliente (checkout.html)

Al hacer clic en "Pagar":
1. Escribe `subscription.status = "pending_payment"` en Firestore
2. Redirige a `plan.mpLink` con `external_reference=uid` y `payer[email]=email`
3. MP procesa el pago y redirige de vuelta a `checkout.html?status=approved`
4. `checkout.html` activa la suscripción en cliente como respaldo (doble activación)
5. El webhook también activa por server-side (fuente de verdad)

### Estados de suscripción

| Estado | Descripción |
|---|---|
| `active` | Suscripción activa |
| `pending_payment` | Pago iniciado, esperando confirmación |
| `unpaid` | Sin suscripción activa |
| `blocked` | Bloqueado por el superadmin |

---

## Configuración de planes en Firestore

Colección: `appConfig/plans`, campo `list` (array):

```json
[
  {
    "id": "monthly",
    "label": "Mensual",
    "price": 20000,
    "durationDays": 30,
    "mpLink": "https://mpago.la/xxxxx",
    "savingsLabel": "",
    "recommended": false
  },
  {
    "id": "quarterly",
    "label": "Trimestral",
    "price": 54000,
    "durationDays": 90,
    "mpLink": "https://mpago.la/yyyyy",
    "savingsLabel": "Ahorrás $6.000",
    "recommended": true
  }
]
```

Los links de pago se crean en: **mercadopago.com.ar/tools/create**

---

## Dependencias (functions/package.json)

```json
{
  "firebase-admin": "^12.7.0",
  "firebase-functions": "^6.3.0",
  "@sendgrid/mail": "^8.1.6",
  "axios": "^1.7.0"
}
```

Se usó firebase-admin v12 (no v13) para evitar dependencias nativas Linux-only (`@emnapi`) que impedían el deploy desde Windows.

---

## Comandos útiles

```powershell
# Desplegar solo functions
firebase deploy --only functions

# Ver logs del webhook
firebase functions:log --only mpWebhook

# Ver logs de OTP
firebase functions:log --only sendOTP

# Actualizar secreto
firebase functions:secrets:set MP_ACCESS_TOKEN
```

---

## Simulación de prueba

Desde el panel de MP → Webhooks → Configurar notificaciones → **Simular notificación**:
- URL: URL de producción
- Tipo de evento: Pagos
- Data ID: cualquier número

Respuesta esperada: `200 OK`
