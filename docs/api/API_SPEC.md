# API_SPEC.md

> Version: 2.0
> Project: XPawSure
> Last Updated: July 2026

---

# 1. Overview

XPawSure exposes a REST API built with Django REST Framework.

Authentication uses JWT (SimpleJWT).

All endpoints require authentication unless explicitly marked as public.

All endpoints require role-based authorization.

The API returns JSON responses.

---

# 2. Authentication

## POST /api/auth/login/

Public.

Request:

{
  "email": "string",
  "password": "string"
}

Response (200):

{
  "refresh": "string",
  "access": "string",
  "user": {
    "id": "uuid",
    "email": "string",
    "full_name": "string",
    "role": "string",
    "clinic_name": "string | null"
  }
}

`clinic_name` is the name of the clinic the staff member belongs to; `null` for users without a clinic (e.g. Super Admin, owners).

---

## POST /api/auth/refresh/

Public.

Request:

{
  "refresh": "string"
}

Response (200):

{
  "access": "string"
}

---

## POST /api/auth/register/

Public.

Owner self-registration only.

Request:

{
  "email": "string",
  "password": "string",
  "full_name": "string",
  "phone": "string (optional)"
}

Response (201):

{
  "id": "uuid",
  "email": "string",
  "full_name": "string",
  "role": "OWNER",
  "profile": {
    "id": "uuid",
    "address": null,
    "profile_picture": null
  }
}

Errors:

- 400: Validation error
- 409: Email already exists

---

## POST /api/auth/logout/

Requires authentication.

Blacklists the refresh token.

---

## POST /api/auth/change-password/

Requires authentication.

Request:

{
  "old_password": "string",
  "new_password": "string"
}

Response (200):

{
  "detail": "Password changed successfully"
}

---

## GET /api/auth/profile/

Requires authentication.

Returns the authenticated user's profile.

Response (200):

{
  "id": "uuid",
  "email": "string",
  "full_name": "string",
  "phone": "string",
  "role": "string",
  "is_active": true,
  "clinic_name": "string | null"
}

---

## PUT /api/auth/profile/

Requires authentication.

Request:

{
  "full_name": "string (optional)",
  "phone": "string (optional)"
}

Response (200):

{
  "id": "uuid",
  "email": "string",
  "full_name": "string",
  "phone": "string",
  "role": "string",
  "clinic_name": "string | null"
}

---

# 3. Owner Profile Endpoints

## GET /api/owner/profile/

Requires authentication. Owner only.

Returns the owner profile of the authenticated user.

Response (200):

{
  "id": "uuid",
  "user": {
    "id": "uuid",
    "email": "string",
    "full_name": "string",
    "phone": "string"
  },
  "clinic": {
    "id": "uuid",
    "name": "string"
  },
  "address": "string",
  "profile_picture": "string (url)"
}

Implementation notes:

- `clinic` is always `null` — owners are not permanently attached to a clinic
  (see AUTHENTICATION.md). The key is kept so the documented shape stays stable.
- `profile_picture` is `""` when no picture has been uploaded.

---

## PUT /api/owner/profile/

Requires authentication. Owner only.

Request:

{
  "address": "string (optional)",
  "profile_picture": "file (optional)"
}

`profile_picture` accepts JPEG, PNG, or WebP up to 2 MB; the file is stored in the
Supabase `owner-images` bucket and the returned URL is saved. Sending
`"profile_picture": null` clears the current picture.

Response (200) — same shape as GET above.

---

# 4. Pet Endpoints

## GET /api/pets/

Requires authentication.

Owner: Returns only own pets.
Clinic staff: Returns pets registered at their clinic.

Query parameters:

- search: string (name, breed)
- page: integer
- page_size: integer

Response (200):

{
  "count": integer,
  "next": "string (url)",
  "previous": "string (url)",
  "results": [
    {
      "id": "uuid",
      "name": "string",
      "species": "string",
      "breed": "string",
      "date_of_birth": "date",
      "sex": "string",
      "weight": "decimal",
      "color": "string",
      "owner": {
        "id": "uuid",
        "full_name": "string"
      }
    }
  ]
}

---

## POST /api/pets/

Requires authentication. Owner or receptionist.

Owner: Creates pet under own profile.
Receptionist: Creates pet under any owner at their clinic.

Request:

{
  "name": "string",
  "species": "string",
  "breed": "string (optional)",
  "date_of_birth": "date (optional)",
  "sex": "string (optional)",
  "weight": "decimal (optional)",
  "color": "string (optional)",
  "microchip_id": "string (optional)",
  "profile_picture": "file (optional)"
}

Response (201):

{
  "id": "uuid",
  "name": "string",
  ...
}

---

## GET /api/pets/{id}/

Requires authentication.

Returns pet detail.

---

## PUT /api/pets/{id}/

Requires authentication.

Owner: Can update own pets.
Clinic staff: Can update any pet at their clinic.

Note: Currently owner-only (`IsOwner`); clinic-staff update is not yet implemented.
Partial updates are supported — only provided fields change. `profile_picture: null`
clears the picture; a new image upload replaces it (multipart).

---

## DELETE /api/pets/{id}/

Requires authentication.

Soft delete.

Owner: Can delete own pets.
Clinic staff: Can delete any pet at their clinic.

Note: Currently owner-only (`IsOwner`); clinic-staff delete is not yet implemented.
Returns `204 No Content`. The pet disappears from list/detail but medical history
is preserved.

---

## GET /api/pets/public/{qr_code}/

Public. No authentication required.

Reached by scanning a pet's QR code (encoded value:
`{FRONTEND_URL}/pets/{qr_code}/public` → rendered by the web at
`/pets/:qrCode/public`). Throttled to 60 requests/min per IP.

Returns a restricted, privacy-safe profile of an active pet looked up by its
`qr_code` (the pet ID). Never exposes owner data, microchip number, weight, or
internal IDs. Deleted or inactive pets return `404`.

Response (200):

