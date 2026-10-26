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
- confirmation arrives on `POST /api/payments/webhooks/paymongo/`, authenticated
  with `Paymongo-Signature: t=...,te=...,li=...`
  (`HMAC-SHA256(secret, "{t}.{raw_body}")`, constant-time compared)

---

# Rules

1. Money records are never deleted; a cancelled checkout becomes `VOID`.
2. A payment may be attached to one appointment only.
3. Owners cannot record cash payments.
4. Only Clinic Admin and Receptionist can read the clinic's payment list.
5. `CLS_CONSULTATION_FEE = 0` means no payment is required.
