# PAYMENT.md

> Module: Payments
> Version: 1.0
> Status: Final (mock provider active, PayMongo adapter ready)
> Depends On:
>
> - authentication.md
> - clinic.md
> - appointment.md

---

# Overview

The Payment module collects the clinic's consultation fee **before** an
appointment exists.

A Receptionist (web) or an Owner (mobile) creates a *checkout* for a chosen
slot. When the payment reaches `PAID` it may be attached to exactly one
appointment; the booking endpoints refuse to create an appointment without it
whenever the clinic's fee is greater than zero.

Every Payment belongs to exactly one Clinic and one Owner.

---

# Entity

## PAYMENT

Purpose

Stores one attempt to collect the consultation fee.

`APT_ID` is a one-to-one column, so a payment can never pay for two
appointments.

## Attributes

| Column | Type | Constraints |
|---------|------|-------------|
| PAY_ID | UUID | PK |
| PAY_REFERENCE | VARCHAR(40) | NOT NULL, UNIQUE |
| CLN_ID | UUID | FK → CLINIC |
| OWN_ID | UUID | FK → OWNER_PROFILE |
| APT_ID | UUID | FK → APPOINTMENT, NULLABLE, UNIQUE |
| PAY_AMOUNT | DECIMAL(10,2) | NOT NULL |
| PAY_CURRENCY | CHAR(3) | NOT NULL, DEFAULT 'PHP' |
| PAY_METHOD | ENUM | NOT NULL |
| PAY_STATUS | ENUM | NOT NULL, DEFAULT 'PENDING' |
| PAY_PROVIDER | ENUM | NOT NULL |
| PAY_PROVIDER_REF | VARCHAR(64) | NULL |
| PAY_CHECKOUT_URL | TEXT | NULL |
| PAY_EXPIRES_AT | TIMESTAMP | NULL |
| PAY_PAID_AT | TIMESTAMP | NULL |
| PAY_FAILURE_REASON | TEXT | NULL |
| PAY_METADATA | JSON | DEFAULT '{}' |
| PAY_CREATED_AT | TIMESTAMP | DEFAULT NOW() |
| PAY_UPDATED_AT | TIMESTAMP | DEFAULT NOW() |

`PAY_REFERENCE` is the human-readable receipt number shown on receipts and
used as PayMongo's `reference_number` (format `XPS-YYYYMMDD-XXXXXX`).

`PAY_METADATA` snapshots the booking context (pet, slot, appointment type,
booking channel) so the record stays meaningful after checkout.

---

## PAYMENT_EVENT

Purpose

Append-only history of every state change.

`(PAY_ID, EVT_TYPE)` is unique, which makes provider webhook retries
idempotent.

## Attributes

| Column | Type | Constraints |
|---------|------|-------------|
| EVT_ID | UUID | PK |
| PAY_ID | UUID | FK → PAYMENT |
| EVT_TYPE | ENUM | NOT NULL |
| EVT_PAYLOAD | JSON | DEFAULT '{}' |
| EVT_CREATED_AT | TIMESTAMP | DEFAULT NOW() |

---

# Enums

PAY_STATUS

- `PENDING` – checkout created, not paid yet
- `PAID` – money collected; the payment can be attached to an appointment
- `FAILED` – gateway declined the payment
- `EXPIRED` – the checkout window (`PAY_EXPIRES_AT`) closed
- `REFUNDED` – money returned (phase 3)
- `VOID` – an unpaid checkout was cancelled

PAY_METHOD

- `GCASH`
- `CARD`
- `CASH` – recorded by clinic staff at the counter; never available to owners

PAY_PROVIDER

- `MOCK` – signed checkout page served by the web app (default)
- `PAYMONGO` – PayMongo hosted checkout
- `CASH` – no gateway involved

---

# State Transitions

```
PENDING ── success ──▶ PAID ──▶ REFUNDED   (phase 3)
   │
   ├── decline ──────▶ FAILED
   ├── TTL / expire ─▶ EXPIRED
   └── cancel ───────▶ VOID
```

A payment becomes linked to an appointment only from `PAID`, and only once.

---

# Configuration