{
  "qr_code": "uuid",
  "name": "string",
  "breed_name": "string | null",
  "sex": "MALE | FEMALE",
  "date_of_birth": "YYYY-MM-DD | null",
  "age": "integer | null",
  "color": "string | null",
  "profile_picture": "url | null",
  "vaccinations": [
    {
      "name": "string",
      "date_given": "YYYY-MM-DD",
      "next_due": "YYYY-MM-DD | null",
      "status": "OVERDUE | DUE_SOON | CURRENT | NO_DUE_DATE"
    }
  ]
}

Vaccinations are sorted by urgency: `OVERDUE`, `DUE_SOON`, `CURRENT`,
`NO_DUE_DATE` (`DUE_SOON` = due within 30 days).

---

## GET /api/receptionist/pets/  (Receptionist, web)

Clinic-scoped patient directory behind the sidebar "Patients" tab.

Query parameters: `search`, `owner_id`, `scope`, `page`, `page_size`

- Default: only active pets with at least one non-deleted appointment at the
  receptionist's own clinic. A pet becomes a clinic patient once an appointment
  exists there.
- `scope=owner` (requires `owner_id`): that owner's active pets from any clinic.
  Used by the booking form so walk-in owners can be booked; after the booking the
  pet appears in the clinic's Patients tab.
- Invalid `page` / `page_size` values fall back to defaults (never a 500).

## POST /api/receptionist/pets/

Requires authentication. Receptionist.

Registers a pet for an existing owner. Registration does not attach the pet to a
clinic — the pet appears in the clinic's Patients tab after its first appointment
there.

## GET /api/receptionist/pets/{id}/

Requires authentication. Receptionist.

Returns the pet only if it has an appointment at the receptionist's clinic,
otherwise `404`.

## PATCH /api/receptionist/pets/{id}/

Requires authentication. Receptionist.

Same clinic rule as GET — otherwise `404`.

## GET /api/receptionist/pets/{id}/history/

Requires authentication. Receptionist.

Full read-only medical record for the Patient record page. The pet must have an
appointment at the receptionist's clinic (`404` otherwise); a receptionist without
a staff profile gets `400`.

Response:

```json
{
  "consultations": [],
  "prescriptions": [],
  "vaccinations": [],
  "screenings": [],
  "appointments": []
}
```

Scoping (shared patients — a pet treated at multiple clinics):

- `consultations`, `prescriptions`, `appointments`: only records from the
  receptionist's own clinic (per `BUSINESS_RULES.md` — no records outside their
  own clinic).
- `vaccinations`, `screenings`: **pet-level** — returned in full, including
  owner-reported vaccinations and phone AI screenings that belong to the pet
  rather than any clinic.

Read-only: the endpoint never mutates records (medical history is immutable).

Web UI presentation: prescriptions are rendered inside their (one-to-one)
consultation, and a consultation's AI screening is resolved through
`appointments[].screening` — only screenings tied to a consultation are shown.
Response shape is unchanged.

---

# 4A. Receptionist Owner Endpoints (Web)

## GET /api/owners/

Requires authentication. Receptionist.

Owner directory. Owners are platform-wide (not attached to one clinic), so the
list is not clinic-filtered. `pet_count` counts only the owner's active pets that
have an appointment at the receptionist's clinic.

Query parameters: `search`, `page`, `page_size`

## GET /api/owners/{id}/

Requires authentication. Receptionist.

`pets` only includes pets with an appointment at the receptionist's clinic.

---

# 5. Appointment Endpoints

## GET /api/appointments/

Requires authentication. Receptionist or Clinic Admin (read). Owner bookings use
`GET /api/owner/appointments/`.

Owner: Returns own pets' appointments.
Clinic staff: Returns clinic appointments (clinic-scoped).

Query parameters:

- date (single day, `YYYY-MM-DD`), status, vet_id, pet_id, search, page, page_size
- date_from, date_to (`YYYY-MM-DD`, inclusive range on clinic-local [Asia/Manila]
  calendar days; used by Clinic Admin date-range filtering). `400` if a value is not
  a valid date or if `date_from` is after `date_to`.
- overdue (`1`/`true`): only past-due appointments (status `PENDING` or `CONFIRMED`
  with `apt_scheduled_at` already in the past). Used by the receptionist dashboard's
  "Needs attention" indicator; additive, combines with the other filters.

Notes:

- `GET /api/appointments/` is read-only for Clinic Admin; creating appointments
  remains receptionist-only (`POST` returns `403` for Clinic Admin).

---

## GET /api/appointments/dashboard/stats/

Requires authentication. Receptionist dashboard summary.

Response: `today` (Asia/Manila-day status counts), `total_owners`, `total_pets`,
`recent_appointments`, and `needs_attention` — the count of past-due
appointments still awaiting action. `today.pending` counts only upcoming
`PENDING` appointments; past-due ones surface through `needs_attention`
instead of double-counting in Pending/Confirmed.

Refresh on read: overdue statuses are refreshed on reads. This endpoint and
`GET /api/appointments/` run `AppointmentService.close_past_due(clinic_id)`
for the requesting clinic before returning. It cancels past-due `PENDING`
appointments (reason "Not confirmed in time") and marks `CONFIRMED`
appointments more than 60 minutes past (`NO_SHOW_GRACE_MINUTES`) as
`NO_SHOW`. The work is idempotent, clinic-scoped, and row-locked
(`select_for_update`), so no scheduler, Celery worker, or beat process is
required. Because the refresh runs first, past-due `PENDING` rows are already
`CANCELLED` and expired `CONFIRMED` rows are already `NO_SHOW` when the
counts are taken — `needs_attention` therefore surfaces late-but-actionable
`CONFIRMED` appointments (inside the grace window).

---

## POST /api/appointments/

Requires authentication. Owner or receptionist.

Owner: Books appointment for own pet (`POST /api/owner/appointments/`).
Receptionist: Books appointment for any pet at clinic (`POST /api/appointments/`).

Owner booking rule: the owner must attach a skin screening result for the booked pet.
If `screening_id` is missing, does not belong to the pet, or the pet has no screening,
the API responds `403` with:

{ "detail": "A skin scan result is required for this pet before booking." }

Receptionist bookings are not gated by screenings.

