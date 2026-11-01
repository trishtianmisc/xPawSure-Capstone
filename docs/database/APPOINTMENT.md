# appointment.md

> Module: Appointment Management
> Version: 1.0
> Status: Final
> Depends On:
>
> - authentication.md
> - clinic.md
> - pet.md

---

# Overview

The Appointment module manages appointment scheduling between Pet Owners and Veterinary Clinics.

Appointments are initiated by Pet Owners through the mobile application or by Receptionists through the web application.

Every Appointment belongs to exactly one Pet and one Clinic.

Appointments may later become Consultations.

---

# Entity

## APPOINTMENT

Purpose

Stores appointment requests and scheduled veterinary visits.

Appointments act as the entry point for all medical records.

No Consultation can exist without an Appointment.

---

## Attributes

| Column | Type | Constraints |
|---------|------|-------------|
| APT_ID | UUID | PK |
| PET_ID | UUID | FK → PET |
| CLN_ID | UUID | FK → CLINIC |
| STF_ID | UUID | FK → STAFF_PROFILE, NULLABLE |
| APT_SCHEDULED_AT | TIMESTAMP | NOT NULL |
| APT_REASON | TEXT | NULL |
| APT_STATUS | ENUM | NOT NULL |
| APT_CREATED_BY | UUID | FK → USER |
| APT_CONFIRMED_AT | TIMESTAMP | NULL |
| APT_COMPLETED_AT | TIMESTAMP | NULL |
| APT_CANCELLED_AT | TIMESTAMP | NULL |
| APT_RESCHEDULE_REQUEST_REASON | TEXT | NULL |
| APT_CANCELLATION_REQUEST_REASON | TEXT | NULL |
| APT_CREATED_AT | TIMESTAMP | DEFAULT NOW() |
| APT_UPDATED_AT | TIMESTAMP | DEFAULT NOW() |
| APT_DELETED_AT | TIMESTAMP | NULL |
| APT_SOURCE_CONSULTATION | UUID | FK to CONSULTATION, UNIQUE, NULLABLE |

---

# Appointment Status

REVIEW

CONFIRMATION (Awaiting Payment)

PENDING

CONFIRMED

CHECKED_IN

IN_PROGRESS

COMPLETED

CANCELLED

NO_SHOW

---

# Business Rules

Every Appointment belongs to one Pet.

Every Appointment belongs to one Clinic.

Veterinarian assignment is optional during creation.

Receptionists may assign a Veterinarian later.

Appointments may only be cancelled before completion.

Completed appointments cannot be edited.

Cancelled appointments never create Consultations.

No Show appointments never create Consultations.

Soft Delete is supported.

A follow-up recommendation is stored on the consultation while the source
appointment is `IN_PROGRESS`. When the source appointment is marked
`COMPLETED`, the system creates one linked `FOLLOW_UP` appointment in `REVIEW`
status. The appointment keeps a single `APT_SOURCE_CONSULTATION` link so the
recommendation cannot create duplicates. Completing the source appointment
makes the consultation read-only, so the recommendation cannot be changed
afterward. If the source appointment is cancelled before completion, no
follow-up appointment is created.

A receptionist schedules a `REVIEW` follow-up by selecting an available slot
for the assigned veterinarian. This books the slot and sets the appointment to
`CONFIRMATION` (shown as `AWAITING PAYMENT`). `CONFIRMATION` is not final
confirmation; owner payment/acceptance is handled separately. If payment is not
completed before the scheduled time, the appointment is cancelled and the slot
is released.

The veterinarian cannot change the linked recommendation after the source
appointment is completed.

---

# Indexes

IDX_APPOINTMENT_PET

IDX_APPOINTMENT_CLINIC

IDX_APPOINTMENT_VETERINARIAN

IDX_APPOINTMENT_STATUS

IDX_APPOINTMENT_DATE

---

# Relationships

PET

1

↓

Many

↓

APPOINTMENT

CLINIC

1

↓

Many

↓

APPOINTMENT

STAFF_PROFILE

1

↓

Many

↓

APPOINTMENT

APPOINTMENT

0

↓

1

↓

CONSULTATION

CONSULTATION

0

↓

1

↓

FOLLOW_UP APPOINTMENT (APT_SOURCE_CONSULTATION)

---

# Appointment Workflow

Owner

↓

Create Appointment

↓

Pending

↓

Receptionist Reviews

