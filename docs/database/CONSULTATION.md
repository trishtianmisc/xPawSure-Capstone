# consultation.md

> Module: Consultation Management
> Version: 1.0
> Status: Final
> Depends On:
>
> - appointment.md
> - authentication.md

---

# Overview

The Consultation module stores the official veterinary medical record generated after an appointment.

A Consultation is created only by a Veterinarian.

Every Consultation belongs to exactly one Appointment.

Medical records are immutable and form part of the permanent medical history of a Pet.

---

# Entity

## CONSULTATION

Purpose

Stores the veterinarian's examination, diagnosis, assessment, and treatment plan.

This is the primary medical record of XPawSure.

---

## Attributes

| Column | Type | Constraints |
|---------|------|-------------|
| CON_ID | UUID | PK |
| APT_ID | UUID | FK → APPOINTMENT (UNIQUE) |
| STF_ID | UUID | FK → STAFF_PROFILE |
| CON_CHIEF_COMPLAINT | TEXT | NULL |
| CON_SUBJECTIVE | TEXT | NULL |
| CON_OBJECTIVE | TEXT | NULL |
| CON_ASSESSMENT | TEXT | NULL |
| CON_PLAN | TEXT | NULL |
| CON_DIAGNOSIS | TEXT | NOT NULL |
| CON_TREATMENT | TEXT | NULL |
| CON_NOTES | TEXT | NULL |
| CON_CREATED_AT | TIMESTAMP | DEFAULT NOW() |
| CON_UPDATED_AT | TIMESTAMP | DEFAULT NOW() |

---

# Business Rules

A Consultation may only be created after an Appointment.

Every Appointment can have only one Consultation.

Only Veterinarians may create Consultations.

Consultations cannot be deleted.

Consultations become read-only after creation.

All updates must be recorded in the Audit Log.

---

# Relationships

APPOINTMENT

1

↓

1

↓

CONSULTATION

STAFF_PROFILE

1

↓

Many

↓

CONSULTATION

CONSULTATION

1

↓

1

↓

PRESCRIPTION

CONSULTATION

1

↓

Many

↓

CONSULTATION_ATTACHMENT

CONSULTATION

1

↓

Many

↓

VACCINATION_RECORD

CONSULTATION

0

↓

Many

↓

AI_SCREENING

---

# Validation Rules

Appointment must have status = COMPLETED.

Assigned Veterinarian must match the Appointment.

Diagnosis is required.

Treatment is optional.

SOAP fields are optional but recommended.

---

# Medical Workflow

Appointment

↓

Consultation

↓

Diagnosis

↓

Prescription

↓

Vaccination

↓

Medical History

---

# Entity

## CONSULTATION_ATTACHMENT

Purpose

Stores supporting files related to a Consultation.

Examples

- Skin lesion photographs
- Laboratory reports
- Blood chemistry results
- X-rays
- Histopathology reports

---

## Attributes

| Column | Type | Constraints |
|---------|------|-------------|
| CAT_ID | UUID | PK |
| CON_ID | UUID | FK → CONSULTATION |
| CAT_FILE_URL | TEXT | NOT NULL |
| CAT_FILE_NAME | VARCHAR(255) | NOT NULL |
| CAT_FILE_TYPE | ENUM | NOT NULL |
| CAT_FILE_SIZE | INTEGER | NULL |
| CAT_UPLOADED_AT | TIMESTAMP | DEFAULT NOW() |

---

# File Types

IMAGE

PDF

XRAY

LAB_RESULT

DOCUMENT

OTHER

---

# Business Rules

Multiple attachments are allowed.

Files cannot be deleted after the Consultation is finalized.

Only authorized clinic staff may upload attachments.

---

# Indexes

IDX_CONSULTATION_APPOINTMENT

IDX_CONSULTATION_VETERINARIAN

IDX_ATTACHMENT_CONSULTATION

---

# Summary

Tables

• CONSULTATION

• CONSULTATION_ATTACHMENT

Dependencies

• APPOINTMENT

• STAFF_PROFILE

Used By

• Prescription Module

• Vaccination Module

• AI Screening Module

• Reports

• Medical History