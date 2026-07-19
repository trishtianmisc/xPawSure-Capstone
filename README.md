# XPawSure

AI-Assisted Veterinary Management System with Mobile Deep Learning for Canine Skin Condition Preliminary Screening

---

## Overview

XPawSure is a full-stack veterinary clinic management platform designed to streamline clinic operations while providing AI-assisted preliminary screening for canine skin conditions.

The platform consists of:

- 🖥 Veterinary Clinic Web Application (React)
- 📱 Pet Owner Mobile Application (React Native + Expo)
- ⚙ Backend API (Django REST Framework)
- 🧠 TensorFlow Lite AI Model
- 🗄 Supabase PostgreSQL Database
- 📦 Supabase Storage

The AI module provides preliminary predictions only and does not replace a licensed veterinarian's diagnosis.

---

## Features

- User Authentication
- Role-Based Access Control
- Pet Management
- Owner Management
- Appointment Scheduling
- Consultation Records
- AI Skin Screening
- Vaccination Records
- Prescription Management
- Medical History
- Reports & Analytics

---

## Clinic Onboarding

XPawSure does not provide public clinic registration. Interested clinics contact XPawSure outside the system. After manual approval, a Super Admin creates the Clinic and its Clinic Admin account, then sends a temporary password or account activation email to the clinic's registered email address.

Clinic Admins must change their password on first login before accessing the system. They can then manage Veterinarian and Receptionist accounts for their own clinic.

---

## Roles and Data Isolation

- **Super Admin:** manages all clinics, creates clinics and Clinic Admin accounts, suspends or activates clinics, and views platform analytics.
- **Clinic Admin:** manages their clinic profile, Veterinarians, Receptionists, and clinic reports.
- **Veterinarian:** manages consultations, reviews AI screening results, creates prescriptions, and maintains medical records.
- **Receptionist:** registers owners and pets, schedules appointments, and checks patients in.
- **Owner:** self-registers through the mobile app, manages pets, performs AI screening, books appointments, and views medical history (read-only).

Every Owner, Pet, Appointment, Consultation, Prescription, Vaccination, AI Screening, and Report belongs to exactly one clinic. Users can access only their own clinic's data; Super Admins alone have cross-clinic access.

---