↓

Confirmed

↓

Assign Veterinarian

↓

Checked In

↓

Consultation

↓

Completed

---

# Appointment Lifecycle

Follow-Up Flow

REVIEW

↓

CONFIRMATION (AWAITING PAYMENT)

↓

PENDING

↓

CONFIRMED

↓

CHECKED_IN

↓

IN_PROGRESS

↓

COMPLETED

Standard Flow

PENDING

↓

CONFIRMED

↓

CHECKED_IN

↓

IN_PROGRESS

↓

COMPLETED

Alternative Flow

REVIEW / CONFIRMATION / PENDING

↓

CANCELLED

Alternative Flow

CONFIRMED

↓

NO_SHOW

Phase 1 implements through `CONFIRMATION`. Owner acceptance, payment, and the
later transitions are deferred.

---

# Appointment Creation

Appointments may be created by:

- OWNER (Mobile Application)

- RECEPTIONIST (Web Application)

- VETERINARIAN (Follow-up recommendation from a consultation)

The creator is stored in:

APT_CREATED_BY

Initial status:

- OWNER -> PENDING (awaiting clinic confirmation)

- RECEPTIONIST -> CONFIRMED

- VETERINARIAN (follow-up recommendation) -> REVIEW

A veterinarian follow-up recommendation is stored on the consultation while
the source appointment is `IN_PROGRESS`. Completing the source appointment
creates a linked `FOLLOW_UP` appointment in `REVIEW` status. The preferred
follow-up date is stored as the initial scheduled date at midnight Asia/Manila;
the receptionist replaces it with the selected slot's actual start time when
confirming.

---

# Veterinarian Assignment

A Veterinarian may be assigned:

Immediately

OR

Later by the Receptionist.

Therefore

STF_ID

is nullable.

---

# Validation Rules

Appointment date must not be in the past.

Appointment time must be within clinic operating hours.

Appointments cannot overlap for the same Veterinarian.

A follow-up confirmation must use a future, available slot for the assigned
veterinarian in the same clinic. Confirmation locks the appointment and slot
row and fails if another appointment already holds the slot.

A `CONFIRMATION` appointment whose scheduled time passes without payment is
cancelled with reason "Payment not completed before appointment time", and its
slot is released to `AVAILABLE`.

Archived clinics cannot receive appointments.

Inactive pets cannot create appointments.

---

# Summary

Table

• APPOINTMENT

Dependencies

• USER

• PET

• CLINIC

• STAFF_PROFILE

Used By

• Consultation

• Reports

• Notifications

• Dashboard

• Owner Mobile Application

---

# VET_SLOT

Purpose

Stores individual time slots for each veterinarian's schedule. Slots are generated from clinic operating hours and appointment duration settings.

---

## Attributes

| Column | Type | Constraints |
|---------|------|-------------|
| VSL_ID | UUID | PK |
| CLN_ID | UUID | FK → CLINIC |
| STF_ID | UUID | FK → STAFF_PROFILE |
| VSL_DATE | DATE | NOT NULL |
| VSL_START_TIME | TIME | NOT NULL |
| VSL_END_TIME | TIME | NOT NULL |
| VSL_APPOINTMENT | UUID | FK → APPOINTMENT, NULLABLE |
| VSL_STATUS | ENUM | NOT NULL, DEFAULT 'AVAILABLE' |
| VSL_CREATED_AT | TIMESTAMP | DEFAULT NOW() |
| VSL_UPDATED_AT | TIMESTAMP | DEFAULT NOW() |

---

# Slot Status

AVAILABLE — Open, bookable by an owner

BOOKED — Has an appointment attached

BLOCKED — Vet unavailable, receptionist-set, not bookable

---

# Slot Business Rules

Slots are generated from ClinicOperatingHours and ClinicSettings.cls_appointment_duration.

Each slot belongs to one veterinarian and one clinic.

Slots are unique per veterinarian, date, and start time.

Receptionists can toggle slot status between AVAILABLE and BLOCKED freely for slots with no appointment.

BOOKED slots cannot be blocked directly — the appointment must be cancelled first.

When an appointment is cancelled or marked no-show, the slot returns to AVAILABLE status.

Bulk block operations skip BOOKED slots and return a count of skipped slots.

---

# Unique Constraints

UQ_VET_SLOT_VET_DATE_START — (STF_ID, VSL_DATE, VSL_START_TIME)