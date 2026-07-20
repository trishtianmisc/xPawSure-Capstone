# Changelog

## [0.2.0] — 2026-07-20

### Added
- Clinic CRUD (list, detail, create, update, soft delete, status change)
- Clinic Admin auto-provisioning on clinic creation with welcome email
- Login endpoint with JWT access + refresh tokens
- Rate limiting on login (30 req/min per IP)
- Database indexes on commonly filtered columns
- Frontend code-splitting with `React.lazy()`

### Changed
- `.env.example` sanitized — no real credentials exposed
- `CreateClinicPage` now uses `react-hook-form` with Zod validation
- Email field required on clinic creation form
- Clinic stats optimized from 5 queries to 1 aggregate query
- Default Vite README replaced with project documentation

### Fixed
- Email not sent when clinic registered without email field
- Global throttle breaking custom `User` model (removed)

## [0.1.0] — 2026-07-17

### Added
- Project scaffold with Django + React + Vite + TypeScript
- Supabase PostgreSQL database connection
- Custom JWT authentication
- User model with role-based access (SUPER_ADMIN, CLINIC_ADMIN, VETERINARIAN, RECEPTIONIST, OWNER)
- StaffProfile model
- Audit logging system
- Super Admin dashboard with clinic stats
- Clinic list page with search, filter, sort, pagination
- Clinic detail page with edit modal and danger zone
- Dashboard layout with sidebar navigation and breadcrumbs
- Session expiry detection with toast notification
- UI component library (Button, Input, Textarea, Card, Alert, Badge, Modal, Toast)
