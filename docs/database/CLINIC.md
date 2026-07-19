# clinic.md

> Module: Clinic Management
> Version: 1.0
> Status: Final
> Depends On:
> - authentication.md

---

# Overview

The Clinic module manages all veterinary clinics registered in the XPawSure platform.

Only Super Administrators can create, update, activate, suspend, or archive clinics.

Every clinic operates independently.

Clinic staff belong to one clinic only.

Pet owners are not permanently assigned to a clinic.

They interact with clinics through appointments.

---

# Entity

## CLINIC

Purpose

Stores the primary information of every veterinary clinic registered in XPawSure.

---

## Attributes

| Column | Type | Constraints |
|---------|------|-------------|
| CLN_ID | UUID | PK |
| CLN_NAME | VARCHAR(255) | NOT NULL, UNIQUE |
| CLN_EMAIL | VARCHAR(255) | UNIQUE |
| CLN_PHONE | VARCHAR(20) | NULL |
| CLN_ADDRESS | TEXT | NOT NULL |
| CLN_LOGO_URL | TEXT | NULL |
| CLN_STATUS | ENUM | NOT NULL |
| CLN_CREATED_AT | TIMESTAMP | DEFAULT NOW() |
| CLN_UPDATED_AT | TIMESTAMP | DEFAULT NOW() |
| CLN_DELETED_AT | TIMESTAMP | NULL |

---

# Status Enum

ACTIVE

INACTIVE

SUSPENDED

ARCHIVED

---

# Business Rules

Clinic names must be unique.

Only Super Admin may create clinics.

Suspended clinics cannot accept appointments.

Archived clinics are hidden from normal operations.

Soft Delete is supported.

---

# Indexes

UNIQUE

CLN_NAME

CLN_EMAIL

INDEX

CLN_STATUS

---

# Relationships

CLINIC

1

↓

Many

↓

STAFF_PROFILE

CLINIC

1

↓

Many

↓

APPOINTMENT

CLINIC

1

↓

1

↓

CLINIC_SETTINGS

---

# Entity

## CLINIC_SETTINGS

Purpose

Stores clinic-specific configuration and operational settings.

Separating settings from the CLINIC table keeps the design normalized and allows future expansion.

---

## Attributes

| Column | Type | Constraints |
|---------|------|-------------|
| CLS_ID | UUID | PK |
| CLN_ID | UUID | FK → CLINIC |
| CLS_OPENING_TIME | TIME | NOT NULL |
| CLS_CLOSING_TIME | TIME | NOT NULL |
| CLS_APPOINTMENT_DURATION | INTEGER | DEFAULT 30 |
| CLS_MAX_APPOINTMENTS_PER_DAY | INTEGER | DEFAULT 50 |
| CLS_ALLOW_OWNER_BOOKING | BOOLEAN | DEFAULT TRUE |
| CLS_CREATED_AT | TIMESTAMP | DEFAULT NOW() |
| CLS_UPDATED_AT | TIMESTAMP | DEFAULT NOW() |

---

# Business Rules

Each clinic has exactly one settings record.

Appointment duration is stored in minutes.

Only Clinic Admin may update clinic settings.

Super Admin may override settings.

---

# Indexes

UNIQUE

CLN_ID

---

# Relationships

CLINIC

1

↓

1

↓

CLINIC_SETTINGS

---

# Summary

Tables

• CLINIC

• CLINIC_SETTINGS

Dependencies

authentication.md

Used By

• Appointment Module

• Staff Module

• Consultation Module

• Reports

• Dashboard