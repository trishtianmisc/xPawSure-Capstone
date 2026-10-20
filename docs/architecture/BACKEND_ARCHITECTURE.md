# BACKEND_ARCHITECTURE.md

> Version: 2.0
> Project: XPawSure
> Framework: Django 5.x + Django REST Framework

---

# 1. Purpose

This document defines the backend architecture for XPawSure.

Its purpose is to ensure that every backend feature follows the same architecture, coding standards, and project organization.

Every Django application must comply with this document.

---

# 2. Architecture Overview

XPawSure follows a layered architecture.

```

HTTP Request
↓
Router
↓
View / ViewSet
↓
Serializer
↓
Service Layer
↓
Model
↓
Supabase PostgreSQL

```

Business logic must never exist inside Views.

Django connects to Supabase PostgreSQL using the PostgreSQL connection string.

---

# 3. Backend Folder Structure

```

backend/

config/
apps/
core/
media/
static/
requirements/

manage.py

```

---

# 4. Django Project

The Django project contains only configuration.

```

config/

settings/
base.py
development.py
production.py

urls.py

asgi.py

wsgi.py

```

Responsibilities:

- URL configuration
- Environment configuration
- Installed apps
- Middleware
- Authentication
- Database configuration

No business logic belongs here.

---

# 5. Applications

Each business domain is a Django app.

```

users
owners
pets
appointments
consultations
prescriptions
vaccinations
screenings
notifications
reports

```

Each app owns its own models, serializers, services, permissions, and API endpoints.

---

# 6. Standard App Structure

```

appointments/

migrations/

admin.py

apps.py

models.py

serializers.py

views.py

urls.py

services.py

permissions.py

validators.py

filters.py

signals.py

tasks.py

tests.py

```

Optional:

```

constants.py

exceptions.py

selectors.py

utils.py

```

---

# 7. Layer Responsibilities

## Models

Responsible only for:

- Database schema
- Relationships
- Basic model methods

Models must not contain business workflows.

---

## Serializers

Responsible for:

- Validation
- Input transformation
- Output formatting

Serializers must not contain business logic.

---

## Views / ViewSets

Responsible for:

- Receiving HTTP requests
- Authentication
- Permissions
- Calling services
- Returning responses

Views must remain thin.

---

## Services

Responsible for:

- Business logic
- Transactions
- Complex operations
- Multi-model interactions

Every business rule belongs here.

---

## Permissions

Responsible for:

- Authorization
- Role checking
- Object-level permissions
- Clinic data isolation

---

# 8. Service Layer Pattern

Example flow:

```

View

↓

AppointmentService.create()

↓

Model

↓

Database

```

Never do this:

```

View

↓

Model.objects.create()

```

unless it is a trivial CRUD operation.

---

# 9. Shared Core Module

The `core` package contains reusable components.

```

core/

authentication/

exceptions/

pagination/

permissions/

responses/

validators/

mixins/

utils/

constants/

```

Shared code belongs here.

Business-specific code does not.

---

# 10. API Response Standard

Every endpoint returns a consistent structure.

Success:

```json
{
  "success": true,
  "message": "Appointment created successfully.",
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "message": "Validation failed.",
  "errors": {}
}
```

---

# 11. Exception Handling

Use centralized exception handling.

Never expose Python tracebacks to clients.

Return meaningful error messages.

Log unexpected exceptions.

---

# 12. Authentication

Authentication uses JWT.

Protected endpoints require:

```

Authorization: Bearer <token>

```

Roles:

- Super Admin
- Clinic Admin
- Veterinarian
- Receptionist
- Owner

Authorization is enforced before service execution.

Every Owner, Pet, Appointment, Consultation, Prescription, Vaccination, AI Screening, and Report must be authorized against exactly one clinic. Only Super Admins may access data across clinics.

---

# 13. Database Transactions

Use transactions for operations involving multiple database writes.

Example:

- Create consultation
- Save prescription
- Save AI screening

These operations should succeed or fail together.

---

# 14. Validation Strategy

Validation occurs at multiple levels:

- Client-side
- Serializer
- Service
- Database constraints

Never rely solely on frontend validation.

---

# 15. Logging

Log:

- Login attempts
- Appointment creation
- Consultation updates
- AI screening uploads
- Critical errors

Never log passwords or sensitive tokens.

---

# 16. File Uploads

Supported uploads:

- Pet photos
- Skin lesion images
- Medical attachments

Rules:

