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
| APT_CREATED_AT | TIMESTAMP | DEFAULT NOW() |
| APT_UPDATED_AT | TIMESTAMP | DEFAULT NOW() |
| APT_DELETED_AT | TIMESTAMP | NULL |

---

# Appointment Status

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

PENDING

↓

CANCELLED

Alternative Flow

CONFIRMED

↓

NO_SHOW

---

# Appointment Creation

Appointments may be created by:

• OWNER (Mobile Application)

• RECEPTIONIST (Web Application)

The creator is stored in:

APT_CREATED_BY

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