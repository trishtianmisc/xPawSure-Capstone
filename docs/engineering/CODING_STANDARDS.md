# API_SPEC.md

> Version: 2.0
> Project: XPawSure
> API Version: v1
> Architecture: REST API
> Backend: Django REST Framework

---

# 1. Purpose

This document defines the REST API specification for XPawSure.

It serves as the single source of truth for:

- Django REST Framework implementation
- React Web API integration
- React Native API integration
- AI Coding Assistants
- Future OpenAPI / Swagger documentation

Every endpoint implemented in the backend must follow this specification.

---

# 2. API Principles

XPawSure follows RESTful API principles.

Rules:

- JSON request and response bodies
- JWT Authentication
- HTTPS only
- Versioned endpoints
- Consistent error responses
- Pagination support
- Filtering
- Sorting
- UUID identifiers

---

# 3. Base URL

Development

```
http://localhost:8000/api/v1
```

Production

```
https://api.xpawsure.com/api/v1
```

---

# 4. Authentication

Authentication uses JWT.

Login

```
POST /auth/login
```

Refresh Token

```
POST /auth/refresh
```

Logout

```
POST /auth/logout
```

Current User

```
GET /auth/me
```

Password Change

```
POST /auth/change-password
```

---

# 5. Request Headers

Protected endpoints require:

```
Authorization: Bearer <token>
```

Content Type

```
Content-Type: application/json
```

---

# 6. Standard Success Response

```json
{
    "success": true,
    "message": "Request successful.",
    "data": {}
}
```

---

# 7. Standard Error Response

```json
{
    "success": false,
    "message": "Validation failed.",
    "errors": {
        "email": [
            "This field is required."
        ]
    }
}
```

---

# 8. HTTP Status Codes

```
200 OK

201 Created

204 No Content

400 Bad Request

401 Unauthorized

403 Forbidden

404 Not Found

409 Conflict

422 Validation Error

500 Internal Server Error
```

---

# 9. Authentication Endpoints

## Login

```
POST /auth/login
```

Request

```json
{
    "email": "vet@example.com",
    "password": "password"
}
```

Response

```json
{
    "success": true,
    "data": {
        "access": "...",
        "refresh": "...",
        "user": {}
    }
}
```

---

## Current User

```
GET /auth/me
```

Returns the authenticated user.

---

# 10. Users

Base Route

```
/users
```

Endpoints

```
GET /users

GET /users/{id}

POST /users

PUT /users/{id}

PATCH /users/{id}

DELETE /users/{id}
```

---

# 11. Owners

Base Route

```
/owners
```

Endpoints

```
GET /owners

GET /owners/{id}

POST /owners

PUT /owners/{id}

PATCH /owners/{id}

DELETE /owners/{id}
```

---

# 12. Pets

Base Route

```
/pets
```

Endpoints

```
GET /pets

GET /pets/{id}

POST /pets

PUT /pets/{id}

PATCH /pets/{id}

DELETE /pets/{id}
```

Additional Routes

```
GET /owners/{id}/pets

GET /pets/{id}/history

GET /pets/{id}/consultations

GET /pets/{id}/vaccinations
```

---

# 13. Appointments

```
GET /appointments

GET /appointments/{id}

POST /appointments

PUT /appointments/{id}

PATCH /appointments/{id}

DELETE /appointments/{id}
```

Additional

```
GET /appointments/today

GET /appointments/upcoming

GET /appointments/calendar
```

---

# 14. Consultations

```
GET /consultations

GET /consultations/{id}

POST /consultations

PUT /consultations/{id}
```

Additional

```
GET /pets/{id}/consultations

GET /consultations/{id}/prescriptions

GET /consultations/{id}/screenings
```

Consultations cannot be deleted.

---

# 15. Prescriptions

```
GET /prescriptions

POST /prescriptions

PUT /prescriptions/{id}

GET /consultations/{id}/prescriptions
```

---

# 16. Vaccinations

```
GET /vaccinations

POST /vaccinations

PUT /vaccinations/{id}

GET /pets/{id}/vaccinations
```

---

# 17. AI Screenings

```
GET /screenings

GET /screenings/{id}

POST /screenings
```

Mobile uploads AI results using

```
POST /screenings
```

Example Request

```json
{
    "consultation_id": "...",
    "prediction": "Mange",
    "confidence": 0.98,
    "model_version": "1.0.0",
    "inference_time": 0.41
}
```

Example Response

```json
{
    "success": true,
    "data": {
        "screening_id": "...",
        "prediction": "Mange"
    }
}
```

---

# 18. Reports

```
GET /reports/dashboard

GET /reports/appointments

GET /reports/patients

GET /reports/vaccinations
```

Reports are read-only.

---

# 19. Notifications

```
GET /notifications

PATCH /notifications/{id}/read

DELETE /notifications/{id}
```

---

# 20. Pagination

Collection endpoints return

```json
{
    "count": 250,
    "next": "...",
    "previous": "...",
    "results": []
}
```

Default page size

```
20
```

Maximum page size

```
100
```

---

# 21. Filtering

Examples

```
GET /pets?breed=Shih Tzu

GET /appointments?status=confirmed

GET /owners?search=John
```

---

# 22. Sorting

Example

```
GET /pets?ordering=name

GET /appointments?ordering=-appointment_date
```

---

# 23. Searching

Supported parameter

```
search=
```

Examples

```
GET /owners?search=Maria

GET /pets?search=Buddy
```

---

# 24. File Upload

Endpoint

```
POST /uploads/images
```

Allowed

- jpg
- jpeg
- png
- webp

Maximum

```
10 MB
```

---

# 25. Permissions

Super Admin

Manage all clinics, create clinics and Clinic Admin accounts, suspend or activate clinics, and view platform analytics

Clinic Admin

Manage their clinic profile, Veterinarians, Receptionists, and clinic reports

Receptionist

Register owners and pets, schedule appointments, and check patients in

Veterinarian

Manage consultations, review AI screening results, create prescriptions, and maintain medical records

Every clinic data record must be scoped to exactly one clinic. Only Super Admins may access records across clinics.

---

# 26. Versioning

Current

```
v1
```

Future versions

```
v2

v3
```

Breaking changes require a new API version.

---

# 27. Rate Limiting

Authentication endpoints

```
10 requests/minute
```

General API

```
100 requests/minute
```

File Upload

```
20 uploads/hour
```

---

# 28. Validation Rules

Backend validates

- Required fields
- UUID format
- Dates
- File types
- Image size
- Email uniqueness
- Foreign keys

Client-side validation never replaces backend validation.

---

# 29. OpenAPI Compliance

Every endpoint should include:

- Summary
- Description
- Tags
- Parameters
- Request Body
- Responses
- Authentication Requirement
- Example Requests
- Example Responses

Swagger/OpenAPI documentation should be generated directly from the Django implementation.

---

# 30. Rules for AI Coding Assistants

When generating backend code:

- Implement endpoints exactly as defined.
- Use Django REST Framework ViewSets where appropriate.
- Keep business logic in services.
- Validate all inputs.
- Return consistent JSON responses.
- Enforce permissions before executing business logic.
- Never expose sensitive fields.
- Keep API versioning consistent.
- Write automated tests for every endpoint.
