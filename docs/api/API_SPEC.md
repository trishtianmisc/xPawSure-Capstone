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
    "role": "string"
  }
}

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
  "is_active": true
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
  "role": "string"
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

---

## PATCH /api/appointments/{id}/

Requires authentication. Receptionist or clinic admin.

Update appointment status.

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

Owner read-only GETs are implemented. Clinic-staff scoping and the
veterinarian write flow below are not yet implemented.

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

Not yet implemented (future veterinarian flow).

---

## PUT /api/consultations/{id}/

Requires authentication. Veterinarian only.

Not yet implemented (future veterinarian flow).

---

# 7. Prescription Endpoints

Owner read-only GETs are implemented. Clinic-staff scoping and the
veterinarian write flow below are not yet implemented.

## GET /api/prescriptions/

Requires authentication.

Owner: Returns prescriptions for own pets (read-only).
Clinic staff: Returns prescriptions at their clinic.

Query params:

- pet_id (optional): filter by pet. Foreign or unknown pet returns an empty
  list; invalid UUID returns 400.

Response (200): Array of { id, consultation_id, pet_id, pet_name, veterinarian,
instructions, items, created_at } where items is an array of
{ id, medicine_name, dosage, frequency, duration, route, quantity, notes }

---

## GET /api/prescriptions/{id}/

Requires authentication.

Response (200): Prescription object as above. Returns 404 for prescriptions
that do not belong to the requesting owner.

---

## POST /api/prescriptions/

Requires authentication. Veterinarian only.

Not yet implemented (future veterinarian flow).

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
      "ais_created_at": "...",
      "ais_check_verdict": "AGREE | DISAGREE | UNCERTAIN | UNAVAILABLE",
      "ais_check_notes": "string",
      "ais_check_model": "gemini-3.5-flash",
      "ais_check_at": "timestamp or null"
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
Optional: `confidence` (0-100), `inference_time_ms`, `device`, `image`.

`image` (optional) — the screened photo as a data URL (`data:image/jpeg;base64,...`) or raw
base64 string, max 2 MB. When present on a `DEVICE` screening, the server runs an advisory
LLM second check (Gemini) with the image and returns the verdict in the response
(`ais_check_verdict`, `ais_check_notes`, `ais_check_model`, `ais_check_at`).
The image is forwarded to the LLM for that single call and is never stored.
The second check is advisory only: it never changes `ais_status` (always `PENDING_REVIEW`).
If the LLM is unconfigured, times out, or errors, the screening still saves with
`ais_check_verdict = "UNAVAILABLE"`. An invalid or oversized `image` returns `400`.

Request:

{
  "pet_id": "uuid",
  "source": "MOCK | DEVICE",
  "prediction": "string (DEVICE only)",
  "confidence": "number 0-100 (DEVICE only)",
  "model_version": "string (DEVICE only)",
  "inference_time_ms": "integer (optional)",
  "device": "string (optional)",
  "image": "data-url or base64, max 2 MB (optional, DEVICE only)"
}

Response `201` with the screening object (see GET above), including the second-check fields.

Business rules:

- Only veterinarians may later change `ais_status` (vet review UI is future work).
- The LLM second check can never change `ais_status`; only a human may CONFIRM/DISMISS.
- AI predictions are immutable after creation.
- `ais_source = MOCK` rows exist so ML training sets can exclude placeholder data.
  MOCK screenings skip the second check.

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

## GET /api/users/

Clinic Admin or Super Admin.

Returns users within the admin's own clinic (or all clinics for Super Admin).

## POST /api/users/

Clinic Admin or Super Admin.

Creates staff users (VETERINARIAN, RECEPTIONIST) within the admin's own clinic.

---

# 12. General API Rules

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

# 13. Mobile API Integration

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
