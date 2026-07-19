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

---

## PUT /api/owner/profile/

Requires authentication. Owner only.

Request:

{
  "address": "string (optional)",
  "profile_picture": "file (optional)"
}

Response (200)

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

---

## DELETE /api/pets/{id}/

Requires authentication.

Soft delete.

Owner: Can delete own pets.
Clinic staff: Can delete any pet at their clinic.

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

Owner: Books appointment for own pet.
Receptionist: Books appointment for any pet at clinic.

Request:

{
  "pet_id": "uuid",
  "date": "date",
  "time": "time",
  "reason": "string (optional)",
  "veterinarian_id": "uuid"
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

# 6. Consultation Endpoints

## GET /api/consultations/

Requires authentication.

Owner: Returns consultations for own pets (read-only).
Clinic staff: Returns consultations at their clinic.

---

## GET /api/consultations/{id}/

Requires authentication.

---

## POST /api/consultations/

Requires authentication. Veterinarian only.

---

## PUT /api/consultations/{id}/

Requires authentication. Veterinarian only.

---

# 7. Prescription Endpoints

## GET /api/prescriptions/

Requires authentication.

Owner: Returns prescriptions for own pets (read-only).
Clinic staff: Returns prescriptions at their clinic.

---

## GET /api/prescriptions/{id}/

Requires authentication.

---

## POST /api/prescriptions/

Requires authentication. Veterinarian only.

---

# 8. Vaccination Endpoints

## GET /api/vaccinations/

Requires authentication.

Owner: Returns vaccinations for own pets (read-only).
Clinic staff: Returns vaccinations at their clinic.

---

## GET /api/vaccinations/{id}/

Requires authentication.

---

## POST /api/vaccinations/

Requires authentication. Veterinarian only.

---

# 9. AI Screening Endpoints

## GET /api/screenings/

Requires authentication.

Owner: Returns screenings for own pets (read-only).
Clinic staff: Returns screenings at their clinic.

---

## POST /api/screenings/

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

## GET /api/screenings/{id}/

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

Mobile-accessible endpoints (read-only for owners):

- GET /api/consultations/
- GET /api/prescriptions/
- GET /api/vaccinations/

All other endpoints are shared between web and mobile.
