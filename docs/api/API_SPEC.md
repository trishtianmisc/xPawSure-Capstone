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
  receptionist's own clinic whose status is not `CANCELLED` or `NO_SHOW`. A pet
  becomes a clinic patient once it has a non-cancelled, non-no-show appointment
  there; a pet whose only appointments were cancelled or no-show is not listed.
- `scope=owner` (requires `owner_id`): that owner's active pets from any clinic.
  Used by the booking form so walk-in owners can be booked; after a non-cancelled
  booking the pet appears in the clinic's Patients tab.
- Detail and history endpoints still require only a non-deleted appointment at
  the clinic, so a pet removed from the directory by the rule above remains
  reachable by direct link (read-only access is unchanged).
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

# 4B. Clinic Admin Patient Endpoints (Web)

Read-only. Requires authentication as Clinic Admin. Other roles receive `403`;
all unsafe methods (`POST`, `PUT`, `PATCH`, `DELETE`) receive `403`.

A patient is the canonical clinic patient definition: an active, non-deleted pet
with a non-deleted appointment at the caller's clinic whose status is not
`CANCELLED` or `NO_SHOW`. This is the same definition used by the clinic admin
"Total Patients" KPI and the receptionist Patients directory.

## GET /api/clinic/patients/

Query parameters:

- `search`: pet name, owner first/last name, phone, or email
- `breed`: breed UUID
- `vaccination_status`: `up_to_date`, `due_soon`, `overdue`, or `none_recorded`
- `has_no_shows`: `true`/`1`/`yes`
- `sort`: `name`, `last_visit`, or `no_shows`
- `order`: `asc` or `desc`
- `page`, `page_size` (default `20`, maximum `100`)

Invalid `breed` or `vaccination_status` returns `400`.

Response:

```json
{
  "total": 12,
  "total_patients": 48,
  "page": 1,
  "page_size": 20,
  "total_pages": 3,
  "results": [
    {
      "id": "uuid",
      "name": "Bella",
      "profile_picture": null,
      "breed": "Shih Tzu",
      "sex": "FEMALE",
      "age": 3,
      "owner": {
        "name": "Maria Santos",
        "phone": "09171234567",
        "email": "maria@example.com"
      },
      "last_visit_date": "2026-10-01",
      "next_appointment_date": "2026-10-29",
      "total_appointments": 4,
      "no_show_count": 1,
      "cancelled_count": 2,
      "vaccination_status": "overdue"
    }
  ]
}
```

Notes:

- `total_patients` is the unfiltered canonical clinic patient count; `total` is
  the filtered count.
- `last_visit_date` is the latest past, non-cancelled/non-no-show appointment.
- `next_appointment_date` is the earliest `PENDING`/`CONFIRMED` appointment at or
  after the current time.
- Counts include all non-deleted clinic appointments, including cancelled and
  no-show appointments.
- Dates are clinic-local calendar dates; the clinic timezone is used to compute
  age and "today".

## GET /api/clinic/patients/{id}/

Returns one clinic patient. Pets outside the clinic or pets that are not clinic
patients return `404`.

Response:

```json
{
  "id": "uuid",
  "name": "Bella",
  "profile_picture": null,
  "breed": "Shih Tzu",
  "sex": "FEMALE",
  "age": 3,
  "date_of_birth": "2023-02-01",
  "weight": "6.50",
  "color": "Cream",
  "registered_at": "2024-01-15T02:30:00Z",
  "owner": {
    "name": "Maria Santos",
    "phone": "09171234567",
    "email": "maria@example.com"
  },
  "summary": {
    "consultations": 3,
    "vaccinations": 4,
    "ai_screenings": 5
  },
  "vaccination_status": "overdue",
  "vaccinations": [
    {
      "name": "Rabies",
      "date_given": "2026-01-05",
      "next_due": "2027-01-05"
    }
  ],
  "appointments": [
    {
      "apt_id": "uuid",
      "apt_scheduled_at": "2026-10-02T01:00:00Z",
      "apt_type": "CONSULTATION",
      "apt_status": "COMPLETED",
      "vet_name": "Dr. Reyes",
      "apt_cancellation_reason": null
    }
  ]
}
```

Scoping and privacy:

- Consultation summary and appointment history are clinic-scoped.
- Vaccinations and AI screening counts are pet-level, including records created
  outside the clinic.
- Appointment history is newest first and limited to 50 records.
- `apt_cancellation_reason` is returned only for `CANCELLED` appointments.
- The response never exposes QR codes, microchips, diagnoses, prescriptions,
  consultation notes, treatment details, screening results/images, or
  appointment reasons.

---

# 5. Appointment Endpoints

## GET /api/appointments/

