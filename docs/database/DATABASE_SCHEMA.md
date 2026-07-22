# DATABASE_SCHEMA.md

> Project: XPawSure
> Version: 3.0
> Database: Supabase PostgreSQL
> Status: Final Database Design
> Last Updated: July 2026

---

# Overview

XPawSure uses a relational database powered by Supabase PostgreSQL.

The database is designed to support a multi-platform veterinary ecosystem consisting of:

- Veterinary Clinic Web Application
- Pet Owner Mobile Application

The schema follows Third Normal Form (3NF) to reduce redundancy while maintaining scalability and data integrity.

---

# Database Design Principles

The database follows these principles:

- UUID Primary Keys
- Foreign Key Constraints
- Normalized Data
- Soft Delete where applicable
- Immutable Medical Records
- Timestamp Auditing
- Secure Authentication
- Multi-Clinic Support
- Owner-Centric Pet Records

---

# Primary Key Convention

Every table uses UUID version 4.

Example

USER

USR_ID

PET

PET_ID

CLINIC

CLN_ID

---

# Timestamp Convention

Every mutable table contains:

CREATED_AT

UPDATED_AT

Deleted records use:

DELETED_AT

Medical records are immutable and therefore do not support deletion.

---

# Naming Convention

Each table uses a unique prefix.

| Table | Prefix |
|--------|--------|
| USER | USR |
| STAFF_PROFILE | STF |
| OWNER_PROFILE | OWN |
| CLINIC | CLN |
| CLINIC_SETTINGS | CLS |
| BREED | BRD |
| PET | PET |
| PET_QR_CODE | PQC |
| PET_QR_CODE_URL | PQR |
| PET_IMAGE | PTI |
| APPOINTMENT | APT |
| CONSULTATION | CON |
| CONSULTATION_ATTACHMENT | CAT |
| PRESCRIPTION | PRS |
| PRESCRIPTION_ITEM | PRI |
| VACCINATION_RECORD | VAC |
| DISEASE | DIS |
| AI_SCREENING | AIS |
| AI_SCREENING_IMAGE | ASI |
| NOTIFICATION | NTF |
| AUDIT_LOG | ADL |

---

# Modules

The database is divided into the following modules.

## Authentication

- User
- Staff Profile
- Owner Profile

---

## Clinic Management

- Clinic
- Clinic Settings

---

## Pet Management

- Breed
- Pet
- Pet Image

---

## Appointment Management

- Appointment

---

## Medical Records

- Consultation
- Consultation Attachment
- Prescription
- Prescription Item
- Vaccination Record

---

## Artificial Intelligence

- Disease
- AI Screening
- AI Screening Image

---

## System

- Notification
- Audit Log

---

# Business Rules

- Every User has one role.
- Every Owner has exactly one Owner Profile.
- Every Pet belongs to exactly one Owner.
- Owners may own multiple Pets.
- Pets may visit multiple Clinics through Appointments.
- Every Appointment belongs to one Clinic.
- Consultations are created only after an Appointment.
- AI Screening is a preliminary assessment only.
- Medical records are immutable.
- Only Veterinarians may create Consultations, Prescriptions, and Vaccination Records.
- Owners may view medical records but cannot modify them.
- Super Admin has cross-clinic access.

---

# Database Modules

The following documents contain the detailed schema for each module.

- authentication.md
- clinic.md
- owner.md
- pet.md
- appointment.md
- consultation.md
- prescription.md
- vaccination.md
- ai_screening.md
- notification.md
- audit_log.md

---

# Status

Database Design: FINAL

This schema serves as the single source of truth for:

- Django Models
- PostgreSQL Schema
- Supabase Tables
- REST API
- React Web Application
- React Native Mobile Application
- AI Module