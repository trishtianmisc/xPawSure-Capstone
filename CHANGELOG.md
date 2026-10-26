# Changelog

## [0.4.0] — 2026-10-26

### Added
- Payments backend app (`backend/payments/`) with `PAYMENT` and `PAYMENT_EVENT` models, migrations, and admin
- `CLINIC_SETTINGS.CLS_CONSULTATION_FEE` (default `0.00`) set from Clinic Settings; a fee of `0` leaves booking unchanged
- Provider adapter (`PAYMENT_MODE=mock` | `paymongo`) with a signed mock checkout page and a PayMongo hosted-checkout + webhook adapter (HMAC `Paymongo-Signature` verification)
- Endpoints: `POST /api/payments/checkout/`, `GET /api/payments/`, `GET/POST cancel`, signed `GET/POST /api/payments/mock/{reference}/[confirm/]`, `POST /api/payments/webhooks/paymongo/`
- Payment gate on both booking paths (`POST /api/appointments/`, `POST /api/owner/appointments/`): payment is created, paid, and attached in one transaction, single-use per appointment
- Frontend `payments` feature: mock checkout page (`/payments/mock/:reference`), payment service/hooks, status badge, receptionist Payments list page
- Receptionist booking flow step 5 (payment method + checkout panel with polling), real payment status on Appointment Detail, `consultation_fee` field in Clinic Settings
- `apiErrorCode()` helper + tests; payment service, error, and clinic settings tests
- Backend payment test suite covering checkout, the booking gate, mock checkout, webhook verification, and access control
- `GET /api/owner/payments/` — owner-scoped receipt list (`status`, `appointment`, date and pagination filters), sharing the staff list envelope
- `consultation_fee` on `GET /api/owner/clinics/` so the booking wizard shows the amount before checkout
- Owner notifications `PAYMENT_COMPLETED` and `PAYMENT_EXPIRED`, fired once per transition (mock confirm, webhook, lazy expiry) with `NTF_REFERENCE_TABLE = PAYMENT`
- Mobile `payment` feature: types, service (`checkout`, detail, owner list, cancel), `usePayment`/`useCreateCheckout`/`useMyPayments`/`useCancelPayment` hooks
- Mobile booking wizard **Payment** step (step 8, only when the clinic charges a fee): GCash/Card choice, checkout opened with `Linking.openURL`, 2-second polling, `pay_id` reused when the slot is taken
- Mobile Payments receipts screen (`/(owner)/payments`) with status filters and resume-checkout for pending payments, linked from the Appointments header
- Mobile `apiErrorCode()` / `apiErrorStatus()` helpers branching on the documented error contract

### Changed
- `POST /api/appointments/` and `POST /api/owner/appointments/` accept an optional `pay_id` and return `{detail, code, amount, currency}` when payment is required

## [0.3.0] — 2026-07-22

### Added
- QR code generation on pet creation (server-side, `qrcode[pil]` + `Pillow`)
- QR image stored under `media/qr_codes/` with UUID filename
- `pet_qr_code` and `pet_qr_code_url` fields to Pet model + migration
- `qr_code` / `qr_code_url` fields in `PetResponseSerializer`
- `GET /api/pets/{id}/` detail endpoint scoped to owner
- `PetService.get_by_id()` with owner + active + not-deleted scoping
- Mobile `usePet(id)` hook with TanStack Query for single pet fetch
- Mobile `petService.getPet(id)` function
- Professional Pet Profile screen with cover banner, avatar, info grid, real QR code, action buttons, loading/error states
- 10 backend tests for QR generation (all passing)
- Header bar with back button and dynamic pet name on mobile profile
- `react-native-qrcode-svg` dependency for mobile QR rendering

### Changed
- Backend `pets/services.py` refactored into `services/pet_service.py` + `services/qr_service.py`
- Backend `pets/tests.py` replaced with `tests/` package
- Mobile `Pet` type updated with `qr_code` / `qr_code_url` fields
- `react-native-svg` pinned to version compatible with Expo SDK 54

### Fixed
- React Native SVG bundling error — misaligned `react-native-svg` version resolved via `expo install --fix`

## [0.2.1] — 2026-07-21

### Added
- Mobile app scaffold with Expo SDK 54, Expo Router, TypeScript
- Login, register, and onboarding UI with validation and navigation
- Mobile auth backend — login with JWT, token refresh, logout, revoke-all tokens
- Owner dashboard mobile UI with navigation tabs
- Dark mode support for both mobile and web
- Pet Registration module (form UI + backend API)
- My Pets list screen with backend integration
- Mobile `ThemeContext` with light/dark theme persistence
- Mobile `AuthContext` with token lifecycle management
- `AppHeader` component for mobile screens
- `http` service with interceptors for auto-refresh on 401
- `storage` utility wrapping `expo-secure-store`
- `react-hook-form` + `Zod` schemas for pet registration form
- `BreedPicker` and `PhotoPicker` components
- Vet and owner route groups with role-based layouts
- Splash, icon, and favicon assets for mobile

### Changed
- `USER` and `OWNERPROFILE` database table attributes cleaned up (redundant fields removed)
- `frontend/src/context/ThemeContext.tsx` updated to support dark mode
- `frontend/src/context/AuthContext.tsx` refactored for shared mobile/web usage
- `frontend/src/services/http.ts` extracted as shared HTTP client
- `frontend/src/services/auth.ts` aligned with mobile auth flow
- Mobile `package.json` configured for Expo SDK 54 + React Native 0.81

### Fixed
- Redundant `USER` and `OWNERPROFILE` database attributes causing schema conflicts
- Mobile login not persisting auth state across app restarts

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