Requires authentication. Receptionist or Clinic Admin (read). Owner bookings use
`GET /api/owner/appointments/`.

Owner: Returns own pets' appointments.
Clinic staff: Returns clinic appointments (clinic-scoped).

Query parameters:

- date (single day, `YYYY-MM-DD`), status, vet_id, pet_id, search, page, page_size
- date_from, date_to (`YYYY-MM-DD`, inclusive range on clinic-local calendar days
  in the clinic's configured timezone; used by Clinic Admin date-range filtering). `400` if a value is not
  a valid date or if `date_from` is after `date_to`.
- overdue (`1`/`true`): only past-due appointments (status `PENDING` or `CONFIRMED`
  with `apt_scheduled_at` already in the past). Used by the receptionist dashboard's
  "Needs attention" indicator; additive, combines with the other filters.

Notes:

- `GET /api/appointments/` is read-only for Clinic Admin; creating appointments
  remains receptionist-only (`POST` returns `403` for Clinic Admin).

---

## GET /api/dashboard/stats/

Requires authentication. Receptionist or Clinic Admin dashboard summary
(read-only).

Response: `today` (clinic-local-day status counts), `total_owners`, `total_pets`,
`recent_appointments`, and `needs_attention` — the count of past-due
appointments still awaiting action. `today.pending` counts only upcoming
`PENDING` appointments; past-due ones surface through `needs_attention`
instead of double-counting in Pending/Confirmed.

`total_pets` is the canonical clinic-patient count: distinct active,
non-deleted pets with at least one non-deleted appointment at the clinic whose
status is not `CANCELLED` or `NO_SHOW`. `total_owners` is the number of owners
of those pets. A pet that never booked at the clinic is not counted; repeated
visits count once; a pet whose only appointments were cancelled or no-show does
not count. The clinic admin "Total Patients" KPI, the receptionist
`GET /api/receptionist/pets/` directory, and the future clinic admin Patients
page must all use this definition.

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

Initial status: owner bookings start as `PENDING` (awaiting clinic confirmation; owner
notified with `APPOINTMENT_CREATED`). Receptionist desk bookings start as `CONFIRMED`
(owner notified with `APPOINTMENT_CONFIRMED`).

Request (owner):

{
  "pet_id": "uuid",
  "slot_id": "uuid",
  "apt_type": "CONSULTATION | FOLLOW_UP | VACCINATION | AI_REVIEW | EMERGENCY",
  "reason": "string (optional)",
  "screening_id": "uuid (required for owner bookings)"
}

Slot validation: the slot's day must be open in `CLINIC_OPERATING_HOURS`, and the
slot must fall inside that day's opening/closing times. A closed day returns
`{ "detail": "The clinic is closed on this day." }`; outside hours returns
`{ "detail": "This slot is outside the clinic operating hours." }`.

---

## GET /api/appointments/{id}/

Requires authentication. Receptionist, veterinarian (own appointments only), or
Clinic Admin (read-only). Appointments outside the caller's clinic return `404`.

Clinic Admin receives a narrower, read-only summary for oversight: no
consultation, prescription, or other clinical records, and no owner contact
details. Beyond the shared appointment fields it adds:

- `created_by_role`: `RECEPTIONIST` or `OWNER` (null for legacy rows with no
  recorded creator).
- `status_change`: who set the current status, and when -
  `{ changed_at, changed_by, changed_by_role, source }`. `source` is `STAFF`
  for audited staff transitions, `SYSTEM` for the past-due auto-close (it runs
  without a user and is attributed by fallback), `UNKNOWN` otherwise; all
  fields are null when no status has been set yet (e.g. `PENDING`).
- `screening`: narrower AI summary exposing the final condition only, with
  `vet_diagnosis` and `reviewed_at` (the veterinarian's recorded outcome).
  `null` when no screening is linked. No clinical notes are exposed.

---

## PATCH /api/appointments/{id}/

Requires authentication. Receptionist.

Update appointment status. Clinic Admin cannot write appointments: a Clinic
Admin `PATCH` returns `403` (their access to this endpoint is read-only).
Appointments outside the caller's clinic return `404`. Veterinarians cannot
change status directly: a veterinarian `PATCH` returns `403`. Veterinarians
submit reschedule or cancellation requests through the endpoints in section
5A instead.

Time-based rules (clinic timezone "now"):

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
- Default window: last 30 clinic-local days ending today.
- Same `400` validation rules as `GET /api/appointments/` for the date params.

Response:

{ "results": [ { "date": "2026-10-01", "count": 3 }, { "date": "2026-10-02", "count": 0 } ] }

Days are bucketed on clinic timezone calendar boundaries and zero-filled across the
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
      "ais_model_version": "tflite-skin-1.0.0",
      "ais_inference_time_ms": 412,
      "ais_device": "android",
      "ais_status": "PENDING_REVIEW",
      "ais_source": "DEVICE",
      "ais_is_correct": null,
      "ais_created_at": "..."
    }
  ]
}

