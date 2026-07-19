# FRONTEND_ARCHITECTURE.md

> Version: 2.0
> Project: XPawSure
> Frontend: React 19 + Vite + TypeScript
> Application: Veterinary Clinic Web Application

---

# 1. Purpose

This document defines the frontend architecture for the XPawSure Veterinary Clinic Web Application.

Its purpose is to ensure all frontend code follows a consistent, scalable, and maintainable structure.

Every React component, page, hook, service, and feature must follow this document.

This document applies only to the web application. The mobile application follows MOBILE_ARCHITECTURE.md.

---

# 2. Technology Stack

Framework

- React 19
- Vite

Language

- TypeScript

Styling

- Tailwind CSS

Routing

- React Router

Server State

- TanStack Query

Forms

- React Hook Form

Validation

- Zod

Icons

- Lucide React

Tables

- TanStack Table

Charts

- Recharts

Notifications

- Sonner

HTTP Client

- Axios

---

# 3. Frontend Architecture

The frontend follows a Feature-Based Architecture.

Application

↓

Routes

↓

Pages

↓

Features

↓

Components

↓

Hooks

↓

API Services

↓

Backend

Every feature owns its own UI, hooks, validation, and API logic.

---

# 4. Folder Structure

```

frontend/web/

src/

assets/

components/

features/

hooks/

layouts/

lib/

pages/

routes/

services/

store/

styles/

types/

utils/

App.tsx

main.tsx

```

---

# 5. Feature Structure

Every feature follows the same structure.

```

pets/

components/

pages/

hooks/

services/

types/

validation/

constants/

index.ts

```

Examples

```

owners/

appointments/

consultations/

vaccinations/

reports/

```

---

# 6. Components

Shared components belong in:

```

components/

```

Examples

```

Button

Card

Input

Table

Badge

Modal

Dialog

Loader

Avatar

Pagination

```

Feature-specific components remain inside their feature folder.

---

# 7. Pages

Pages represent routes.

Example

```

pages/

Dashboard.tsx

Login.tsx

NotFound.tsx

```

Pages should compose features instead of containing complex logic.

---

# 8. Layouts

Layouts define application shells.

Examples

```

AuthLayout

DashboardLayout

PublicLayout

```

Layouts contain:

- Navigation
- Sidebar
- Header
- Footer

---

# 9. Routing

Use React Router.

Routes should be grouped by authentication.

Example

```

/

/login

/dashboard

/owners

/pets

/appointments

/consultations

/reports

/settings

```

Protected routes require authentication.

---

# 10. API Layer

Every feature owns its API services.

Example

```

pets/

services/

petService.ts

```

Service example

```
getPets()

createPet()

updatePet()

deletePet()
```

Never call Axios directly inside components.

---

# 11. TanStack Query

Use TanStack Query for server state.

Queries

```
usePets()

useOwners()

useAppointments()
```

Mutations

```
useCreatePet()

useUpdatePet()

useDeletePet()
```

Benefits

- Automatic caching
- Background refresh
- Request deduplication
- Optimistic updates

---

# 12. Forms

All forms use

React Hook Form

+

Zod

Validation belongs inside

```

validation/

```

Never manually validate forms inside components.

---

# 13. Local State

Use React state only for UI.

Examples

- Modal open
- Selected row
- Current tab
- Search input

Business data belongs in TanStack Query.

---

# 14. Global State

Use Zustand for lightweight global state.

Global state includes

- Logged-in user
- Theme
- Sidebar state
- Authentication

Avoid storing server data globally.

---

# 15. Component Guidelines

Components should be

- Small
- Reusable
- Typed
- Stateless whenever possible

Avoid components larger than 300 lines.

Break large components into smaller ones.

---

# 16. Styling

Use Tailwind CSS.

Rules

- Mobile-first
- Utility-first
- Reusable components
- Consistent spacing
- Responsive design

Avoid inline styles.

---

# 17. Error Handling

Display user-friendly errors.

Never expose backend stack traces.

Show validation errors beside form fields.

---

# 18. Loading States

Every API request must display loading feedback.

Examples

- Skeleton loaders
- Loading buttons
- Spinner
- Progress indicators

Avoid blank pages.

---

# 19. Empty States

Every table or list should support

- Empty state
- No search results
- No appointments
- No pets
- No reports

Provide actionable messages.

---

# 20. File Uploads

Uploads use drag-and-drop or file picker.

The Django REST API stores uploaded files in Supabase Storage.

Supported

- JPG
- PNG
- WEBP

Show upload progress.

Preview images before upload.

---

# 21. Accessibility

Requirements

- Keyboard navigation
- Focus indicators
- Semantic HTML
- ARIA labels where needed
- Color contrast compliance

Accessibility is required, not optional.

---

# 22. Performance

Use

- React.lazy()
- Code splitting
- Memoization where appropriate
- Virtualized tables for large datasets
- Image optimization

Avoid unnecessary re-renders.

---

# 23. Testing

Frontend tests include

- Component tests
- Hook tests
- Route tests
- Form validation tests
- API mocking

Testing tools

- Vitest
- React Testing Library
- MSW

---

# 24. Design Principles

The UI should be

- Clean
- Professional
- Fast
- Consistent
- Minimal

Avoid excessive animations.

Focus on usability for veterinary clinic staff.

---

# 25. Rules for AI Coding Assistants

When generating frontend code:

- Follow the feature-based folder structure.
- Keep components focused on presentation.
- Place API calls in feature services.
- Use TanStack Query for server data.
- Use React Hook Form + Zod for forms.
- Reuse shared components before creating new ones.
- Maintain strict TypeScript.
- Follow accessibility guidelines.
- Ensure responsive layouts.
- Write frontend tests for reusable logic.
