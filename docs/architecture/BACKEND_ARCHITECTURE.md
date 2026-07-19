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

Long-running operations should use background workers.

Examples:

- Email notifications
- Report generation
- Image processing
- Scheduled reminders

Avoid blocking API responses.

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
