# SYSTEM_ARCHITECTURE.md

> Version: 2.0
> Project: XPawSure
> Last Updated: July 2026

---

# 1. Project Overview

XPawSure is a veterinary management platform with integrated AI-assisted canine skin condition screening.

The system is composed of three primary components:

1. Veterinary Clinic Web Application
2. Pet Owner Mobile Application
3. Backend API

The web and mobile applications share the same backend and database.

The AI model runs ONLY on the mobile application using TensorFlow Lite. The backend never performs machine learning inference.

The purpose of the AI is to assist pet owners and veterinarians by providing a preliminary screening result. The AI never replaces professional veterinary diagnosis.

---

# 2. Project Objectives

The project aims to:

- Digitize veterinary clinic operations.
- Replace paper medical records.
- Simplify appointment management.
- Maintain complete patient histories.
- Assist pet owners during skin examinations.
- Improve record accessibility.
- Reduce repetitive administrative work.
- Demonstrate production-quality software engineering practices.

---

# 3. High Level Architecture

                 Internet
                     │
     ┌───────────────┴───────────────┐
     │                               │
React Web                     React Native
(Vite)                           (Expo)
Clinic Staff                Pet Owners
     │                               │
     └───────────────┬───────────────┘
                     │
          Django REST Framework API
                     │
         Supabase PostgreSQL Database
              Supabase Storage

The mobile application also contains:

Camera
↓

TensorFlow Lite

↓

Prediction

↓

Upload Result to Backend

---

# 4. Applications

## Web Application

Purpose:

Veterinary clinic management system for clinic staff.

Used by:

- Super Admin
- Clinic Admin
- Veterinarian
- Receptionist

Main modules:

- Dashboard
- User Management
- Owners
- Pets
- Appointments
- Consultations
- Medical Records
- Vaccinations
- Prescriptions
- Reports
- AI Screening Results (View Only)

The web application NEVER performs AI prediction.

---

## Mobile Application

Purpose:

Pet owner companion application.

Main features:

- Register an account
- Login
- Manage profile
- Register and manage multiple pets
- Capture dog skin image
- AI-assisted preliminary screening
- Upload prediction results
- View screening history
- Book appointments with veterinary clinics
- View appointment history
- View consultation history
- View prescriptions
- View vaccination records
- Receive notifications

Only the mobile application runs TensorFlow Lite.

---

## Backend

Responsibilities:

- Authentication
- Authorization
- REST API
- Business Logic
- Validation
- Supabase Storage
- Notifications
- Database Access

The backend never trains or executes machine learning models.

---

## Database

Database Engine:

Supabase PostgreSQL

Django connects to Supabase PostgreSQL using the PostgreSQL connection string.

Database Storage:

Supabase Storage

The database stores:

Users

OwnerProfiles

Pets

Appointments

Consultations

Medical Records

Vaccinations

Prescriptions

AI Screenings

Notifications

Audit Logs

---

# 5. Intended Users

## Super Admin

Can manage:

- All clinics

- Create clinics and Clinic Admin accounts

- Suspend or activate clinics

- View platform analytics

---

## Clinic Admin

Can manage:

- Their clinic profile

- Veterinarians and Receptionists within their own clinic

- Clinic reports

Cannot manage other clinics or grant Super Admin privileges.

---

## Receptionist

Can manage:

- Register owners

- Register pets

- Schedule appointments

- Check patients in

Cannot edit medical diagnosis.

Can access only records within their own clinic.

---

## Veterinarian

Can:

- Manage consultations

- Review AI screening results

- Create prescriptions

- Maintain medical records

Can access only appointments and records within their own clinic.

---

## Owner

Can:

- Register an account

- Manage their profile

- Register and manage their own pets

- Perform AI-assisted screening

- Book appointments

- View appointment, consultation, prescription, and vaccination history

- Receive notifications

Cannot edit medical records.

---

## Clinic Onboarding

XPawSure does not allow public clinic registration or in-system clinic applications. Interested clinics contact XPawSure outside the system, and a Super Admin manually reviews each request.

After approval, the Super Admin creates the Clinic record and Clinic Admin account, then sends a temporary password or account activation email to the clinic's registered email address. The Clinic Admin must change their password on first login before accessing the system. Afterward, the Clinic Admin manages Veterinarian and Receptionist accounts only within that clinic.

Owner self-registration is supported through the mobile application.

---

## Data Isolation

Every Clinic, OwnerProfile, Pet, Appointment, Consultation, Prescription, Vaccination, AI Screening, and Report belongs to exactly one clinic. Clinic staff may access only their own clinic's data. Super Admins are the only users with cross-clinic access.

Owners may access only their own profile and their own pets' records.

---

# 6. AI Module

The AI module performs image classification.

Current objective:

Detect common canine skin diseases.

The AI runs completely offline using TensorFlow Lite.

Inference pipeline:

Capture Image

↓

Resize

↓