| Setting | Default | Meaning |
|---------|---------|---------|
| `PAYMENT_MODE` | `mock` | `mock` or `paymongo` |
| `PAYMENT_CURRENCY` | `PHP` | Currency used for new payments |
| `PAYMENT_CHECKOUT_TTL_MINUTES` | `30` | Checkout lifetime |
| `PAYMONGO_SECRET_KEY` | empty | `sk_test_...` / `sk_live_...` |
| `PAYMONGO_WEBHOOK_SECRET` | empty | Verifies `Paymongo-Signature` |
| `PAYMONGO_API_URL` | `https://api.paymongo.com` | Gateway base URL |

The fee itself is per clinic: `CLINIC_SETTINGS.CLS_CONSULTATION_FEE`
(DECIMAL(10,2), default `0.00`). **A fee of `0.00` disables the payment gate**
— booking works exactly as before.

`FRONTEND_URL` builds the mock `checkout_url`, so it must be a host the paying
device can reach: use a real hostname (or your machine's LAN address in local
development), not `localhost`, when the checkout is opened from a phone.

---

# Booking Gate

Both booking endpoints accept an optional `pay_id`:

- `POST /api/appointments/` (receptionist, web)
- `POST /api/owner/appointments/` (owner, mobile)

When the clinic fee is `0`, `pay_id` is ignored. When it is greater than `0`
the payment must be `PAID`, belong to the same clinic and owner, cover at
least the current fee, and not be attached yet. Otherwise the request fails
with:

```json
{
  "detail": "This clinic requires payment before an appointment can be booked.",
  "code": "PAYMENT_REQUIRED",
  "amount": 500.0,
  "currency": "PHP"
}
```

The payment row and the appointment are written in one transaction, so a
failed booking never consumes the payment.

---

# Owner Surface

The owner app never sees clinic-wide data:

| Endpoint | Purpose |
|----------|---------|
| `GET /api/owner/clinics/` | Clinic list with `consultation_fee`, so the booking wizard can show the amount before checkout |
| `POST /api/payments/checkout/` | Create the payment (`GCASH`/`CARD` only, `screening_id` required) |
| `GET /api/payments/{id}/` | Poll one payment until it settles |
| `GET /api/owner/payments/` | Own receipts; `?status=PENDING` finds an abandoned checkout to resume |
| `POST /api/payments/{id}/cancel/` | Discard an unpaid checkout |

Settlement and expiry also write an owner notification
(`PAYMENT_COMPLETED`, `PAYMENT_EXPIRED`, `NTF_REFERENCE_TABLE = 'PAYMENT'`), so
money that moved without the owner watching the screen is never a surprise.

---

# Providers

## Mock (`PAYMENT_MODE=mock`)

Creates a real route in the web app:

```
{FRONTEND_URL}/payments/mock/{PAY_REFERENCE}?token={signed-token}
```

The token is produced with `django.core.signing` and expires with the
checkout, so only holders of the link can read or confirm the payment.

## PayMongo (`PAYMENT_MODE=paymongo`)

- `POST /v2/checkout_sessions` with HTTP basic auth (`sk_...` as username)
- redirects the payer to `data.attributes.checkout_url`
- returns them to `{FRONTEND_URL}/payments/success/{PAY_REFERENCE}` or
  `{FRONTEND_URL}/payments/cancelled/{PAY_REFERENCE}` (informational pages only;
  the webhook is what settles the payment)
- confirmation arrives on `POST /api/payments/webhooks/paymongo/`, authenticated
  with `Paymongo-Signature: t=...,te=...,li=...`
  (`HMAC-SHA256(secret, "{t}.{raw_body}")`, constant-time compared)
- v2 nests the session under `data.data.attributes`, so `reference_number`
  lives one level below the event, not under `data.attributes`

### Switching from mock

1. `PAYMENT_MODE=paymongo` in the backend environment.
2. `PAYMONGO_SECRET_KEY=sk_test_...` from Dashboard → Developers → API Keys.
3. `PAYMONGO_WEBHOOK_SECRET=whsec_...` — mandatory when `DEBUG=False`; the app
   refuses to boot without it.
4. Register the webhook in the dashboard against
   `https://<api-host>/api/payments/webhooks/paymongo/` for
   `checkout_session.payment.paid`, `checkout_session.payment.failed` and
   `checkout_session.expired`.
5. `FRONTEND_URL` must be the public web app URL, because the success/cancel
   redirects are built from it.

