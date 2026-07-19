# pet.md

> Module: Pet Management
> Version: 1.0
> Status: Final
> Depends On:
>
> - authentication.md

---

# Overview

The Pet Management module stores all registered dogs within the XPawSure platform.

Every pet belongs to exactly one Owner.

An Owner may own multiple pets.

The pet remains associated with the Owner regardless of which veterinary clinic the pet visits.

Medical records are attached to the Pet, not the Clinic.

---

# Entity

## BREED

Purpose

Stores the list of supported dog breeds.

Using a lookup table prevents inconsistent breed names and simplifies filtering and reporting.

---

## Attributes

| Column | Type | Constraints |
|---------|------|-------------|
| BRD_ID | UUID | PK |
| BRD_NAME | VARCHAR(100) | NOT NULL, UNIQUE |
| BRD_DESCRIPTION | TEXT | NULL |
| BRD_CREATED_AT | TIMESTAMP | DEFAULT NOW() |
| BRD_UPDATED_AT | TIMESTAMP | DEFAULT NOW() |

---

# Business Rules

Breed names must be unique.

The system currently supports dogs only.

New breeds may be added by Super Admin.

---

# Indexes

UNIQUE

BRD_NAME

---

# Relationships

BREED

1

↓

Many

↓

PET

---

# Entity

## PET

Purpose

Stores all registered dogs owned by pet owners.

Medical records, appointments, vaccinations, prescriptions, and AI screenings are associated with the Pet.

---

## Attributes

| Column | Type | Constraints |
|---------|------|-------------|
| PET_ID | UUID | PK |
| OWN_ID | UUID | FK → OWNER_PROFILE |
| BRD_ID | UUID | FK → BREED |
| PET_NAME | VARCHAR(100) | NOT NULL |
| PET_SEX | ENUM | NOT NULL |
| PET_BIRTH_DATE | DATE | NULL |
| PET_WEIGHT | DECIMAL(5,2) | NULL |
| PET_COLOR | VARCHAR(100) | NULL |
| PET_MICROCHIP_NO | VARCHAR(100) | NULL, UNIQUE |
| PET_PROFILE_IMAGE | TEXT | NULL |
| PET_IS_ACTIVE | BOOLEAN | DEFAULT TRUE |
| PET_CREATED_AT | TIMESTAMP | DEFAULT NOW() |
| PET_UPDATED_AT | TIMESTAMP | DEFAULT NOW() |
| PET_DELETED_AT | TIMESTAMP | NULL |

---

# Sex Enum

MALE

FEMALE

---

# Business Rules

Every Pet belongs to exactly one Owner.

Owners may register multiple pets.

Pet names are not required to be unique.

Microchip numbers must be unique when provided.

Archived pets retain all historical medical records.

Soft Delete is supported.

---

# Indexes

IDX_PET_OWNER

IDX_PET_BREED

UNIQUE

PET_MICROCHIP_NO

---

# Relationships

OWNER_PROFILE

1

↓

Many

↓

PET

PET

Many

↓

1

↓

BREED

PET

1

↓

Many

↓

PET_IMAGE

PET

1

↓

Many

↓

APPOINTMENT

PET

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

AI_SCREENING

---

# Entity

## PET_IMAGE

Purpose

Stores additional pet photographs.

Images may include:

- Profile photos
- Skin disease photos
- Follow-up treatment photos
- Other veterinary reference images

---

## Attributes

| Column | Type | Constraints |
|---------|------|-------------|
| PTI_ID | UUID | PK |
| PET_ID | UUID | FK → PET |
| PTI_IMAGE_URL | TEXT | NOT NULL |
| PTI_IMAGE_TYPE | ENUM | NOT NULL |
| PTI_CREATED_AT | TIMESTAMP | DEFAULT NOW() |

---

# Image Type Enum

PROFILE

MEDICAL

AI_SCREENING

FOLLOW_UP

OTHER

---

# Business Rules

A Pet may have multiple images.

Only one Profile image should be active at a time.

Medical images must never be deleted once attached to a consultation.

---

# Indexes

IDX_PTI_PET

IDX_PTI_TYPE

---

# Relationships

PET

1

↓

Many

↓

PET_IMAGE

---

# Summary

Tables

• BREED

• PET

• PET_IMAGE

Dependencies

authentication.md

Used By

• Appointment Module

• Consultation Module

• AI Module

• Vaccination Module

• Reports

• Dashboard