Normalize

↓

TensorFlow Lite

↓

Prediction

↓

Confidence

↓

Upload Result

The backend only stores results.

---

# 7. Scope

Included

✔ Authentication and Role Management

✔ Owner Self-Registration

✔ Owner Profile Management

✔ Pet Management

✔ Owner Appointment Booking

✔ AI Screening (Mobile Only)

✔ Consultation Management

✔ Vaccination Records

✔ Prescription Records

✔ Medical History

✔ Reporting

✔ Notifications

---

Not Included

Online consultation

Payment gateway

Inventory management

SMS gateway

Appointment recommendation

Cloud AI inference

AI model retraining

---

# 8. Technology Stack

Frontend Web

React

Vite

TypeScript

Tailwind CSS

TanStack Query

React Hook Form

Zod

---

Frontend Mobile

React Native

Expo

TypeScript

Expo Camera

TensorFlow Lite

---

Backend

Python

Django

Django REST Framework

SimpleJWT

---

Database

Supabase PostgreSQL

Storage

Supabase Storage

---

Version Control

Git

GitHub

---

# 9. Repository Structure

xpawsure/

backend/

frontend/

web/

mobile/

database/

docs/

assets/

scripts/

.github/

README.md

PROJECT_CONTEXT.md

---

# 10. Development Principles

Always build maintainable software.

Always prioritize readability.

Avoid unnecessary complexity.

Business logic belongs in services.

Views should remain thin.

Frontend components should be reusable.

Avoid duplicated code.

Favor composition over inheritance.

Follow SOLID principles whenever practical.

---

# 11. Coding Standards

Python

PEP8

Type hints

Docstrings

Black formatting

Ruff linting

---

TypeScript

Strict mode enabled.

Never use "any" unless absolutely necessary.

Prefer interfaces for shared contracts.

Keep components small.

---

React

Functional components only.

Hooks only.

No class components.

Feature-based architecture.

---

# 12. API Principles

REST API only.

JSON communication.

JWT Authentication.

Version endpoints when necessary.

Never expose internal implementation details.

Return consistent response structures.

Validate every request.

Never trust client input.

---

# 13. Database Principles

Use UUID as primary keys.

Use created_at.

Use updated_at.

Prefer soft delete where appropriate.

Use foreign keys properly.

Avoid duplicated data.

Normalize before optimizing.

---

# 14. Business Rules

AI provides preliminary screening only.

Veterinarians make final diagnosis.

Medical records cannot be permanently deleted.

Every consultation belongs to one appointment.

Every appointment belongs to one pet.

Every pet belongs to one owner profile.

Every AI screening belongs to one consultation.

Consultation history is immutable.

Prescription history is immutable.

Vaccination history is immutable.

Clinics are created only by Super Admins after manual approval; public clinic registration and in-system clinic application workflows are not allowed.

Clinic Admins must change their password on first login before accessing protected application functionality.

Owners self-register through the mobile application.

Owners may view but never edit medical records.

---

# 15. Security Rules

Passwords must be hashed.

Never store plaintext passwords.

Use HTTPS.

Validate every upload.

Restrict file types.

Protect every authenticated endpoint.

Implement role-based authorization.

Log important security events.

---

# 16. Development Workflow

Every feature should follow this order:

1. Database Model
2. Migration
3. Serializer
4. Service Layer
5. API Endpoint
6. Permissions
7. Tests
8. Frontend Integration (Web)
9. Mobile Integration (if applicable)
10. Documentation

---

# 17. AI Development Rules

The AI model is trained outside the application.

Only TensorFlow Lite models are deployed.

Never retrain models inside the application.

Always preprocess images before inference.

Return:

Prediction

Confidence Score

Top Predictions

Model Version

Inference Time

---

# 18. Definition of Done

A feature is considered complete when:

✓ Backend implemented

✓ API documented

✓ Tests pass

✓ Web frontend completed (if applicable)

✓ Mobile completed (if applicable)

✓ Error handling implemented

✓ Validation implemented

✓ Documentation updated

✓ Code reviewed

---

# 19. Future Roadmap

Future releases may include:

Inventory Management

Billing

SMS Notifications

Email Notifications

Cloud Synchronization

Analytics Dashboard

Appointment Recommendations

Multi-Clinic Support

AI Model Updates

Telemedicine

Offline Synchronization

---

# 20. Instructions for AI Coding Assistants

When generating code for this repository:

- Follow the repository structure exactly.
- Do not introduce new frameworks without justification.
- Respect the service-layer architecture.
- Do not place business logic in controllers/views.
- Prefer reusable components.
- Maintain strict TypeScript.
- Maintain clean Django architecture.
- Keep functions small and focused.
- Write self-documenting code.
- Generate tests for new functionality whenever practical.
- If requirements are unclear, ask for clarification instead of making assumptions.
- Follow this document as the authoritative source unless a newer project decision explicitly supersedes it.