Payment rule: when `CLINIC_SETTINGS.CLS_CONSULTATION_FEE` is greater than `0`, a
paid payment is required before the appointment exists (`pay_id` below). With a fee
of `0` the field is ignored and booking behaves exactly as before. See section 5B.

When payment is required but `pay_id` is missing, not `PAID`, already used, or does
not belong to this clinic/owner, the API responds `400` with:

{
  "detail": "This clinic requires payment before an appointment can be booked.",
  "code": "PAYMENT_REQUIRED",
  "amount": 500.0,
  "currency": "PHP"
}

`code` is `PAYMENT_INVALID` instead when a `pay_id` was supplied but cannot be used.

Initial status: owner bookings start as `PENDING` (awaiting clinic confirmation; owner
notified with `APPOINTMENT_CREATED`). Receptionist desk bookings start as `CONFIRMED`
(owner notified with `APPOINTMENT_CONFIRMED`).

Request (owner):

{
  "pet_id": "uuid",
  "slot_id": "uuid",
  "apt_type": "CONSULTATION | FOLLOW_UP | VACCINATION | AI_REVIEW | EMERGENCY",
  "reason": "string (optional)",
  "screening_id": "uuid (required for owner bookings)",
  "pay_id": "uuid (required when the clinic charges a fee)"
}

Request (receptionist) is the same payload minus `screening_id`.

---

## GET /api/appointments/{id}/

Requires authentication.

Owner: own pets' appointments only. Clinic staff: appointments within their own clinic,
otherwise `404`.

---

## PATCH /api/appointments/{id}/

Requires authentication. Receptionist or clinic admin.

Update appointment status. Clinic staff can only update appointments within their own
clinic, otherwise `404`. Veterinarians cannot change status directly: a veterinarian
`PATCH` returns `403`. Veterinarians submit reschedule or cancellation requests through
the endpoints in section 5A instead.

Time-based rules (Asia/Manila "now"):

- Confirming a `PENDING` appointment whose scheduled time has passed returns `400`:
  `{ "detail": "Cannot confirm an appointment that has already passed." }`
- Marking `NO_SHOW` before the scheduled time returns `400`:
  `{ "detail": "Cannot mark an appointment as no-show before its scheduled time." }`
- `NO_SHOW` is allowed immediately once the scheduled time has passed (no grace
  period on this endpoint). `CHECKED_IN` is not blocked for late arrivals; the
  60-minute grace period (`NO_SHOW_GRACE_MINUTES`) only gates the read-time
  auto-close (`AppointmentService.close_past_due`) and the UI's Check In
  action.
- Invalid status transitions still return `400` as before.

---

## DELETE /api/appointments/{id}/

Requires authentication.

Soft delete.

## GET /api/appointments/volume/

Requires authentication. Clinic Admin.

Daily appointment counts for the Clinic Admin oversight trend chart.

Query parameters:

- date_from, date_to (`YYYY-MM-DD`, optional), vet_id, status
- Default window: last 30 clinic-local (Asia/Manila) days ending today.
- Same `400` validation rules as `GET /api/appointments/` for the date params.

Response:

{ "results": [ { "date": "2026-10-01", "count": 3 }, { "date": "2026-10-02", "count": 0 } ] }

Days are bucketed on Asia/Manila calendar boundaries and zero-filled across the
window so chart timelines have no gaps.

---

# 5A. Veterinarian Appointment Endpoints

Requires authentication with the `VETERINARIAN` role. A veterinarian may only act on
appointments assigned to them at their own clinic; appointments belonging to another
veterinarian return `403`, and unknown ones return `404`. Callers without a staff
profile receive `400`.

## GET /api/veterinarian/dashboard/

Query parameters:

- date (optional, `YYYY-MM-DD`, defaults to the clinic-local today). `400` for an
  invalid date.

Response (200): `{ clinic_name, stats: { consultations_this_month, pending, completed },
today_consultations: [ ...appointment summaries ] }`.

---

## GET /api/veterinarian/appointments/

Query parameters: `start_date`, `end_date` (optional `YYYY-MM-DD`; `400` for invalid
values or when `start_date` is after `end_date`). Returns the vet's own appointments as
appointment summaries (each includes `apt_reschedule_request_reason` and
`apt_cancellation_request_reason`).

---

## POST /api/veterinarian/appointments/{id}/start/

Starts the consultation for an assigned appointment. Responses: `200` with the
appointment detail, `403` when the appointment belongs to another veterinarian, `409`
when the appointment is not in a startable status.

---

## POST /api/veterinarian/appointments/{id}/request-reschedule/

Requires the appointment to be `CONFIRMED`. Records the reason without changing
`apt_status`.

Request body:

- reason (required): non-empty string

Response (200): Appointment detail with `apt_reschedule_request_reason` set.

Responses:

- 400: missing/blank reason, or the caller has no staff profile
- 403: appointment belongs to another veterinarian, or caller is not a veterinarian
- 404: unknown appointment
- 409: appointment is not `CONFIRMED`

---

## POST /api/veterinarian/appointments/{id}/request-cancel/

Requires the appointment to be `CONFIRMED`. Records the reason without changing
`apt_status`; cancellation is a request, not a direct cancellation.

Request body:

- reason (required): non-empty string

Response (200): Appointment detail with `apt_cancellation_request_reason` set.

Responses:

- 400: missing/blank reason, or the caller has no staff profile
- 403: appointment belongs to another veterinarian, or caller is not a veterinarian
- 404: unknown appointment
- 409: appointment is not `CONFIRMED`

---

# 5B. Payment Endpoints

Payments gate booking: the consultation fee is configured per clinic
(`CLINIC_SETTINGS.CLS_CONSULTATION_FEE`, default `0.00`). A fee of `0` disables
the gate entirely.

Providers: `PAYMENT_MODE=mock` (default, signed checkout page in the web app) or
`PAYMENT_MODE=paymongo` (hosted checkout + webhook). See `docs/database/PAYMENT.md`.

The amount is also exposed before checkout so the booking flow can show it:
`GET /api/owner/clinics/` returns `consultation_fee` per clinic (owners), and
`GET /api/clinic/settings/` returns it for staff.

