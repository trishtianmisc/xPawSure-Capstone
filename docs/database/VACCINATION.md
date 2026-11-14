# vaccination.md

> Module: Vaccination Management
> Version: 1.1
> Status: Final
> Depends On:
>
> - consultation.md

---

# Overview

The Vaccination module lets pet owners record vaccination history for their registered pets through the mobile application. These records are owner-reported and may be unverified.

Only an authenticated owner may create, edit, or delete their own reported records. The application does not provide a clinic-staff vaccination write flow. Existing veterinarian-issued records remain read-only to owners.

Each vaccination becomes part of the pet's medical history.

Veterinarian-issued records are immutable. Owner-reported records may be edited or deleted by their owner.

---

# Entity

## VACCINATION_RECORD

Purpose

Stores every vaccine administered to a pet.

Veterinarian-issued records belong to exactly one Consultation. Owner-reported records are not tied to a Consultation.

One Consultation may contain multiple Vaccination Records.

---

## Attributes

| Column | Type | Constraints |
|---------|------|-------------|
| VAC_ID | UUID | PK |
| CON_ID | UUID | FK → CONSULTATION, NULL for owner-reported records |
| PET_ID | UUID | FK → PET |
| STF_ID | UUID | FK → STAFF_PROFILE, NULL for owner-reported records |
| VAC_NAME | VARCHAR(255) | NOT NULL |
| VAC_BRAND | VARCHAR(255) | NULL |
| VAC_BATCH_NO | VARCHAR(100) | NULL |
| VAC_VETERINARIAN_NAME | VARCHAR(255) | NULL (owner-reported name) |
| VAC_SERIES_ID | UUID | NOT NULL; groups doses of the same vaccine series for one pet |
| VAC_DOSE | VARCHAR(100) | NULL (legacy data; no longer collected in the owner app) |
| VAC_ROUTE | ENUM | NULL (legacy data; no longer collected in the owner app) |
| VAC_DATE_GIVEN | DATE | NOT NULL |
| VAC_NEXT_DUE | DATE | NULL |
| VAC_NOTES | TEXT | NULL |
| VAC_SOURCE | ENUM | NOT NULL, DEFAULT 'VET' |
| VAC_CREATED_AT | TIMESTAMP | DEFAULT NOW() |
| VAC_UPDATED_AT | TIMESTAMP | DEFAULT NOW() |

---

# Route Enum

SUBCUTANEOUS

INTRAMUSCULAR

INTRAVENOUS

ORAL

OTHER

---

# Source Enum

VET (veterinarian-issued)

OWNER (owner-reported)

---

# Business Rules

Every Vaccination Record belongs to one Pet.

Owners create records only through the mobile app. New records are always
`OWNER` (owner-reported); the client cannot select or spoof the source.

Owners may add, edit, and delete only their own reported records. Existing
`VET` records are read-only in the owner application; no staff write workflow is
provided by this feature.

The owner app accepts free-text veterinarian and vaccine names. A new dose can
be linked to an existing series; if no series ID is supplied, a
case-insensitive, whitespace-normalized vaccine-name match for the same pet is
reused, otherwise a new series is created. A series ID cannot be reused across
pets. A new dose cannot have an administration date earlier than the latest dose
already in its series.

Every dose remains in medical history. Current due status is computed only from
the latest dose in each series, ordered by date given, creation time, then UUID.
Recording a new dose therefore removes the prior dose's overdue status without
deleting or changing the earlier record. Editing or deleting the latest dose
recomputes which record is current.

All owner creates, updates, and deletes are recorded in the audit log with the
record values needed to review the event.

Next due date is optional.

The owner app uses native calendar pickers (not manual date text entry) for Date
Given and Next Due in the add, edit, and record-next-dose forms. Date Given is
capped at today; Next Due cannot precede Date Given and can be cleared. Historical
next-due dates are allowed. Dates are sent as `YYYY-MM-DD` using local calendar
components to avoid timezone shifts; impossible calendar dates are rejected.

Dose, route, and notes are retained for legacy/API compatibility but are not
requested by the owner vaccination form. Existing values are preserved.

---

# Relationships

CONSULTATION

1

↓

Many

↓

VACCINATION_RECORD

PET

1

↓

Many

↓

VACCINATION_RECORD

STAFF_PROFILE

1

↓

Many

↓

VACCINATION_RECORD

---

# Validation Rules

Vaccination date cannot be in the future.

Next due date must be greater than or equal to the vaccination date.

Only active pets may receive vaccinations.

---

# Indexes

IDX_VACCINATION_PET

IDX_VACCINATION_CONSULTATION

IDX_VACCINATION_VETERINARIAN

IDX_VACCINATION_NEXT_DUE

---

# Vaccination Workflow

Owner-reported: Owner Mobile App → Vaccination (source=OWNER) → Medical History

---

# Summary

Table

• VACCINATION_RECORD

Dependencies

• CONSULTATION (veterinarian-issued only)

• PET

• STAFF_PROFILE (veterinarian-issued only)

Used By

• Medical History

• Owner Mobile Application

• Reports

• Planned vaccination reminder system (not currently implemented)
