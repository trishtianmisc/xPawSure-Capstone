# REPOSITORY_STRUCTURE.md

> Version: 2.0
> Project: XPawSure

---

# 1. Purpose

This document defines the official repository structure of XPawSure.

All contributors and AI coding assistants must follow this structure when creating new files.

No files or directories should be added unless there is a valid architectural reason.

---

# 2. Repository Overview

```
xpawsure/
│
├── backend/
├── frontend/
├── database/
├── ai/
├── docs/
├── assets/
├── scripts/
├── deployment/
├── .github/
│
├── README.md
├── PROJECT_CONTEXT.md
├── SYSTEM_ARCHITECTURE.md
├── REPOSITORY_STRUCTURE.md
├── DATABASE_RULES.md
├── API_CONVENTIONS.md
├── CODING_STANDARDS.md
├── BUSINESS_RULES.md
├── DEVELOPMENT_WORKFLOW.md
└── LICENSE
```

---

# 3. Backend Structure

```
backend/
│
├── config/
│   ├── settings/
│   ├── urls.py
│   ├── asgi.py
│   ├── wsgi.py
│   └── manage.py
│
├── apps/
│
│   ├── users/
│   ├── owners/
│   ├── pets/
│   ├── appointments/
│   ├── consultations/
│   ├── prescriptions/
│   ├── vaccinations/
│   ├── screenings/
│   ├── notifications/
│   └── reports/
│
├── core/
│
├── media/
│
├── static/
│
└── requirements/
```

---

# 4. Standard Django App Layout

Every Django application must follow the same structure.

```
app_name/
│
├── migrations/
│
├── admin.py
├── apps.py
├── models.py
├── serializers.py
├── views.py
├── urls.py
├── services.py
├── permissions.py
├── filters.py
├── validators.py
├── signals.py
├── tasks.py
├── tests.py
└── __init__.py
```

Optional folders:

```
tests/
schemas/
utils/
constants/
```

---

# 5. Backend Folder Responsibilities

## config/

Contains Django project configuration.

Never place business logic here.

---

## apps/

Contains all business modules.

Each module owns its own:

- Models
- Services
- API
- Permissions
- Tests

Modules should communicate through services.

---

## core/

Contains reusable components shared across all modules.

Examples:

- Base models
- Custom permissions
- Authentication helpers
- Utility functions
- Common exceptions
- Pagination
- Mixins

---

## media/

Reserved for local development only. Production uploaded files are stored in Supabase Storage.

Examples:

- Pet images
- Skin images
- Reports

---

## static/

Stores static assets.

---

# 6. Frontend Structure

```
frontend/
│
├── web/
└── mobile/
```

---

# 7. Web Application Structure

```
web/
│
├── src/
│
├── assets/
├── components/
├── features/
├── hooks/
├── layouts/
├── lib/
├── pages/
├── routes/
├── services/
├── store/
├── types/
├── utils/
├── styles/
│
├── public/
│
└── tests/
```

---

# 8. Feature Folder Structure

Every feature follows this pattern.

```
appointments/

components/

hooks/

pages/

services/

types/

validation/

index.ts
```

Examples:

```
owners/

pets/

consultations/

vaccinations/

prescriptions/
```

---

# 9. Shared Components

Shared UI belongs here.

```
components/

Button

Input

Modal

Table

Card

Badge

Avatar

Loader

Pagination
```

Feature-specific components stay inside their feature folder.

---

# 10. Mobile Structure

```
mobile/
│
├── app/
├── assets/
├── components/
├── hooks/
├── services/
├── store/
├── navigation/
├── screens/
├── features/
├── types/
├── utils/
├── constants/
├── ai/
└── tests/
```

---

# 11. AI Folder

```
ai/

model/

preprocessing/

postprocessing/

labels/

utils/
```

Contains only client-side inference code.

No model training code belongs inside the application.

---

# 12. Database Folder

```
database/

schema/

erd/

seed/

migrations/

backup/
```

Contains database documentation and SQL utilities.

---

# 13. Documentation Folder

```
docs/

architecture/

api/

database/

development/

deployment/

testing/

meeting-notes/
```

---

# 14. Assets Folder

```
assets/

logos/

icons/

images/

mockups/

datasets/

diagrams/
```

---

# 15. Deployment Folder

```
deployment/

docker/

nginx/

scripts/

production/

staging/
```

Contains deployment-related configurations.

---

# 16. Naming Conventions

Folders:

- lowercase
- singular where appropriate
- descriptive

Examples:

```
pets

appointments

consultations
```

Avoid:

```
PetModule

appointmentFeature

NewFolder
```

---

# 17. File Naming

React:

```
PetCard.tsx

AppointmentTable.tsx

OwnerForm.tsx
```

Hooks:

```
useAppointments.ts

usePets.ts
```

Services:

```
appointmentService.ts

petService.ts
```

Python:

```
models.py

serializers.py

services.py
```

---

# 18. Import Rules

Always use absolute imports where practical.

Avoid deep relative imports.

Preferred:

```ts
import Button from "@/components/Button";
```

Avoid:

```ts
../../../components/Button
```

---

# 19. File Placement Rules

AI coding assistants must:

- Create files only in existing directories.
- Reuse shared components before creating new ones.
- Keep business logic inside services.
- Keep UI components presentation-focused.
- Do not duplicate utilities.
- Do not create miscellaneous folders.

---

# 20. Future Expansion

The structure is designed to support:

- Inventory module
- Billing module
- Pet owner portal
- Analytics dashboard
- Multi-clinic support
- Telemedicine
- Notifications
- AI model updates

New modules must follow the same folder conventions.

---

# 21. Rules for AI Coding Assistants

When generating files:

- Follow this repository structure exactly.
- Never invent new top-level folders.
- Keep modules isolated.
- Reuse existing shared code.
- Maintain feature-based organization.
- Place tests beside the modules they test.
- Keep the repository clean, predictable, and scalable.