When a payment settles or a checkout lapses the owner receives an in-app
notification (`PAYMENT_COMPLETED` / `PAYMENT_EXPIRED`, `ntf_reference_table`
`PAYMENT`) — the mobile app does not have to poll to learn the outcome.

Payment object:

{
  "pay_id": "uuid",
  "reference_no": "XPS-20261026-A1B2C3",
  "clinic_id": "uuid",
  "owner_id": "uuid",
  "owner_name": "Olivia Owner",
  "appointment_id": null,
  "pet_name": "Rex",
  "amount": 500.0,
  "currency": "PHP",
  "method": "GCASH | CARD | CASH",
  "status": "PENDING | PAID | FAILED | EXPIRED | REFUNDED | VOID",
  "provider": "MOCK | PAYMONGO | CASH",
  "checkout_url": "https://…/payments/mock/XPS-…?token=…",
  "expires_at": "2026-10-26T12:34:56Z",
  "paid_at": null,
  "failure_reason": null,
  "created_at": "…",
  "updated_at": "…"
}

---

## POST /api/payments/checkout/

Requires authentication. Receptionist, clinic admin, or owner.

Creates the payment for a booking. The slot must still be `AVAILABLE`; owners
pay only for their own pets and must pass the `screening_id` their booking will
use. Amount always comes from the clinic's consultation fee.

Allowed methods: staff `GCASH | CARD | CASH`, owners `GCASH | CARD` only.
`CASH` is stored as `PAID` immediately (recorded at the counter); the other
methods return a `checkout_url`.

Request:

{
  "pet_id": "uuid",
  "slot_id": "uuid",
  "apt_type": "CONSULTATION | FOLLOW_UP | VACCINATION | AI_REVIEW | EMERGENCY",
  "method": "GCASH | CARD | CASH",
  "reason": "string (optional)",
  "screening_id": "uuid (owner bookings only)"
}

Responses:

- 201: payment object
- 400 `PAYMENT_NOT_REQUIRED`: the clinic fee is `0`
- 400 `METHOD_NOT_ALLOWED`: method not available for this role
- 400 `SCREENING_REQUIRED`: owner checkout without a screening
- 403 `BOOKING_NOT_ALLOWED`: clinic has disabled owner booking
- 404 `PET_NOT_FOUND` / `SLOT_NOT_FOUND`
- 409 `SLOT_UNAVAILABLE`: slot was taken between lookup and write
- 502 `PROVIDER_ERROR`: gateway unreachable (nothing is stored)

---

## GET /api/payments/

Requires authentication. Receptionist or clinic admin. Scoped to the caller's
clinic; owners get `403`.

Query params: `status`, `method`, `reference` (partial), `appointment` (uuid),
`date_from`, `date_to` (YYYY-MM-DD), `page`, `page_size` (max 100).

Response (200): `{ "total", "page", "page_size", "total_pages", "results": [payment] }`

---

## GET /api/owner/payments/

Requires authentication. Owner only — clinic staff get `403`. Same query params
and response envelope as `GET /api/payments/`, scoped to the caller's own
payments.

`?status=PENDING` is how the mobile app finds a checkout that was abandoned
mid-payment and offers "resume payment".

---

## GET /api/payments/{id}/

Requires authentication. Owners read their own payments, clinic staff read their
clinic's payments, otherwise `404`.

---

## POST /api/payments/{id}/cancel/

Requires authentication. Same access rule as the detail endpoint.

Only `PENDING` payments can be cancelled → `VOID`. Settled payments return
`409 { "code": "PAYMENT_PROCESSED" }` (refunds are handled separately).

---

## GET /api/payments/mock/{reference}/?token=…

No authentication: the signed `token` from `checkout_url` is the credential.

Returns the payment so a checkout page can poll until it is `PAID`, `FAILED`, or
`EXPIRED`. An invalid or stale token returns
`403 { "code": "INVALID_TOKEN" }`.

---

## POST /api/payments/mock/{reference}/confirm/

No authentication (signed token only). Drives the mock checkout:

{ "token": "…", "outcome": "success | decline | expire" }

Responses: `200` payment object · `400 PAYMENT_EXPIRED` · `409 PAYMENT_PROCESSED`
(already confirmed) · `403 INVALID_TOKEN`.

---

## POST /api/payments/webhooks/paymongo/

PayMongo callback (no session auth). Requires `PAYMONGO_WEBHOOK_SECRET`; verifies
`Paymongo-Signature` (`t`, `te`, `li` parts; `HMAC-SHA256(secret, "{t}.{raw_body}")`,
constant-time compare) before touching data.

Handles `checkout_session.payment.paid`, `checkout_session.payment.failed`, and
`checkout_session.expired`, matched on `reference_number`. Replays are no-ops.

Responses: `200 { "received": true }` · `403 INVALID_SIGNATURE` ·
`400 INVALID_PAYLOAD` · `503 WEBHOOK_NOT_CONFIGURED`.

---

## GET /api/clinic/settings/

Requires authentication. Clinic admin or receptionist (read-only for
receptionists — only clinic admins may `PUT`).

`consultation_fee` is the amount the payment module charges. A value of `0`
means no payment is required and `pay_id` is ignored by the booking endpoints.

Response (200):

{
  "opening_time": "09:00:00",
  "closing_time": "17:00:00",
  "appointment_duration": 30,
  "max_appointments_per_day": 50,
  "allow_owner_booking": true,
  "consultation_fee": 500,
  "timezone": "Asia/Manila"
}

`PUT` accepts the same fields; `consultation_fee` is optional (omitting it keeps
the stored value) and must be between 0 and 1000000 with at most 2 decimals.

---

# 6. Schedule Management

## GET /api/schedule/

Receptionist only.

Returns vet schedule for a date range.

Query params:

- start_date (required): YYYY-MM-DD
- end_date (required): YYYY-MM-DD, max 7 days from start
- vet_id (optional): filter to a single vet

Response (200):

{
  "start_date": "2026-09-18",
  "end_date": "2026-09-20",
  "vets": [
    {
      "stf_id": "uuid",
      "full_name": "Dr. Smith",
      "days": [
        {
          "date": "2026-09-18",
          "is_working": true,
          "slots": [
            {
              "vsl_id": "uuid",
              "vsl_start_time": "09:00",
              "vsl_end_time": "09:30",
              "status": "AVAILABLE",
              "appointment": null
            }
          ]
        }
      ]
    }
  ]
}

