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
| CLN_LATITUDE | DECIMAL(9,6) | NULL |
| CLN_LONGITUDE | DECIMAL(9,6) | NULL |
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

# Geocoding

Clinic coordinates are resolved automatically from `CLN_ADDRESS` through the
OpenStreetMap Nominatim service. They are displayed as pins in the owner mobile
appointment booking flow.

- `CLN_LATITUDE` and `CLN_LONGITUDE` are nullable because geocoding is
  best-effort. A clinic without coordinates still appears in the owner clinic
  list, but it has no map pin.
- Coordinates are written when a clinic is created with an address or when its
  address changes. Non-address updates do not call the geocoding provider.
- `python manage.py geocode_clinics` backfills missing coordinates for existing
  clinics. Use `--force` to refresh clinics that already have coordinates and
  `--dry-run` to inspect the queue without making network calls.
- The public Nominatim service requires an identifying `User-Agent` and at most
  one request per second. The application enforces the rate limit and caches
  results in the `CLINIC` table.

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