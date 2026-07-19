# audit_log.md

> Module: Audit Logging
> Version: 1.0
> Status: Final
> Depends On:
>
> - authentication.md

---

# Overview

The Audit Log module records all important actions performed within the XPawSure platform.

Audit Logs provide accountability, traceability, and security by recording who performed an action, when it occurred, and what data was affected.

Audit records are immutable.

They are never edited or deleted.

---

# Entity

## AUDIT_LOG

Purpose

Stores a complete history of important actions performed by authenticated users.

This table is used for:

- Security
- Compliance
- Debugging
- Activity Tracking
- Medical Record Integrity

---

## Attributes

| Column | Type | Constraints |
|---------|------|-------------|
| ADL_ID | UUID | PK |
| USR_ID | UUID | FK → USER |
| ADL_ACTION | ENUM | NOT NULL |
| ADL_MODULE | VARCHAR(100) | NOT NULL |
| ADL_TABLE_NAME | VARCHAR(100) | NOT NULL |
| ADL_RECORD_ID | UUID | NOT NULL |
| ADL_DESCRIPTION | TEXT | NULL |
| ADL_OLD_VALUES | JSONB | NULL |
| ADL_NEW_VALUES | JSONB | NULL |
| ADL_IP_ADDRESS | VARCHAR(50) | NULL |
| ADL_DEVICE | VARCHAR(255) | NULL |
| ADL_CREATED_AT | TIMESTAMP | DEFAULT NOW() |

---

# Action Enum

CREATE

UPDATE

DELETE

LOGIN

LOGOUT

REGISTER

PASSWORD_CHANGE

PASSWORD_RESET

AI_SCREENING

BOOK_APPOINTMENT

UPLOAD_ATTACHMENT

EXPORT_REPORT

---

# Business Rules

Every Audit Log belongs to exactly one User.

Audit Logs are immutable.

Audit Logs cannot be updated.

Audit Logs cannot be deleted.

Every important business transaction should generate an Audit Log.

Medical record modifications must always generate an Audit Log.

Authentication events must generate an Audit Log.

---

# Relationships

USER

1

↓

Many

↓

AUDIT_LOG

---

# Validation Rules

User is required.

Action is required.

Module is required.

Table Name is required.

Record ID is required.

Timestamp is automatically generated.

---

# Indexes

IDX_AUDIT_USER

IDX_AUDIT_ACTION

IDX_AUDIT_MODULE

IDX_AUDIT_CREATED_AT

IDX_AUDIT_RECORD

---

# Audit Workflow

User Action

↓

System Validation

↓

Business Operation

↓

Database Update

↓

Create Audit Log

↓

Store History

---

# Examples

Owner registers a pet

↓

CREATE

Module = PET

Table = PET

---

Veterinarian creates consultation

↓

CREATE

Module = CONSULTATION

Table = CONSULTATION

---

Receptionist edits appointment

↓

UPDATE

Module = APPOINTMENT

Table = APPOINTMENT

---

Owner performs AI Screening

↓

AI_SCREENING

Module = AI

Table = AI_SCREENING

---

Super Admin creates Clinic

↓

CREATE

Module = CLINIC

Table = CLINIC

---

# Summary

Table

• AUDIT_LOG

Dependencies

• USER

Used By

• Security

• Reports

• Administration

• Medical Record Integrity

• Activity Monitoring

• Compliance

---

# Immutable Policy

Audit Logs are permanent records.

The system must never:

- Update Audit Logs
- Delete Audit Logs
- Overwrite Audit Logs

Only new Audit Log entries may be created.

This ensures a complete historical record of all significant system activity.