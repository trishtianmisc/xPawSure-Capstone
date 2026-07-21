# authentication.md

> Module: Authentication
> Version: 1.0
> Status: Final
> Depends On: None

---

# Overview

The Authentication module manages every account within XPawSure.

All users authenticate using email and password.

Authentication is handled by Django REST Framework with JWT.

Every authenticated account belongs to exactly one role.

---

# Roles

The system supports the following roles.

| Role | Description |
|-------|-------------|
| SUPER_ADMIN | Manages the entire XPawSure platform. |
| CLINIC_ADMIN | Manages one veterinary clinic. |
| VETERINARIAN | Performs consultations and medical procedures. |
| RECEPTIONIST | Handles appointments and patient registration. |
| OWNER | Uses the mobile application to manage pets and AI screening. |

---

# Entity

## USER

Purpose

Stores authentication credentials and account information for every user.

---

## Attributes

| Column | Type | Constraints |
|---------|------|-------------|
| USR_ID | UUID | PK |
| USR_EMAIL | VARCHAR(255) | NOT NULL, UNIQUE |
| USR_PASSWORD_HASH | VARCHAR(255) | NOT NULL |
| USR_ROLE | ENUM | NOT NULL |
| USR_IS_ACTIVE | BOOLEAN | DEFAULT TRUE |
| USR_EMAIL_VERIFIED | BOOLEAN | DEFAULT FALSE |
| USR_MUST_CHANGE_PASSWORD | BOOLEAN | DEFAULT FALSE |
| USR_LAST_LOGIN | TIMESTAMP | NULL |
| USR_CREATED_AT | TIMESTAMP | DEFAULT NOW() |
| USR_UPDATED_AT | TIMESTAMP | DEFAULT NOW() |
| USR_DELETED_AT | TIMESTAMP | NULL |

---

# Business Rules

Email must be unique.

Passwords are never stored in plain text.

Only active accounts may authenticate.

Clinic Admin accounts must change password on first login.

Owner accounts register through the mobile application.

Clinic staff accounts are created only by Clinic Admin or Super Admin.

---

# Indexes

UNIQUE

USR_EMAIL

---

# Relationships

USER

↓

1 : 1

↓

STAFF_PROFILE

USER

↓

1 : 1

↓

OWNER_PROFILE

---

# Entity

## STAFF_PROFILE

Purpose

Stores clinic-specific information for staff members.

Authentication information remains in USER.

---

## Attributes

| Column | Type | Constraints |
|---------|------|-------------|
| STF_ID | UUID | PK |
| USR_ID | UUID | FK → USER |
| CLN_ID | UUID | FK → CLINIC |
| STF_LICENSE_NUMBER | VARCHAR(100) | NULL |
| STF_POSITION | ENUM | NOT NULL |
| STF_CREATED_AT | TIMESTAMP | DEFAULT NOW() |
| STF_UPDATED_AT | TIMESTAMP | DEFAULT NOW() |

---

# Position Enum

CLINIC_ADMIN

VETERINARIAN

RECEPTIONIST

---

# Business Rules

Every staff profile belongs to exactly one user.

Every staff profile belongs to exactly one clinic.

Only veterinarians may perform consultations.

Receptionists cannot prescribe medications.

---

# Indexes

IDX_STAFF_CLINIC

IDX_STAFF_USER

---

# Relationships

Clinic

1

↓

Many

↓

Staff Profiles

---

# Entity

## OWNER_PROFILE

Purpose

Stores owner information.

Authentication remains in USER.

Owners are platform users and are not permanently attached to one clinic.

They interact with clinics through appointments.

---

## Attributes

| Column | Type | Constraints |
|---------|------|-------------|
| OWN_ID | UUID | PK |
| USR_ID | UUID | FK → USER |
| OWN_ADDRESS | TEXT | NULL |
| OWN_PROFILE_IMAGE | TEXT | NULL |
| OWN_CREATED_AT | TIMESTAMP | DEFAULT NOW() |
| OWN_UPDATED_AT | TIMESTAMP | DEFAULT NOW() |

---

# Business Rules

Every owner has exactly one owner profile.

One owner may register multiple pets.

Owners use the mobile application.

Owners cannot modify consultation records.

Owners cannot modify prescriptions.

Owners cannot modify vaccination records.

---

# Indexes

IDX_OWNER_USER

---

# Relationships

USER

1

↓

1

↓

OWNER_PROFILE

OWNER_PROFILE

1

↓

Many

↓

PET

---

# Summary

Tables

• USER

• STAFF_PROFILE

• OWNER_PROFILE

Dependencies

None

Used By

Clinic Module

Pet Module

Appointment Module

Notification Module

Audit Log