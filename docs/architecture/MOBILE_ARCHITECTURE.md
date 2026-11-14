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
- Public pet QR phone-sharing consent (off by default; anyone scanning a pet QR
  can see the number when enabled)

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

Both results are still processed separately. The backend records its
deterministic cross-analysis for audit and history only — it is no longer
displayed on any active mobile screen (neither the fresh result screen nor the
stored screening's details screen). Agreement is not confirmation. The
image-validation gate still runs and its outcome appears in the
image-validation UI, but the review findings card ("Independent Image Review")
is also no longer rendered; that slot now shows the veterinarian-approved Care
Guidelines card.

When the classifier reports `DISEASE_DETECTED`, the owner may answer a
supplementary symptom questionnaire (adaptive question order; answers may
influence which questions are asked next, but never the result). The result
screen presents, in order:

- **AI Preliminary Screening Result** — the raw on-device prediction as the
  sole primary result, with its top-3 confidence list
- **Care Guidelines** — veterinarian-approved care steps selected only by the
  primary raw AI predicted class (never by questionnaire answers), labeled
  "Veterinarian-Approved Guidance"; the content is general guidance, not a
  diagnosis or prescription, and a missing or unsupported predicted class
  shows a general veterinary consultation message instead
- **Symptom Summary · Supplementary** — the plain questionnaire answers,
  labeled as context that does not change the AI prediction

The care-guideline content lives in
`mobile/features/screening/data/careGuidelines.ts` (display-only, separate
from AI model logic) so it can be updated without touching components or AI
code.

Saving persists the raw AI prediction and confidence plus the display-only
`symptom_answers` rows (shown on the result and details screens); the stored
answers are never read back into the AI path.

If the gate rejects the photo, the UI shows the explanation and an option to
upload another image; no prediction is shown. If the gate fails, the classifier
is not run and a retry/error message is shown. If the classifier fails after
approval, no prediction is fabricated and the image-validation outcome remains
visible.
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

Step 1 shows a map of all bookable clinics above the scrollable clinic list.
Coordinates come from `GET /api/owner/clinics/` (`cln_latitude` /
`cln_longitude`), geocoded once by the backend; clinics without a location stay
selectable in the list but have no pin. Tapping a pin runs the same selection
path as tapping the list row. The map is a Leaflet + OpenStreetMap page rendered
inside `react-native-webview`, chosen because it runs in **Expo Go with no
development build and no API key** — `react-native-maps` would require both, so
it is deliberately avoided. The component renders nothing when no clinic has
coordinates, so the list always works even offline or without geocoding.

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

The appointment details screen presents the record formally: a status banner
with a per-status explanation, the schedule (date block, time, clinic,
veterinarian, type), the patient, the visit reason, the linked skin scan
(with a shortcut to its full screening log), and the consultation-fee payment
receipt (amount, method, status, reference). Cancelling optionally captures an
owner-stated reason, which the record then displays.

Owners may cancel appointments.

### Consultation and screening history links

Consultation details show **View Screening** only when the visit's appointment
links to a screening for that pet. Screening details load by ID through
`GET /api/owner/screenings/{id}/`, not by searching a paginated history list.
They show up to two links, each with its date and veterinarian: **View
Consultation** for the scan's original visit, and **View Follow-up Consultation**
for a follow-up visit that reused the same scan — the follow-up link appears only
once that appointment is completed. No link is shown for a booking without a
recorded consultation. Opening a link back to the source record returns to it
rather than repeatedly stacking copies. Records and Screenings are sibling tab
stacks, so these returns go through `router.navigate`, which crosses tabs and
reuses the existing screen; `router.dismissTo` dispatches `POP_TO`, which only
the focused stack handles and is otherwise dropped. Both screen-header and
Android hardware Back return to the originating record when opened this way.
Predictions remain separate from the veterinarian's diagnosis; these are
read-only navigation links, not a new review or diagnosis workflow.

A completed appointment also shows a **Consultation** card on its detail screen
with the diagnosis, the specific disease when recorded, and the veterinarian,
plus a **View consultation record** link into
`/(owner)/records/consultations/{id}`. The card appears only once the appointment
is `COMPLETED`, so a consultation the veterinarian is still writing is never
surfaced.

---

## Payments (Receipts)

`GET /api/owner/payments/` lists the owner's own payments with the same
envelope as the staff list: `{ total, page, page_size, total_pages, results }`.

Filters: `status`, `method`, `reference`, `appointment`, `date_from`,
`date_to`, `page`, `page_size`.

`?status=PENDING` is how an abandoned checkout is found again and resumed.
`?appointment=` also matches pending follow-up attempts tracked in
`pay_metadata.appointment_id`, not only the linked `PAID` record, so the
appointment detail can resume a follow-up checkout before it is paid.

Screen: `app/(owner)/payments/` — reached from the Appointments header
(receipt icon) or from a `PAYMENT_*` notification; it is registered as a hidden
tab (`href: null`).

Refunds and cancellations of settled payments are out of scope until phase 3.

---

## Pay a Follow-Up

A follow-up scheduled by the clinic appears in the owner's appointment list as
`CONFIRMATION` ("Awaiting payment"). Its detail screen shows a Follow-Up Payment
card:

- The amount is the appointment detail's `consultation_fee`; the client never
  sends an amount.
- GCash and card are offered (cash is staff-only).
- Pay calls `POST /api/owner/appointments/{id}/checkout/`, which creates or
  resumes a pending payment for the already-booked slot.
- The screen polls that payment. On `PAID` it refreshes the appointment, which
  is now `CONFIRMED`, and the normal receipt card replaces the pay card.
- A pending checkout can be cancelled without cancelling the appointment.
  Unpaid follow-ups auto-cancel at the scheduled time; the owner cannot cancel
  a `CONFIRMATION` follow-up itself.
- When the clinic's fee is `0`, the appointment is already `CONFIRMED` and no
  pay card is shown.

---

## View Medical History

Owners may view their pets' medical history from the **Records** tab, which has
four sections: **Consults**, **Meds**, **Vaccines**, and **Scans**.

- Consultation records (read-only)
- Prescription records (read-only)
- Vaccination records
- AI screening history (**Scans**), listing every scan with its prediction,
  confidence, date, and a status pill — **Booked** while an appointment is still
  open, **Consulted** once that visit is completed with a consultation; tapping a
  scan opens its details

Owners cannot edit consultation or prescription records.

Consultation details show the veterinarian, consultation date, diagnosis, specific disease when recorded, chief complaint, clinical notes, and follow-up recommendation. When the consultation has a linked prescription, a Prescription card opens that prescription; the prescription detail back action returns to the consultation. Otherwise, the card states that no prescription was issued. Returning from a record detail opened from the Records list opens the matching record-type tab.

Prescription details include a **Save / Share PDF** action. The PDF is generated on-device with `expo-print` from the same A4 document layout as the veterinarian web prescription preview, including the clinic header, owner and pet details, medication table, instructions, and the veterinarian signature/license block. `expo-sharing` opens the device share sheet so the owner can save the PDF or send it to another app. The PDF is never generated or stored on the server.

Prescription details also include a **View as Image** action. It renders the prescription document on-device, captures it as a PNG with `react-native-view-shot`, and opens a full-screen preview. The preview offers **Download Image**, which requests photo-library access and saves the PNG with `expo-media-library`. The image is generated and stored only on the device; no prescription image is uploaded to the server.

Owner records and appointments refresh when the screen gains focus, when the app returns to the foreground from the background, and when the owner pulls to refresh. These refreshes invalidate the owner consultation, prescription, vaccination, screening, and appointment queries so newly created records appear without signing out or clearing the app cache.

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

Completed appointment details include read-only consultation and prescription records from the appointment detail response. Appointment details also show the linked AI screening image, result, and the stored questionnaire answers in a card that initially shows five rows with a Show more / Show less toggle.

Veterinarian mobile lists and schedules exclude `PENDING` owner bookings and
the internal `REVIEW`/`CONFIRMATION` follow-up states; clinic staff manage
those through the web receptionist workflow. Owner mobile lists hide `REVIEW`
and show `CONFIRMATION` as "Awaiting payment" with an in-app pay action. A
successful payment confirms the follow-up in place; zero-fee follow-ups are
confirmed by the receptionist's scheduling action and never show the pay card.

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

↓ (DISEASE_DETECTED only)

Supplementary questionnaire (adaptive order) → answers shown on the result
screen and details screen as a symptom summary, stored only as display rows
(`symptom_answers`); they never modify the displayed or saved prediction

The review findings card is no longer rendered on the mobile result or
details screens — those slots show the veterinarian-approved Care Guidelines
card instead. Cross-analysis is likewise no longer rendered on
any mobile screen. The gate itself, its eligibility outcome, and the stored
review/cross-analysis records are unchanged and remain available through the
API for audit.

The model file is bundled with the application and updated through app store
releases. The classifier itself works offline, but image screening now requires
the backend gate before it runs. The review requires network access and may
return `NOT_CONFIGURED`, `TIMEOUT`, `RATE_LIMITED`, `QUOTA_EXHAUSTED`,
`MALFORMED_RESPONSE`, or `PROVIDER_ERROR`. A review failure or non-eligible
decision stops the classifier and shows a retry/error or gate explanation. No
score averaging or combined disease probability is performed — neither between
the AI outputs nor between the classifier output and questionnaire answers.

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
