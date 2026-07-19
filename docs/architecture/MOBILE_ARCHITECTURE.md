# MOBILE_ARCHITECTURE.md

> Version: 2.0
> Project: XPawSure
> Last Updated: July 2026

---

# 1. Overview

The XPawSure mobile application is a React Native (Expo) application designed for pet owners.

It allows owners to register accounts, manage pets, perform AI-assisted canine skin screening, book appointments, and view medical records.

The application never provides a diagnosis. It provides a preliminary screening result that must be reviewed by a veterinarian.

---

# 2. Target Users

The mobile application is intended exclusively for pet owners (User role: OWNER).

Clinicians, clinic administrators, and receptionists do not use the mobile application. They use the web application.

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

The owner captures or selects a photo of their dog's skin condition.

The application sends the image to TensorFlow Lite for on-device inference.

The AI model identifies possible skin conditions and returns:

- Predicted condition
- Confidence score (percentage)
- Top N predictions
- Model version

The user may then optionally book a veterinary appointment.

The screening result is uploaded to the backend after the user provides consent.

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
- Vaccination records (read-only)
- AI screening history

Owners cannot edit medical records.

---

## Notifications

The mobile application may receive push notifications for:

- Appointment reminders
- Screening results available
- Vaccination reminders

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

AsyncStorage for tokens

SecureStore for sensitive data

---

# 6. Navigation

Expo Router for file-based routing.

Navigation structure:

Root

├── Auth Stack

│   ├── Login

│   ├── Register

│   └── ForgotPassword

│

└── Main Tab Navigator

    ├── Home

    ├── Pets (Stack)

    │   ├── PetList

    │   ├── PetDetail

    │   ├── PetForm

    │   └── PetScreening (Stack)

    │       ├── CaptureImage

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

GET  /api/vaccinations/            List vaccinations (read-only)

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