`ais_is_correct` is `null` until a consultation with a diagnosis is saved for
the linked appointment; it then becomes `true`/`false` (see verdict rules
below).

---

## POST /api/owner/screenings/

Requires authentication (Owner role). Pet must belong to the owner and be active (404 otherwise).

Uploads an on-device TFLite inference result. `source` must be `DEVICE`
(any other value returns 400). `prediction` (disease code or name, resolved
against DISEASE) and `model_version` are required; missing values return 400.

Request:

{
  "pet_id": "uuid",
  "source": "DEVICE",
  "prediction": "string (required)",
  "confidence": "number 0-100 (required)",
  "model_version": "string (required)",
  "inference_time_ms": "integer (optional)",
  "device": "string (optional)"
}

Response `201` with the screening object (see GET above).

Business rules:

- Only veterinarians may later change `ais_status` (vet review UI is future work).
- AI predictions are immutable after creation.
- When a consultation for the linked appointment is saved with a diagnosis,
  the backend compares it (normalized substring match of the disease name in
  the diagnosis) and stores `ais_is_correct`, `ais_compared_diagnosis`,
  `ais_compared_at`, plus the `con_id` link, for ML training/retraining sets.

---

## GET /api/screenings/stats/

Requires authentication (Clinic Admin). Clinic is resolved from the
authenticated staff profile; other roles get 403.

Screenings are scoped to pets that have a non-deleted appointment at the
authenticated admin's clinic (any appointment status). A pet treated at multiple
clinics therefore appears in each clinic's stats.

`screenings_pending_review` is derived, not read from `ais_status`: it counts
screenings whose `ais_status` is `PENDING_REVIEW` **and** `ais_compared_at` is
null. The status field is not transitioned after comparison in production, so
reviewed screenings are identified by `ais_compared_at` (the appointment detail
page uses the same rule). `screenings_by_disease` counts all screenings,
reviewed or not.

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

# 9A. Clinic Profile Endpoints (Clinic Admin)

Requires authentication. Clinic Admin (own clinic) or Super Admin.

## GET /api/clinic/profile/

Returns the clinic profile: name, address, contact details, and logo URL.

## PUT /api/clinic/profile/

Updates the clinic profile. Accepts the same fields as the response.

## POST /api/clinic/logo/

Multipart upload for the clinic logo (`logo` field). Replaces the existing logo.

## GET /api/clinic/settings/

Returns `appointment_duration`, `max_appointments_per_day`,
`allow_owner_booking`, and `timezone` (IANA name). `opening_time` and
`closing_time` are no longer part of this response; per-day hours live in
`/api/clinic/operating-hours/`.

## PUT /api/clinic/settings/

Updates clinic settings. `timezone` must be a valid IANA timezone (validated
with `zoneinfo`), for example `Asia/Manila`. Sending the removed
`opening_time` or `closing_time` fields returns `400` with a message pointing to
`/api/clinic/operating-hours/`.

Changing `timezone` does not shift existing slots or appointments; it changes
how clinic-local days/times are interpreted and displayed from then on.

## GET /api/clinic/operating-hours/

Returns the seven weekday rows ordered Monday to Sunday:

```json
{
  "results": [
    {
      "day_of_week": "MON",
      "day_index": 0,
      "is_closed": false,
      "opening_time": "09:00",
      "closing_time": "17:00"
    }
  ]
}
```

## PUT /api/clinic/operating-hours/

Replaces all seven weekday rows. Each row uses the shape above. Times are
required for open days; closed days may send `null`. At least one day must be
open, otherwise the API returns `400`
`{ "detail": "At least one day must be open." }`. For open days, closing time
must be after opening time.

These per-day rows are the single source of truth for slot generation and
booking validation. Slots are not generated on closed days, and bookings must
fall within the selected day's opening/closing times.

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
AI_SCREENING_COMPLETED, AI_SCREENING_REVIEWED, SYSTEM.

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

---

# 15. Clinic Admin Reports Endpoints (Web)

All four endpoints are Clinic Admin only, `GET` only (`IsClinicAdminReadOnly`).
Any write method returns `403`; unauthenticated requests return `401`. The
clinic scope always comes from the caller's own staff profile, never from the
request, so one clinic's admin cannot read another clinic's numbers.

Reports are strictly read-only: they never run past-due reconciliation
(BUSINESS_RULES section 23), so a stale PENDING appointment counts as
not-completed until the next dashboard or appointment-list reconciliation.

## Shared query parameters (all optional)

