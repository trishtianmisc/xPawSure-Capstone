# vaccination.md

> Module: Vaccination Management
> Version: 1.1
> Status: Final
> Depends On:
>
> - consultation.md

---

# Overview

The Vaccination module manages all vaccination records administered to registered pets.

Veterinarian-issued records are created by licensed veterinarians during a Consultation.

Owner-reported records are created by the pet owner from the mobile app (for vaccines given outside the clinic).

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
| CON_ID | UUID | FK → CONSULTATION, NULL (vet-issued only) |
| PET_ID | UUID | FK → PET |
| STF_ID | UUID | FK → STAFF_PROFILE, NULL (vet-issued only) |
| VAC_NAME | VARCHAR(255) | NOT NULL |
| VAC_BRAND | VARCHAR(255) | NULL |
| VAC_BATCH_NO | VARCHAR(100) | NULL |
| VAC_DOSE | VARCHAR(100) | NOT NULL |
| VAC_ROUTE | ENUM | NOT NULL |
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

Veterinarian-issued Vaccination Records belong to one Consultation.

Every Vaccination Record belongs to one Pet.

Only Veterinarians may issue veterinarian-issued vaccination records.

Owners may add, edit, and delete only their own reported records.

Veterinarian-issued vaccination records cannot be deleted.

Veterinarian-issued vaccination history is immutable.

All creates, updates, and deletes are recorded in the audit log.

Next due date is optional.

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

Veterinarian-issued: Appointment → Consultation → Vaccination → Medical History → Owner Mobile App

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

• Vaccination Reminder System