---

## GET /api/schedule/vet-list/

Receptionist only.

Returns list of veterinarians with today's slot summary.

Response (200):

{
  "vets": [
    {
      "stf_id": "uuid",
      "full_name": "Dr. Smith",
      "today_summary": {
        "total_slots": 16,
        "booked": 3,
        "available": 10,
        "blocked": 3,
        "is_working": true,
        "has_slots": true
      }
    }
  ]
}

---

## POST /api/generate-slots/

Receptionist only.

Pre-generates time slots for vets based on clinic operating hours.

Request:

{
  "start_date": "2026-09-18",
  "end_date": "2026-09-24",
  "vet_id": "uuid (optional)"
}

Response (200):

{
  "generated": true,
  "slots_created": 96
}

---

## PATCH /api/schedule/slots/{slot_id}/status/

Receptionist only.

Toggles a slot's status between AVAILABLE and BLOCKED.

Request:

{
  "status": "BLOCKED"
}

Response (200):

{
  "vsl_id": "uuid",
  "status": "BLOCKED"
}

Errors:

- 400: Slot has an appointment (cannot block)
- 400: Invalid status value
- 404: Slot not found

---

## POST /api/schedule/vets/{vet_id}/block-remaining/

Receptionist only.

Blocks all available slots for a vet on a specific date. Skips booked slots.

Query params:

- date (required): YYYY-MM-DD

Response (200):

{
  "blocked": 12,
  "skipped_booked": 3
}

---

## GET /api/available-slots/

Receptionist only.

Returns available slots for a specific vet on a specific date.

Query params:

- vet_id (required): UUID
- date (required): YYYY-MM-DD

Response (200): Array of VetSlot objects with status = AVAILABLE

---

## GET /api/vets/

Receptionist only.

Returns veterinarians working on a specific date.

Query params:

- date (required): YYYY-MM-DD

Response (200): Array of { stf_id, full_name, email }

---

# 7. Consultation Endpoints

Owner read-only GETs and the veterinarian write flow are implemented.
Clinic-staff scoping is not yet implemented.

## GET /api/consultations/

Requires authentication.

Owner: Returns consultations for own pets (read-only).
Clinic staff: Returns consultations at their clinic.

Query params:

- pet_id (optional): filter by pet. Foreign or unknown pet returns an empty
  list; invalid UUID returns 400.

Response (200): Array of { id, appointment_id, pet_id, pet_name, veterinarian,
chief_complaint, subjective, objective, assessment, plan, diagnosis,
specific_disease, treatment, notes, created_at }

`specific_disease` is `null` when no specific disease/subtype is recorded.

---

## GET /api/consultations/{id}/

Requires authentication.

Response (200): Consultation object as above. Returns 404 for consultations
that do not belong to the requesting owner.

---

## POST /api/consultations/

Requires authentication. Veterinarian only.

Creates the consultation for an appointment that is assigned to the
requesting veterinarian and has been started (`apt_status = IN_PROGRESS`).

Request body:

- appointment_id (required): UUID
- chief_complaint (optional): string
- objective (optional): string
- diagnosis (required): non-empty string (a seeded skin disease, or a
  free-text disease name when the UI "Other" option is used)
- specific_disease (optional): string, a more specific disease/subtype for the
  diagnosis (stored as null when blank)
- notes (optional): string

Responses:

- 201: Consultation object as above
- 400: blank diagnosis, or the caller has no staff profile
- 403: appointment belongs to another veterinarian, or caller is not a
  veterinarian
- 404: unknown appointment
- 409: appointment is not `IN_PROGRESS`, or a consultation already exists

Diagnosis date is not stored on the consultation; the appointment's
`apt_checked_in_at` records when the patient arrived.

---

## PUT /api/consultations/{id}/

Requires authentication. Veterinarian only.

Replaces the consultation fields while the appointment is still
`IN_PROGRESS`. The record becomes read-only once the appointment leaves
`IN_PROGRESS`.

Request body: same fields as POST, except `appointment_id`.

Responses:

- 200: Consultation object as above
- 400: blank diagnosis, or the caller has no staff profile
- 403: consultation belongs to another veterinarian, or caller is not a
  veterinarian
- 404: unknown consultation
- 409: appointment is not `IN_PROGRESS`

---

# 7. Prescription Endpoints

Owner read-only GETs and the veterinarian write flow are implemented.
Clinic-staff scoping is not yet implemented.

## GET /api/prescriptions/

Requires authentication.

Owner: Returns prescriptions for own pets (read-only).
Clinic staff: Returns prescriptions at their clinic.

Query params:

- pet_id (optional): filter by pet. Foreign or unknown pet returns an empty
  list; invalid UUID returns 400.

Response (200): Array of { id, consultation_id, pet_id, pet_name, veterinarian,
instructions, items, created_at } where items is an array of
{ id, medicine_name, generic_name, dosage, frequency, duration, route,
quantity, notes }

---

## GET /api/prescriptions/{id}/

Requires authentication.

Response (200): Prescription object as above. Returns 404 for prescriptions
that do not belong to the requesting owner.

---

## POST /api/prescriptions/

Requires authentication. Veterinarian only.

Creates the prescription for a consultation whose appointment is assigned to
the requesting veterinarian and is `IN_PROGRESS`. A consultation has at most
one prescription; when one already exists it is updated and its medication
items are replaced. Multiple medications are stored as items on that single
prescription.

Request body:

- consultation_id (required): UUID
- instructions (optional): string
- items (required): array with at least one entry
  - medicine_name (required)
  - generic_name (optional)
  - dosage (required)
  - frequency (required)
  - duration (required)
  - route (required): ORAL | TOPICAL | INJECTION | EAR | EYE | OTHER
  - quantity (optional): integer; stays null when the veterinarian UI does
    not capture it
  - notes (optional): string

Responses:

- 201: prescription created; 200: existing prescription updated
- 400: empty items, invalid route, missing required item field, or the
  caller has no staff profile
