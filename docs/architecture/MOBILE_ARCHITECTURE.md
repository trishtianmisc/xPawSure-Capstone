# MOBILE_ARCHITECTURE.md

> Version: 2.1
> Project: XPawSure
> Last Updated: October 2026

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

The owner captures or selects five photos of their dog's skin condition from different angles. Camera capture and gallery selection are both supported.

The application runs inference on the device. Images are not sent to the server for inference.

Each photo passes quality and dog-skin checks. Screening requires five photos, and at least three must be valid. Rejected photos must be retaken or replaced before screening can run.

A photo guide explains the five-slot flow, camera/gallery options, quality checks, and the three-valid-photo minimum. It opens automatically on first use, can be reopened from the help icon, and records dismissal in `xpawsure_screening_guide_seen_v1`. A storage failure does not block screening.

The AI model identifies possible skin conditions and returns:

- Predicted condition
- Confidence score (percentage)
- Top N predictions
- Model version

After screening, the owner may answer the adaptive 12-question veterinary-informed questionnaire. The result screen presents independent AI-only, questionnaire-only, and combined screening suggestions. These are screening likelihoods, not diagnoses. The combined result is required before booking an appointment.

The questionnaire-only result uses a uniform prior and is unavailable when no informative answer exists. Answer review follows the canonical 12-question order, with Q11 remaining multi-select. The optional home-care card is mock content, is gated by `EXPO_PUBLIC_ENABLE_MOCK_HOME_CARE`, and is not a treatment plan.

The screening result is uploaded to the backend after the user provides consent. The backend stores the final prediction and confidence only; questionnaire answers and mode-specific results remain on the device.

---

## Appointment Booking

Owners may book appointments at a veterinary clinic.

Appointment booking requires:

- Clinic selection
- Preferred date and time
- Reason for visit

The backend checks availability and confirms.

Owners may view upcoming appointments.

Owners may cancel appointments.

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

TensorFlow Lite Integration

---

Storage:

Shared storage helper using SecureStore on native and localStorage on web

JWT access and refresh tokens, cached profile, and local UI flags such as the photo-guide seen key

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

    │       ├── AdjustQuestionnaire

    │       ├── ScreeningResult

    │       └── BookAppointment

    ├── Appointments (Stack)

    │   ├── AppointmentList

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

TensorFlow Lite is integrated into the mobile application.

Inference pipeline:

User captures image

↓

Image preprocessing (resize, normalize)

↓

TensorFlow Lite interpreter

↓

Post-processing (softmax, threshold)

↓

Display result to user

↓

User consent to upload

↓

Upload to backend

The model file is bundled with the application and updated through app store releases.

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

GET  /api/screenings/              List screenings

POST /api/screenings/              Upload screening result

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

The mobile application currently uses dependency-free Node test scripts for screening and questionnaire logic:

```powershell
npx tsc --noEmit
npm run test:screening
npm run test:bayesian
npm run test:adaptive
npm run test:summary
npm run test:result-view
```

These scripts transpile the relevant TypeScript modules with the installed TypeScript compiler and assert the screening thresholds, Bayesian refinement, adaptive ordering, summary construction, and result-view gating.

Jest and React Native Testing Library are not configured in the current repository. Screen and device-level behavior, including the photo guide and photo-quality flow, requires manual verification on an Expo development build or device.

---

# 12. Security

- JWT tokens stored in SecureStore
- API calls use HTTPS
- Images are validated before upload
- No plaintext secrets in the codebase
- Environment variables for API URL and configuration