- Validate file type
- Validate file size
- Generate unique filenames
- Store uploads in Supabase Storage

---

# 17. Background Tasks

This project does **not** use Celery, Redis, a job queue, a cron/scheduler, or
a background worker process. Everything runs inside the request lifecycle:

## Email delivery (synchronous, after commit)

Welcome emails for clinics, staff, and veterinarians — plus the staff
`reset-password` and `resend-welcome` re-sends — are sent synchronously
through `transaction.on_commit()` → `core.email_service.send_templated_email()`:

- The transport is selected by `EMAIL_BACKEND`, so callers and templates are
  unchanged between environments:
  - **Local development:** Django's built-in SMTP backend through Gmail
    (`django.core.mail.backends.smtp.EmailBackend`, `smtp.gmail.com:587`,
    STARTTLS). `EMAIL_HOST_USER` holds the Gmail address and
    `EMAIL_HOST_PASSWORD` a Google **App Password** — read from the
    environment only, never from source; `DEFAULT_FROM_EMAIL` defaults to
    `EMAIL_HOST_USER`.
  - **Production (Render Free):** `core.backends.brevo.BrevoEmailBackend`,
    which sends over Brevo's HTTPS API because Render Free blocks outbound
    SMTP ports. `BREVO_API_KEY` and `DEFAULT_FROM_EMAIL` (a Brevo-verified
    sender) come from the environment.
- Every attempt is capped by `EMAIL_TIMEOUT` (default 10s), applied as the
  SMTP socket timeout locally and the HTTP request timeout for Brevo.
- Failures (connection errors, Gmail auth errors, SMTP server errors, Brevo
  non-2xx responses, timeouts, render errors) are logged with
  `logger.exception()` — never with secrets — and converted into a failed
  `EmailResult`. An email failure never turns a committed registration or
  staff/clinic/veterinarian creation into an HTTP 500.
- A timeout leaves delivery uncertain, so sends are **never retried
  automatically** (a blind retry could deliver the message twice). The Brevo
  backend converts `requests.Timeout` into Python's built-in `TimeoutError`,
  preserving the existing uncertainty warning.
- Tests use Django's in-memory backend, a mocked `smtplib.SMTP`, or a mocked
  `requests.post` — they never contact Gmail or the Brevo API.

## Past-due appointments (refreshed on read)

There is no hourly job. Dashboard and appointment-list reads run
`AppointmentService.close_past_due(clinic_id)` for the requesting clinic
before returning — clinic-scoped, idempotent, and row-locked via
`select_for_update()`, so concurrent readers cannot double-apply a
transition. See `docs/api/API_SPEC.md` for the exact rules.

## Guidance

Avoid blocking API responses. If genuinely long-running work (report
generation, image processing, scheduled reminders) becomes a requirement,
introduce a queue and worker through an approved architecture change — do not
reintroduce Celery or Redis unilaterally.

---

# 18. Dependency Rules

Allowed:

```

Views

↓

Services

↓

Models

```

Forbidden:

```

Views → Views

Models → Views

Serializers → Services → Serializers

```

Keep dependencies one-directional.

---

# 19. Testing Strategy

Each app must include:

- Unit tests
- API tests
- Permission tests
- Validation tests
- Service tests

Target high coverage for service-layer logic.

---

# 20. Code Quality

Use:

- Ruff
- Black
- isort
- mypy

Run checks before committing code.

---

# 21. Performance Guidelines

- Use `select_related()` for foreign keys.
- Use `prefetch_related()` for many-to-many relationships.
- Avoid N+1 queries.
- Paginate large result sets.
- Index frequently queried fields.

---

# 22. Security Guidelines

- Never trust client input.
- Validate every request.
- Use parameterized queries (via ORM).
- Restrict file uploads.
- Hash passwords.
- Use HTTPS in production.
- Apply rate limiting.

---

# 23. Rules for AI Coding Assistants

When generating backend code:

- Create new features as Django apps under `backend/apps/`.
- Follow the standard app structure.
- Keep views thin and move business logic into services.
- Reuse shared utilities from `core/` instead of duplicating code.
- Use UUIDs for all primary keys.
- Write serializers for every API resource.
- Write permission classes for protected endpoints.
- Add automated tests for new services and APIs.
- Follow `DATABASE_SCHEMA.md` and `API_SPEC.md` exactly.
- If a requested feature conflicts with the project architecture, explain the conflict instead of inventing a new pattern.
