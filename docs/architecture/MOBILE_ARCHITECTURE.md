# MOBILE_ARCHITECTURE.md

> Version: 2.0
> Project: XPawSure
> Last Updated: July 2026

---

# 1. Overview

The XPawSure mobile application is a React Native (Expo) application serving two user groups:

**Pet Owners** — register accounts, manage pets, perform AI-assisted canine skin screening, book appointments, and view medical records.

**Veterinarians** — view their schedule, check upcoming appointments, and review consultation details.

The application never provides a diagnosis. It provides a preliminary screening result that must be reviewed by a veterinarian.

---

# 2. Target Users

The mobile application serves two user roles:

- **Pet Owners (OWNER)** — register, manage pets, perform AI screening, book appointments, view medical history.
- **Veterinarians (VETERINARIAN)** — view their schedule, check appointments, and review consultation details.

Clinic administrators and receptionists do not use the mobile application. They use the web application.

---

# 3. Platform

React Native (Expo)

Android and iOS

The primary platform is Android (first target). iOS is secondary.

---

# 4. Features

## Owner Registration

The mobile application allows new users to register as pet owners.

Registration requires:

- Full Name
- Email Address
- Phone Number
- Password

On successful registration, the backend creates a User with role=OWNER and an associated OwnerProfile.

The owner may also optionally provide:

- Address
- Profile picture

---

## Owner Profile Management

Owners may view and edit their profile after logging in.

Editable fields:

- Full Name
- Phone Number
- Address
- Profile Picture

---

## Pet Management

Owners may register multiple pets.

Pet registration requires:

- Name
- Species
- Breed
- Date of Birth
- Sex
- Weight
- Color/Markings
- Profile Picture

Owners may view and edit their pets' information after registration.

---

## AI Skin Screening

The core feature of the mobile application.

The owner captures or selects exactly one photo of their dog's skin condition.
The app prepares one 512 px JPEG and sends it first to the backend
image-validation gate.

Backend image validation (Anthropic):

- Runs before the on-device classifier
- Returns `image_suitability`, `screening_eligibility`, a screening message,
  visible features, image-quality observations, condition assessment, and a
  veterinary recommendation
- Never returns a confidence percentage or a diagnosis
- Rejects blurred, non-dog, healthy-looking, wound/injury, and ambiguous images
  without forcing a disease category

On-device classifier (TensorFlow.js):

- Runs only when the gate returns `SUITABLE` and `ELIGIBLE`
- Returns the predicted condition, confidence score, top N predictions, and
  model version

Both results are displayed separately. The backend still records its
deterministic cross-analysis for audit and history — the fresh result screen
does not display it, while a stored screening's read-only details screen shows
the recorded summary. Agreement is not confirmation.

If the gate rejects the photo, the UI shows the explanation and an option to
upload another image; no prediction is shown. If the gate fails, the classifier
is not run and a retry/error message is shown. If the classifier fails after
approval, no prediction is fabricated and the Claude findings remain visible.
The user may then book a veterinary appointment; saving uploads the single image
and both outputs after consent.

---

## Appointment Booking

Owners may book consultations at a veterinary clinic. Booking is **scan-only**:
the Book Appointment action exists solely on the fresh scan result screen, so a
saved skin screening is always attached (`pet_id` + `screening_id`). Past
screenings are read-only logs — their details screen never starts a booking,
and no other screen offers a booking button.

The wizard runs five steps (the payment step is skipped when the clinic
charges no fee):

1. Choose a clinic
2. Choose a veterinarian (every active vet at the clinic; availability is
   resolved per date later)
3. Select a schedule (date strip plus the chosen veterinarian's free slots)
4. Appointment details (summary plus optional reason; owner appointments are
   always `CONSULTATION` — there is no type picker)
5. Payment (only when the clinic charges a consultation fee)

If the chosen clinic already has a live appointment (pending, confirmed,
checked in, or in progress) for the same pet, the wizard shows a confirm
dialog the owner can override. Other clinics and terminal statuses
(completed, cancelled, no-show) never warn. This guardrail is client-side
only — the booking API itself stays permissive.

The booking wizard shows the clinic's `consultation_fee` (from
`GET /api/owner/clinics/`). When it is greater than `0` the final step is
payment:

1. The owner picks GCash or Card and taps **Pay & Book**.
2. `POST /api/payments/checkout/` returns the payment with a `checkout_url`.
3. The app opens `checkout_url` with `Linking.openURL` (external browser — no
   extra dependency) and polls `GET /api/payments/{pay_id}/` every 2 seconds
   while it is `PENDING`.
4. Once it is `PAID`, the app posts `POST /api/owner/appointments/` with the
   same `pay_id`.

A fee of `0` means no payment step exists at all, and the booking posts
exactly as before.

The backend decides payment rules; the app branches on the error `code`, never
on the message text:

| Code | Meaning | App behaviour |
|------|---------|---------------|
| `PAYMENT_NOT_REQUIRED` | Clinic fee is `0` | Book without `pay_id` |
| `PAYMENT_REQUIRED` | No (or unpaid) `pay_id` | Show the payment step |
| `PAYMENT_EXPIRED` | Checkout window closed | Offer "Pay again" (new checkout) |
| `SLOT_UNAVAILABLE` | Slot taken while paying | Re-pick the slot and book **with the same `pay_id`** — a paid payment funds the next slot |
| `METHOD_NOT_ALLOWED` | e.g. cash chosen by an owner | Offer GCash / Card only |
| `PROVIDER_ERROR` | Gateway unreachable | Retry; nothing was stored |
| `SCREENING_REQUIRED` | Missing (or invalid) `screening_id` | Send the owner back to the skin scanner — booking only exists downstream of a scan |

The owner also receives an in-app notification (`PAYMENT_COMPLETED`,
`PAYMENT_EXPIRED`) when a payment settles or lapses.

Owners may view upcoming appointments.

Owners may cancel appointments.

---

## Payments (Receipts)

`GET /api/owner/payments/` lists the owner's own payments with the same
envelope as the staff list: `{ total, page, page_size, total_pages, results }`.

Filters: `status`, `method`, `reference`, `appointment`, `date_from`,
`date_to`, `page`, `page_size`.

`?status=PENDING` is how an abandoned checkout is found again and resumed.

Screen: `app/(owner)/payments/` — reached from the Appointments header
(receipt icon) or from a `PAYMENT_*` notification; it is registered as a hidden
tab (`href: null`).

Refunds and cancellations of settled payments are out of scope until phase 3.

---

## View Medical History

Owners may view their pets' medical history, including:

- Consultation records (read-only)
- Prescription records (read-only)
- Vaccination records
- AI screening history

Owners cannot edit consultation or prescription records.

Owners may add, edit, and delete their own reported vaccination records (veterinarian-issued records are read-only).

---

## Notifications

The mobile application may receive push notifications for:

- Appointment reminders
- Screening results available
- Vaccination reminders

---

## Veterinarian Features

Veterinarians have read-only access to:

**Schedule** — view their daily/weekly appointment schedule.

**Appointments** — view appointment list and details (pet, owner, reason, status). Tapping an appointment from Home or Schedule opens its detail.

**Consultations** — view consultation and prescription records associated with completed appointments.

Completed appointment details include read-only consultation and prescription records from the appointment detail response.

Veterinarian mobile lists and schedules exclude `PENDING` owner bookings; clinic staff manage pending bookings through the web receptionist workflow.

Veterinarians cannot register owners, manage pets, perform AI screening, or book appointments through the mobile app.

---

# 5. Architecture

The mobile application follows a standard React Native + Expo architecture.

Presentation layer:

React Native Screens

Components

Navigation (Expo Router)

---

Logic layer:

Custom Hooks

State Management (React Context or Zustand)

---

Service layer:

API Client (Axios or Fetch)

On-device TensorFlow.js Inference

---

Storage:

AsyncStorage for tokens

SecureStore for sensitive data

---

# 6. Navigation

Expo Router for file-based routing.

## Owners

Root

├── Auth Stack

│   ├── Login

│   ├── Register

│   └── ForgotPassword