- 403: consultation belongs to another veterinarian, or caller is not a
  veterinarian
- 404: unknown consultation
- 409: appointment is not `IN_PROGRESS`

---

# 8. Vaccination Endpoints

Owner read and write flow (list, detail, create, update, delete) is
implemented. Clinic-staff scoping and the veterinarian write flow are not yet
implemented.

## GET /api/vaccinations/

Requires authentication.

Owner: Returns vaccinations for own pets.
Clinic staff: Returns vaccinations at their clinic.

Query params:

- pet_id (optional): filter by pet. Foreign or unknown pet returns an empty
  list; invalid UUID returns 400.

Response (200): Array of { id, consultation_id, pet_id, pet_name, veterinarian,
name, brand, batch_no, dose, route, date_given, next_due, notes, source,
created_at }, ordered by date_given descending.

- source is "VET" (veterinarian-issued) or "OWNER" (owner-reported).
- veterinarian and consultation_id are null for owner-reported records.

---

## GET /api/vaccinations/{id}/

Requires authentication.

Response (200): Vaccination object as above. Returns 404 for vaccinations
that do not belong to the requesting owner.

---

## POST /api/vaccinations/

Requires authentication. Owner role only (staff receive 403).

Creates an owner-reported vaccination record (source=OWNER) for one of the
owner's active pets. The record is not tied to a consultation or veterinarian.

Request:

{
  "pet_id": "uuid",
  "name": "Rabies",
  "brand": "Nobivac (optional)",
  "batch_no": "B-123 (optional)",
  "dose": "1 ml",
  "route": "SUBCUTANEOUS",
  "date_given": "2026-09-30",
  "next_due": "2027-09-30 (optional)",
  "notes": "optional"
}

Validation errors (400): missing required fields, unknown route, date_given in
the future, next_due before date_given. Unknown or foreign pet returns 404.

Response (201): Vaccination object as above.

---

## PUT /api/vaccinations/{id}/

Requires authentication. Owner role only.

Updates an owner-reported record. All required fields must be provided (full
update). Vet-issued records (source=VET) return 403. Foreign records return
404. Validation matches POST.

Response (200): Updated vaccination object.

---

## DELETE /api/vaccinations/{id}/

Requires authentication. Owner role only.

Deletes an owner-reported record. Vet-issued records return 403. Foreign
records return 404. Deletions are recorded in the audit log.

Response (204).

---

# 9. AI Screening Endpoints

Owner screening endpoints are implemented under `/api/owner/screenings/`.
The generic staff-facing routes below remain the spec for a future release.

All screenings are created from **on-device AI results** (`source: "DEVICE"`).
Server-side mock screenings no longer exist; older `MOCK` rows were deleted
by migration `ai_screenings.0003`.

A screening uses exactly one image. The mobile app prepares one 512 px JPEG and
first sends it to the Anthropic image-validation gate. Only when Claude marks
the image suitable and eligible does the same image run through the on-device
EfficientNetB0 classifier. The two results are stored separately and are never
averaged into a combined probability.

The `prediction` and `confidence` fields are the raw on-device classifier
output — the sole primary result. The questionnaire's display-ready answer rows
are sent in the optional `symptom_answers` field (JSON array of at most 12
`{question, answer}` rows, each string at most 300 characters) and stored only
as supplementary display context; no other questionnaire state is ever part of
a request or stored field, and `symptom_answers` can never influence the AI
outputs.

Owner write endpoints are rate limited (`VISION_ANALYSIS_THROTTLE_RATE`,
`SCREENING_CREATE_THROTTLE_RATE`). Image uploads are capped by
`SCREENING_IMAGE_MAX_BYTES` and validated by MIME type, file signature, and
pixel count.

## GET /api/owner/screenings/

Requires authentication (Owner role).

Returns screenings for the owner's pets, newest first.

Query parameters:

- pet_id (optional uuid filter; must belong to the owner, otherwise 404)
- page, page_size

Response:

{
  "total": 1,
  "page": 1,
  "page_size": 20,
  "total_pages": 1,
  "results": [
    {
      "ais_id": "uuid",
      "pet_id": "uuid",
      "pet_name": "Rex",
      "disease": "Fungal",
      "disease_code": "FUNGAL",
      "ais_confidence": "87.40",
      "ais_model_version": "2.0.0",
      "ais_inference_time_ms": 412,
      "ais_device": "android",
      "ais_status": "PENDING_REVIEW",
      "ais_source": "DEVICE",
      "ais_is_correct": null,
      "ais_created_at": "...",
      "is_booked": false,
      "symptom_answers": [
        { "question": "Where is the affected area?", "answer": "Back, Ears" }
      ],
      "image": {
        "url": "https://.../screening.jpg",
        "content_type": "image/jpeg",
        "size_bytes": 48123,
        "sha256": "hex digest",
        "created_at": "..."
      },
      "claude": {
        "status": "OK",
        "model": "claude-sonnet-4-6",
        "result": {
          "image_suitability": "SUITABLE",
          "screening_eligibility": "ELIGIBLE",
          "screening_message": "The photo is clear enough and shows a pattern that can be assessed by the on-device screening model.",
          "visible_features": ["Red patches", "Thinning hair around the muzzle"],
          "image_quality": { "adequate": true, "observations": ["..."] },
          "condition_assessment": {
            "closest_match": "FUNGAL",
            "other_possibilities": ["BACTERIAL"],
            "unclear": false,
            "rationale": "..."
          },
          "vet_recommendation": "..."
        },
        "analyzed_at": "...",
        "latency_ms": 2400,
        "usage": { "input_tokens": 1500, "output_tokens": 420 }
      },
      "cross_analysis": {
        "status": "COMPATIBLE",
        "summary": "Both analyses pointed to Fungal. This agreement does not confirm a diagnosis; a veterinarian should examine the skin."
      }
    }
  ]
}

`ais_is_correct` is `null` until a consultation with a diagnosis is saved for
the linked appointment; it then becomes `true`/`false` (see verdict rules
below).

`is_booked` is `true` while a non-cancelled appointment was booked from the
screening; cancelling that appointment returns it to `false`.

