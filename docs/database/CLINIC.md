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
| CLN_ID | UUID | FK -> CLINIC |
| CLS_APPOINTMENT_DURATION | INTEGER | DEFAULT 30 |
| CLS_MAX_APPOINTMENTS_PER_DAY | INTEGER | DEFAULT 50 |
| CLS_ALLOW_OWNER_BOOKING | BOOLEAN | DEFAULT TRUE |
| CLS_TIMEZONE | VARCHAR(50) | DEFAULT 'Asia/Manila' |
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

# Entity

## CLINIC_OPERATING_HOURS

Purpose

Stores the clinic's weekly operating hours, one row per weekday. This table is the single source of truth for slot generation and booking-hour validation.

---

## Attributes

| Column | Type | Constraints |
|---------|------|-------------|
| COA_ID | UUID | PK |
| CLN_ID | UUID | FK -> CLINIC |
| DAY_OF_WEEK | VARCHAR(3) | MON, TUE, WED, THU, FRI, SAT, SUN |
| DAY_INDEX | SMALLINT | 0 (Monday) to 6 (Sunday) |
| OPENING_TIME | TIME | NULL when closed |
| CLOSING_TIME | TIME | NULL when closed |
| IS_CLOSED | BOOLEAN | DEFAULT TRUE |

---

# Business Rules

Each clinic has exactly seven rows, one per weekday.

Closed days store `IS_CLOSED = TRUE` with null times.

Open days require both opening and closing times, with closing after opening.

At least one day per clinic must be open.

Times use the clinic's configured `CLS_TIMEZONE` for clinic-local interpretation.

---

# Indexes

UNIQUE (CLN_ID, DAY_OF_WEEK)

---

# Relationships

CLINIC 1 -> many CLINIC_OPERATING_HOURS

---

# Summary

Tables

• CLINIC

• CLINIC_SETTINGS

• CLINIC_OPERATING_HOURS

Dependencies

authentication.md

Used By

• Appointment Module

• Staff Module

• Consultation Module

• Reports

• Dashboard