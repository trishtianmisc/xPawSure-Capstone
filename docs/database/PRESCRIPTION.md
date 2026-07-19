# prescription.md

> Module: Prescription Management
> Version: 1.0
> Status: Final
> Depends On:
>
> - consultation.md

---

# Overview

The Prescription module manages medications prescribed by veterinarians during a consultation.

Every Prescription belongs to exactly one Consultation.

A Prescription may contain one or more prescribed medications.

Only Veterinarians may create Prescriptions.

Prescription records are immutable and form part of the Pet's permanent medical history.

---

# Entity

## PRESCRIPTION

Purpose

Stores the prescription header generated after a Consultation.

Medication details are stored separately in PRESCRIPTION_ITEM.

---

## Attributes

| Column | Type | Constraints |
|---------|------|-------------|
| PRS_ID | UUID | PK |
| CON_ID | UUID | FK → CONSULTATION |
| STF_ID | UUID | FK → STAFF_PROFILE |
| PRS_INSTRUCTIONS | TEXT | NULL |
| PRS_CREATED_AT | TIMESTAMP | DEFAULT NOW() |
| PRS_UPDATED_AT | TIMESTAMP | DEFAULT NOW() |

---

# Business Rules

Every Prescription belongs to one Consultation.

Only Veterinarians may prescribe medications.

Prescription records cannot be deleted.

Prescription records become read-only after creation.

Every medication belongs to exactly one Prescription.

---

# Relationships

CONSULTATION

1

↓

1

↓

PRESCRIPTION

PRESCRIPTION

1

↓

Many

↓

PRESCRIPTION_ITEM

---

# Entity

## PRESCRIPTION_ITEM

Purpose

Stores individual medications prescribed during a Consultation.

A Prescription may contain multiple medications.

---

## Attributes

| Column | Type | Constraints |
|---------|------|-------------|
| PRI_ID | UUID | PK |
| PRS_ID | UUID | FK → PRESCRIPTION |
| PRI_MEDICINE_NAME | VARCHAR(255) | NOT NULL |
| PRI_DOSAGE | VARCHAR(100) | NOT NULL |
| PRI_FREQUENCY | VARCHAR(100) | NOT NULL |
| PRI_DURATION | VARCHAR(100) | NOT NULL |
| PRI_ROUTE | ENUM | NOT NULL |
| PRI_QUANTITY | INTEGER | NULL |
| PRI_NOTES | TEXT | NULL |
| PRI_CREATED_AT | TIMESTAMP | DEFAULT NOW() |

---

# Route Enum

ORAL

TOPICAL

INJECTION

EAR

EYE

OTHER

---

# Business Rules

Medication name is required.

Dosage is required.

Frequency is required.

Duration is required.

Multiple medications may exist in one Prescription.

Medication records cannot be deleted.

---

# Indexes

IDX_PRESCRIPTION_CONSULTATION

IDX_PRESCRIPTION_VETERINARIAN

IDX_PRESCRIPTION_ITEM

---

# Prescription Workflow

Consultation

↓

Diagnosis

↓

Prescription

↓

Medication 1

Medication 2

Medication 3

↓

Medical History

---

# Summary

Tables

• PRESCRIPTION

• PRESCRIPTION_ITEM

Dependencies

• CONSULTATION

• STAFF_PROFILE

Used By

• Medical History

• Reports

• Owner Mobile Application

• Veterinarian Dashboard