`symptom_answers` is the stored questionnaire summary, returned as display
context only. It is `null` when the screening was saved without answers or
predates the column; stored rows never influence prediction, confidence,
review, or booking.

Historical image-less screenings return `image: null`, `claude.status:
"NOT_REQUESTED"`, and `cross_analysis.status: "INSUFFICIENT_EVIDENCE"`.

---

## POST /api/owner/screenings/

Requires authentication (Owner role). Pet must belong to the owner and be active (404 otherwise).

Creates one screening from an on-device inference result. The current flow uses
`multipart/form-data`; a legacy JSON request without an image is still accepted
for backward compatibility.

Multipart fields:

| Field | Required | Notes |
|-------|----------|-------|
| `pet_id` | yes | Must belong to the owner |
| `source` | yes | `DEVICE` only |
| `prediction` | yes | Disease code or name, resolved against DISEASE |
| `confidence` | yes | Number 0-100 |
| `model_version` | yes | On-device model version |
| `inference_time_ms` | no | Integer |
| `device` | no | e.g. `android`, `ios` |
| `image` | yes for validated screening | Exactly one file under this field |
| `claude_token` | yes with image | Signed token from the vision-analysis endpoint |
| `symptom_answers` | no | JSON string of an array of up to 12 `{"question","answer"}` rows (each string ≤ 300 chars). Display-only; multipart sends the JSON string, plain JSON requests may send the array itself |

Rules:

- Exactly one file may be uploaded. Multiple files, unexpected field names, or
  an array under `image` return `400`.
- `symptom_answers` must be a list of at most 12 objects with exactly the
  `question` and `answer` keys, both strings of at most 300 characters.
  Anything else (non-list, extra keys, non-string or oversized values, or
  malformed JSON in multipart) returns `400` with a field-level error. The
  stored rows are supplementary display data and can never modify the
  persisted prediction, confidence, status, review outputs, or booking.
- The file must be a valid JPEG, PNG, or WebP whose declared MIME type matches
  its decoded format. Empty, oversized, or invalid files return `400`.
- An uploaded image requires a signed validation token. The image SHA-256 must
  match the token. Invalid, expired, or mismatched tokens return `400`.
- The token must represent a completed `OK` review with
  `image_suitability: "SUITABLE"` and `screening_eligibility: "ELIGIBLE"`.
  Failed or non-eligible validations return `400`; no classifier result is
  saved.
- The image is stored once, after the screening row is created. If storage
  fails, the row is rolled back and `502` is returned.
- Reusing a token with a different image or user is rejected.
- A legacy JSON request without an image remains accepted for backward
  compatibility and creates a screening with `claude.status:
  "NOT_REQUESTED"`.

Response `201` with the screening object (see GET above).

Business rules:

- Only veterinarians may later change `ais_status` (vet review UI is future work).
- AI predictions and both review outputs are immutable after creation.
- When a consultation for the linked appointment is saved with a diagnosis,
  the backend compares it (normalized substring match of the disease name in
  the diagnosis) and stores `ais_is_correct`, `ais_compared_diagnosis`,
  `ais_compared_at`, plus the `con_id` link, for ML training/retraining sets.

---

## POST /api/owner/screenings/vision-analysis/

Requires authentication (Owner role). Runs the Anthropic image-validation gate
before any on-device screening. Nothing is persisted.

Request (`multipart/form-data`):

| Field | Required | Notes |
|-------|----------|-------|
| `image` | yes | Exactly one JPEG, PNG, or WebP |

Response `200`:

{
  "status": "OK",
  "model": "claude-sonnet-4-6",
  "analyzed_at": "...",
  "latency_ms": 2400,
  "usage": { "input_tokens": 1500, "output_tokens": 420 },
  "result": {
    "image_suitability": "POOR_QUALITY",
    "screening_eligibility": "NOT_ELIGIBLE",
    "screening_message": "The photo is too blurred or poorly lit for screening. Please upload a clearer, well-lit photo.",
    "visible_features": ["The image is blurred"],
    "image_quality": { "adequate": false, "observations": ["..."] },
    "condition_assessment": {
      "closest_match": "UNCLEAR",
      "other_possibilities": [],
      "unclear": true,
      "rationale": "..."
    },
    "vet_recommendation": "..."
  },
  "detail": "Image review completed.",
  "token": "signed-token"
}

`image_suitability` values:

- `SUITABLE` (clear enough and potentially a supported canine skin disease)
- `POOR_QUALITY` (blurred or poorly lit)
- `NOT_DOG_SKIN` (no dog or no canine skin is visible; shown as `Not a Skin Image`)
- `NO_VISIBLE_LESIONS` (canine skin is visible and appears normal; shown as
  `Skin Appears Healthy` with a does-not-rule-out-disease caveat)
- `WOUND_OR_INJURY` (more consistent with a wound or injury; shown as
  `Possible Wound or Injury`, never as healthy skin)
- `UNCERTAIN` (cannot be confidently assessed)

Only `SUITABLE` may pair with `screening_eligibility: "ELIGIBLE"`. Every other
suitability value is `NOT_ELIGIBLE`; the mobile app must not run the classifier
and the final create endpoint rejects the token.

Status values:

- `OK`
- `NOT_CONFIGURED` (missing `ANTHROPIC_API_KEY`)
- `TIMEOUT`
- `RATE_LIMITED`
- `QUOTA_EXHAUSTED`
- `MALFORMED_RESPONSE`
- `PROVIDER_ERROR`

A failed review still returns a signed token, but the final create endpoint
rejects it. The mobile app shows a retry/error message and does not run the
classifier. The token expires after `SCREENING_CLAUDE_TOKEN_MAX_AGE` seconds
and is bound to the owner and the image SHA-256.

Claude findings are non-diagnostic: no confidence percentages, certainty
claims, or treatment plans. Claude must not force a disease category for a
healthy-looking, wounded, unsuitable, or ambiguous image. The endpoint never
logs the API key or image bytes.

---

## GET /api/screenings/stats/

Requires authentication (Clinic Admin). Clinic is resolved from the
authenticated staff profile; other roles get 403.