Mock remains a supported fallback: set `PAYMENT_MODE=mock` to switch back. The
provider is recorded per payment row, so links already issued as mock still
settle after a switch, and vice versa.

### Test mode

`sk_test_`/`pk_test_` keys are available immediately after signup and move no
real money. Cards: `4343434343434345` (success), `4111111111111111` (decline),
`4200000000000018` (expired) with any future expiry and CVC. E-wallets need no
real GCash account — the test page offers Authorize/Fail. Webhooks also fire in
test mode, so the endpoint needs a public HTTPS URL: deploy, or tunnel locally
(e.g. `ngrok http 8000`) and register the tunnel URL in the dashboard.

If `PAYMENT_MODE=paymongo` is set without a key, GCASH/CARD checkout answers
`503 PROVIDER_NOT_CONFIGURED` and no payment row is written; cash recorded at
the counter keeps working.

## Xendit (`PAYMENT_MODE=xendit`)

- `POST /sessions` with HTTP basic auth (`xnd_...` as username), `session_type`
  `PAY`, `mode` `PAYMENT_LINK`, amount in centavos, `country` `XENDIT_COUNTRY`
- redirects the payer to `payment_link_url` from the response, and stores the
  session id as `PAY_PROVIDER_REF`
- `allowed_payment_channels` follows the payment method: `GCASH` for GCash and
  `CARDS` for card, so the hosted page only offers what the owner picked
- returns them to `{FRONTEND_URL}/payments/success/{PAY_REFERENCE}` or
  `{FRONTEND_URL}/payments/cancelled/{PAY_REFERENCE}` through
  `success_return_url` / `cancel_return_url`
- confirmation arrives on `POST /api/payments/webhooks/xendit/`, authenticated
  by the shared `x-callback-token` header compared in constant time (the token
  is not derived from the body, unlike PayMongo's HMAC signature)
- events: `payment_session.completed` → `PAID`, `payment_session.expired` →
  `EXPIRED`. Anything else is acknowledged and ignored.

### Switching from mock

1. `PAYMENT_MODE=xendit` in the backend environment.
2. `XENDIT_SECRET_KEY=xnd_development_...` from Settings → Developers → API Keys.
3. `XENDIT_CALLBACK_TOKEN=...` from Settings → Webhooks — mandatory when
   `DEBUG=False`; the app refuses to boot without it.
4. Register `https://<api-host>/api/payments/webhooks/xendit/` for the Payment
   Session completed/expired topics, then use *Test & Save* in the dashboard to
   verify the endpoint receives the payload.
5. `XENDIT_RETURN_BASE_URL` must be a public **https** base for the return
   redirects; leave it blank to reuse `FRONTEND_URL`. Xendit answers
   `400 INVALID_URL` for `http://` URLs, so a localhost `FRONTEND_URL` needs
   this pointed at a tunnel instead; when it is not https the API answers
   `503 PROVIDER_MISCONFIGURED` before calling Xendit at all.

Xendit runs test mode with every channel enabled by default and no real money
moving, which makes it usable for a capstone demo, but their docs warn some
channels can still be blocked by partner KYC rules — confirm the GCash page
renders in test mode before relying on it. Switching back is one env var:
`PAYMENT_MODE=mock`; the provider is recorded per payment row.

### Local development needs two tunnels

The return redirects point at the **web app** and the callbacks at the **API**,
and both must be publicly reachable:

1. `ngrok http 5173` for the frontend, then set
   `XENDIT_RETURN_BASE_URL=https://<frontend-tunnel>` while `FRONTEND_URL`
   stays `http://localhost:5173`.
2. `ngrok http 8000` for the API, and register
   `https://<api-tunnel>/api/payments/webhooks/xendit/` in the dashboard.
3. Allow the tunnel host in Vite (`server.allowedHosts`), otherwise the
   redirected browser gets Vite's "Blocked request" page instead of the
   success/cancelled screen.

Tunnel URLs change on restart, which invalidates sessions created before it.

---

# Rules

1. Money records are never deleted; a cancelled checkout becomes `VOID`.
2. A payment may be attached to one appointment only.
3. Owners cannot record cash payments.
4. Only Clinic Admin and Receptionist can read the clinic's payment list.
5. `CLS_CONSULTATION_FEE = 0` means no payment is required.
6. Settlement and expiry notify the owner exactly once per transition.
