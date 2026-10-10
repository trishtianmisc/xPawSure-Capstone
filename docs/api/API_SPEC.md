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

Requires authentication.

Owner: Returns own pets' appointments.
Clinic staff: Returns clinic appointments.

Query parameters:

- date, status, veterinarian_id, pet_id, page, page_size

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

---

## GET /api/appointments/{id}/

Requires authentication.

Owner: own pets' appointments only. Clinic staff: appointments within their own clinic,
otherwise `404`.

---

## PATCH /api/appointments/{id}/

Requires authentication. Receptionist or clinic admin.

Update appointment status. Clinic staff can only update appointments within their own
clinic, otherwise `404`.

---

## DELETE /api/appointments/{id}/

Requires authentication.

Soft delete.

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
chief_complaint, subjective, objective, assessment, plan, diagnosis, treatment,
notes, created_at }

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
      "ais_model_version": "mock-0.0.1",
      "ais_inference_time_ms": null,
      "ais_device": "server-mock",
      "ais_status": "PENDING_REVIEW",
      "ais_source": "MOCK",
      "ais_created_at": "..."
    }
  ]
}

---

## POST /api/owner/screenings/

Requires authentication (Owner role). Pet must belong to the owner and be active (404 otherwise).

`source: "MOCK"` — development placeholder while the on-device AI ships.
The server fabricates the prediction/confidence and stamps `ais_model_version = mock-0.0.1`,
`ais_source = MOCK`. Used by the mobile booking wizard ("Run demo scan").

`source: "DEVICE"` — contract for the future on-device TFLite/tfjs result upload.
Requires `prediction` (disease code or name, resolved against DISEASE) and `model_version`.
Optional: `confidence` (0-100), `inference_time_ms`, `device`.

Request:

{
  "pet_id": "uuid",
  "source": "MOCK | DEVICE",
  "prediction": "string (DEVICE only)",
  "confidence": "number 0-100 (DEVICE only)",
  "model_version": "string (DEVICE only)",
  "inference_time_ms": "integer (optional)",
  "device": "string (optional)"
}

Response `201` with the screening object (see GET above).

Business rules:

- Only veterinarians may later change `ais_status` (vet review UI is future work).
- AI predictions are immutable after creation.
- `ais_source = MOCK` rows exist so ML training sets can exclude placeholder data.

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