│
└── Owner Tab Navigator

    ├── Home

    ├── Pets (Stack)

    │   ├── PetList

    │   ├── PetDetail

    │   ├── PetForm

    │   └── PetScreening (Stack)

    │       ├── CaptureImage

    │       └── ScreeningResult

    ├── Screenings (Stack)

    │   ├── ScreeningHistory

    │   └── ScreeningDetails

    ├── Appointments (Stack)

    │   ├── AppointmentList

    │   ├── BookAppointment

    │   └── AppointmentDetail

    ├── Medical Records (Stack)

    │   ├── RecordList

    │   ├── ConsultationDetail

    │   ├── PrescriptionDetail

    │   └── VaccinationDetail

    └── Profile (Stack)

        ├── ProfileView

        └── ProfileEdit

## Veterinarians

Root

├── Auth Stack

│   └── Login

│
└── Vet Tab Navigator

    ├── Schedule

    │   └── TodaySchedule

    ├── Appointments (Stack)

    │   ├── AppointmentList

    │   └── AppointmentDetail

    ├── Consultations (Stack)

    │   ├── ConsultationList

    │   └── ConsultationDetail

    └── Profile (Stack)

        ├── ProfileView

        └── ProfileEdit

---

# 7. AI Integration

TensorFlow.js runs the bundled EfficientNetB0 classifier on the device.

Screening pipeline:

User captures exactly one image

↓

Prepare one 512 px JPEG

↓

Send the same JPEG to `POST /api/owner/screenings/vision-analysis/`

↓

Claude image-validation gate

↓

If `SUITABLE` + `ELIGIBLE`:

Image preprocessing (resize to 224 × 224, normalize)

↓

TensorFlow.js Layers model

↓

Post-processing (softmax, thresholds)

↓

Display on-device result

The app displays the review separately. Cross-analysis is not displayed on the
mobile result screen.

The model file is bundled with the application and updated through app store
releases. The classifier itself works offline, but image screening now requires
the backend gate before it runs. The review requires network access and may
return `NOT_CONFIGURED`, `TIMEOUT`, `RATE_LIMITED`, `QUOTA_EXHAUSTED`,
`MALFORMED_RESPONSE`, or `PROVIDER_ERROR`. A review failure or non-eligible
decision stops the classifier and shows a retry/error or gate explanation. No
score averaging or combined disease probability is performed.

---

# 8. Backend Communication

The mobile application communicates with the Django REST API via JSON over HTTPS.

Authentication uses JWT tokens obtained during login.

Endpoints consumed by mobile:

POST /api/auth/register/           Owner registration

POST /api/auth/login/              Owner login

POST /api/auth/refresh/            Token refresh

GET  /api/auth/profile/            Get profile

PUT  /api/auth/profile/            Update profile

GET  /api/pets/                    List pets

POST /api/pets/                    Create pet

GET  /api/pets/{id}/               Pet detail

PUT  /api/pets/{id}/               Update pet

DELETE /api/pets/{id}/             Delete pet

GET  /api/owner/screenings/        List screenings

POST /api/owner/screenings/        Save screening (multipart image + classifier output + signed eligible review token)

POST /api/owner/screenings/vision-analysis/  Image-validation gate (multipart image; no persistence)

GET  /api/appointments/            List appointments

POST /api/appointments/            Book appointment

GET  /api/appointments/{id}/       Appointment detail

GET  /api/consultations/           List consultations (read-only)

GET  /api/prescriptions/           List prescriptions (read-only)

GET  /api/vaccinations/            List vaccinations

POST /api/vaccinations/            Create owner-reported vaccination

GET  /api/vaccinations/{id}/       Vaccination detail

PUT  /api/vaccinations/{id}/       Update owner-reported vaccination

DELETE /api/vaccinations/{id}/     Delete owner-reported vaccination

---

# 9. State Management

The mobile application uses:

- React Context for authentication state
- TanStack Query (React Query) for server state
- Local state for UI interactions

Auth token is stored in SecureStore.

---

# 10. Error Handling

The mobile application handles errors gracefully:

- Network errors show a retry prompt
- API errors display user-friendly messages
- AI inference errors log to local storage and show a fallback message
- Form validation is handled by React Hook Form + Zod

---

# 11. Testing

The mobile application is tested with:

- Unit tests for hooks and utilities
- Component tests for screens
- Integration tests for critical flows (registration, login, screening)

Testing framework: Jest + React Native Testing Library

---

# 12. Security

- JWT tokens stored in SecureStore
- API calls use HTTPS
- Images are validated before upload
- No plaintext secrets in the codebase
- Environment variables for API URL and configuration