- `date_from`, `date_to` — `YYYY-MM-DD`, clinic-local calendar days.
  Omitting both defaults to the last 30 clinic-local days ending today;
  omitting one end fills only that end.
- `vet_id` — a `stf_id`. Malformed UUID returns `400 {"detail": "Invalid 'vet_id'."}`;
  an id outside the caller's clinic returns
  `400 {"detail": "'vet_id' does not belong to this clinic."}` (no data leak).

Validation errors (all `400` with `{"detail": "..."}`):

- `Invalid 'date_from'; expected YYYY-MM-DD.` (same for `date_to`)
- `'date_from' cannot be after 'date_to'.`
- `'date_from' and 'date_to' must span at most 366 days.`

Comparison period (`previous` in responses) is the equal-length window
immediately before the requested one: Oct 1-8 compares against Sep 23-30,
never against "last month".

Rate denominators: `completion_rate` and `no_show_rate` use elapsed,
non-cancelled appointments in the window (scheduled time already passed) as
the denominator; `cancellation_rate` uses all appointments in the window.
Rates are rounded to one decimal. An empty denominator yields `0`, never an
error.

## GET /api/reports/summary/

Query parameters: shared parameters above.

Response 200:

```json
{
  "total_appointments": 10,
  "completion_rate": 33.3,
  "no_show_rate": 50.0,
  "cancellation_rate": 40.0,
  "new_patients": 1,
  "previous": {
    "total_appointments": 0,
    "completion_rate": 0.0,
    "no_show_rate": 0.0,
    "cancellation_rate": 0.0,
    "new_patients": 0
  }
}
```

`new_patients` counts pets whose first qualifying (non-cancelled, non-no-show,
non-deleted) appointment at this clinic falls inside the window. It is always
clinic-wide, even when `vet_id` is supplied; the UI labels it "(all vets)"
in that case.

## GET /api/reports/appointments/

Query parameters: shared parameters above.

Response 200:

```json
{
  "series": [
    { "date": "2026-10-20", "count": 4 },
    { "date": "2026-10-21", "count": 2 }
  ],
  "by_status": [
    { "status": "PENDING", "count": 0 },
    { "status": "CONFIRMED", "count": 0 },
    { "status": "CHECKED_IN", "count": 0 },
    { "status": "IN_PROGRESS", "count": 1 },
    { "status": "COMPLETED", "count": 2 },
    { "status": "CANCELLED", "count": 4 },
    { "status": "NO_SHOW", "count": 3 }
  ]
}
```

`series` is zero-filled for every day in the window and bucketed by
clinic-local calendar day. `by_status` always returns all seven statuses
(zero-filled) so the chart legend stays stable between periods.

## GET /api/reports/vet-workload/

Query parameters: shared parameters above.

Response 200:

```json
{
  "results": [
    {
      "vet_id": "01520dfe-3ba0-41a3-a7c0-d5dda3889ebb",
      "vet_name": "Hey Sister",
      "total": 10,
      "completed": 2,
      "no_shows": 3,
      "avg_per_day": 1.7
    }
  ],
  "days": 6
}
```

`avg_per_day` divides each vet's totals by `days`, the number of clinic
**open days** (`ClinicOperatingHours`, `is_closed = false`) inside the window,
falling back to the calendar-day count when the clinic has no open hours
configured. With `vet_id` supplied the list contains at most that vet.

## GET /api/reports/screenings/

Query parameters: shared parameters above.

Response 200:

```json
{
  "by_condition": [
    { "disease": "Bacterial", "count": 11 },
    { "disease": "Mange", "count": 11 }
  ],
  "avg_confidence": 82.8,
  "reviewed": 1,
  "pending_review": 36,
  "vet_confirmed": 1,
  "vet_changed": 0
}
```

Scoping notes:

- Clinic scope uses a pet-level semi-join (the pet has any non-deleted
  appointment at this clinic), so a screening still counts even when it was
  not attached to a booking. One row per screening regardless of how many
  appointments the pet has.
- With `vet_id` supplied, only screenings referenced by an appointment of
  that vet (in this clinic) are counted; unbooked screenings drop out.
  Clinic-wide figures include screenings not linked to a booking — the UI
  shows this caveat next to the filter.
- `ais_confidence` is stored as a 0-100 percentage and returned as-is;
  `avg_confidence` is `0.0` when there are no screenings.
- "Reviewed" is derived: `ais_compared_at` is set or the status moved off
  `PENDING_REVIEW`. `vet_confirmed` / `vet_changed` come from
  `ais_is_correct` on reviewed rows (true / false / null = not yet judged).

Frontend: `frontend/React/src/features/clinic-admin/reports/` (page route
`/clinic/reports`, CSV export is client-side and downloads
`xpawsure-report-summary_{date_from}_{date_to}.csv`).
