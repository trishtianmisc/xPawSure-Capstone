# vaccination.md

> Module: Vaccination Management
> Version: 1.0
> Status: Final
> Depends On:
>
> - consultation.md

---

# Overview

The Vaccination module manages all vaccination records administered to registered pets.

Vaccination records are created only by licensed veterinarians during a Consultation.

Each vaccination becomes part of the pet's permanent medical history.

Vaccination records are immutable.

---

# Entity

## VACCINATION_RECORD

Purpose

Stores every vaccine administered to a pet.

Each record belongs to exactly one Consultation.

One Consultation may contain multiple Vaccination Records.

---

## Attributes

| Column | Type | Constraints |
|---------|------|-------------|
| VAC_ID | UUID | PK |
| CON_ID | UUID | FK → CONSULTATION |
| PET_ID | UUID | FK → PET |
| STF_ID | UUID | FK → STAFF_PROFILE |
| VAC_NAME | VARCHAR(255) | NOT NULL |
| VAC_BRAND | VARCHAR(255) | NULL |
| VAC_BATCH_NO | VARCHAR(100) | NULL |
| VAC_DOSE | VARCHAR(100) | NOT NULL |
| VAC_ROUTE | ENUM | NOT NULL |
| VAC_DATE_GIVEN | DATE | NOT NULL |
| VAC_NEXT_DUE | DATE | NULL |
| VAC_NOTES | TEXT | NULL |
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

# Business Rules

Every Vaccination Record belongs to one Consultation.

Every Vaccination Record belongs to one Pet.

Only Veterinarians may administer vaccines.

Vaccination records cannot be deleted.

Vaccination history is immutable.

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

Appointment

↓

Consultation

↓

Vaccination

↓

Medical History

↓

Owner Mobile App

---

# Summary

Table

• VACCINATION_RECORD

Dependencies

• CONSULTATION

• PET

• STAFF_PROFILE

Used By

• Medical History

• Owner Mobile Application

• Reports

• Vaccination Reminder System