Screenings are scoped to pets that have an appointment at the clinic
(non-deleted appointments).

Response `200`:

{
  "screenings_pending_review": 3,
  "screenings_by_disease": [
    { "label": "Mange", "value": 12 },
    { "label": "Ringworm", "value": 7 }
  ]
}

---

## GET /api/screenings/  (spec only, not implemented)

Requires authentication.

Owner: Returns screenings for own pets (read-only).
Clinic staff: Returns screenings at their clinic.

---

## POST /api/screenings/  (spec only, not implemented)

Requires authentication. Owner or veterinarian.

Owner: Uploads screening result for own pet.
Veterinarian: Uploads screening result during consultation.

Request (multipart/form-data):

{
  "pet_id": "uuid",
  "image": "file",
  "prediction": "string",
  "confidence": "decimal",
  "top_predictions": "json (optional)",
  "model_version": "string",
  "inference_time_ms": "integer (optional)"
}

---

## GET /api/screenings/{id}/  (spec only, not implemented)

Requires authentication.

---

# 10. Clinic Endpoints (Super Admin)

## GET /api/clinics/

Super Admin only.

## POST /api/clinics/

Super Admin only.

## GET /api/clinics/{id}/

Super Admin or clinic staff of that clinic.

## PUT /api/clinics/{id}/

Super Admin only.

---

# 11. User Management Endpoints (Clinic Admin)

## GET /api/staff/

Clinic Admin.

Returns staff members within the admin's own clinic.

## GET /api/veterinarians/

Clinic Admin.

Returns active veterinarians within the admin's own clinic (used to populate the
Clinic Admin appointments filter dropdown). Staff ids are `stf_id` values.

Query parameters: page, page_size (default page size applies; `page_size=100`
supported).

## POST /api/staff/

Clinic Admin.

Creates staff users (VETERINARIAN, RECEPTIONIST) within the admin's own clinic.

The `201` response includes `temp_password` exactly once (it is also emailed to
the staff member via the welcome email). It is never returned again — the
`reset-password` and `resend-welcome` actions deliver a new temporary password by
email only.

Related endpoints: `GET /api/staff/stats/`, `GET`/`PATCH /api/staff/{id}/`,
`POST /api/staff/{id}/{action}/` (activate | deactivate | reset-password |
resend-welcome), `POST /api/staff/bulk-upload/`.

---

# 12. Audit Log Endpoints (Clinic Admin)

## GET /api/audit-logs/

Clinic Admin only.

Returns the clinic's recent administrative activity, filtered to staff, clinic, and cancellation events, newest first.

Query parameters:

- limit (optional): integer, default 10, max 50

Response 200:

[
  {
    "id": "8f1c0a2e-5d4b-4a6c-9e1f-2a3b4c5d6e7f",
    "title": "Staff member deactivated: maria@test.com",
    "subtitle": "by Ada Admin",
    "category": "staff",
    "timestamp": "2026-09-30T16:35:35Z"
  }
]

category is one of: staff | clinic | cancellation

---

# 13. General API Rules

All list endpoints support pagination.

Default page size: 20

All responses include:

{
  "success": true|false,
  "data": { ... } or [ ... ],
  "error": null or { "code": "string", "detail": "string" }
}

Error response (non-field errors):

{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "detail": "string",
    "fields": {
      "field_name": ["error message"]
    }
  }
}

HTTP Status Codes:

- 200: Success
- 201: Created
- 204: No Content
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 409: Conflict
- 422: Unprocessable Entity
- 429: Too Many Requests
- 500: Internal Server Error

---

# 14. Mobile API Integration

The mobile application consumes the same API as the web application.

Mobile-specific endpoints:

- POST /api/auth/register/ (public, owner registration)

Mobile-exclusive features:

- AI screening image upload from device camera/gallery
- Push notification registration

Mobile-accessible endpoints for owners:

- GET /api/consultations/ (read-only)
- GET /api/prescriptions/ (read-only)
- GET /api/vaccinations/ and POST /api/vaccinations/
- PUT /api/vaccinations/{id}/ and DELETE /api/vaccinations/{id}/
  (owner-reported records only, see section 8)

Notification endpoints (in-app notifications, see section 14):

- GET /api/notifications/
- GET /api/notifications/unread-count/
- PATCH /api/notifications/{ntf_id}/read/
- PATCH /api/notifications/read-all/

All other endpoints are shared between web and mobile.

---

# 14. Notification Endpoints

Requires authentication. Allowed roles: Owner, Receptionist (Veterinarians receive 403).
Users can only read or modify their own notifications (foreign ids return 404).

`ntf_type` values: APPOINTMENT_CREATED, APPOINTMENT_CONFIRMED, APPOINTMENT_CANCELLED,
APPOINTMENT_REMINDER, CONSULTATION_AVAILABLE, PRESCRIPTION_AVAILABLE, VACCINATION_REMINDER,
AI_SCREENING_COMPLETED, AI_SCREENING_REVIEWED, PAYMENT_COMPLETED, PAYMENT_EXPIRED, SYSTEM.

## GET /api/notifications/

Query parameters:

- unread_only ("true" to return only unread notifications)
- page, page_size (default 20)

Response:

{
  "total": 3,
  "page": 1,
  "page_size": 20,
  "total_pages": 1,
  "results": [
    {
      "ntf_id": "uuid",
      "ntf_title": "Appointment confirmed",
      "ntf_message": "Your appointment has been confirmed.",
      "ntf_type": "APPOINTMENT_CONFIRMED",
      "ntf_is_read": false,
      "ntf_reference_table": "APPOINTMENT",
      "ntf_reference_id": "uuid or null",
      "ntf_created_at": "...",
      "ntf_read_at": null
    }
  ]
}

## GET /api/notifications/unread-count/

Response:

{ "unread_count": 2 }

## PATCH /api/notifications/{ntf_id}/read/

Marks a single notification as read (idempotent; `ntf_read_at` is not overwritten).
Returns the serialized notification. 404 if unknown or owned by another user.

## PATCH /api/notifications/read-all/

Marks all of the caller's unread notifications as read.

Response:

{ "detail": "All notifications marked as read." }
