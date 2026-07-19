# AGENTS.md

# XPawSure AI Development Guide

Version: 2.0

Audience:
- OpenCode
- OpenAI Codex
- ChatGPT
- Claude Code
- Cursor
- GitHub Copilot
- Windsurf

---

# Mission

You are contributing to XPawSure, an AI-assisted veterinary management system.

Your goal is to produce production-ready, maintainable code that follows the project's architecture, engineering standards, and business rules.

Do not invent architecture.

Do not change established workflows.

Always prefer maintainability over cleverness.

---

# AI Workflow

For every task:

1. Read this AGENTS.md first.
2. Identify the feature being implemented.
3. Load only the documentation relevant to that feature.
4. Explain the implementation plan before coding unless instructed otherwise.
5. Modify only files related to the requested feature.
6. Avoid unrelated refactoring.
7. Generate production-quality code.
8. Add tests when business logic changes.
9. Update documentation if behavior changes.

---

# Project Stack

Backend

- Django
- Django REST Framework
- Simple JWT
- PostgreSQL (Supabase)

Frontend

- React
- Vite
- TypeScript
- Tailwind CSS
- TanStack Query
- React Hook Form
- Zod

Mobile

- React Native
- Expo
- TensorFlow Lite

Database

- Supabase PostgreSQL
- Supabase Storage

AI

- TensorFlow Lite
- Mobile only
- No server-side inference

---

# Repository Structure

backend/
frontend/
mobile/
docs/

AGENTS.md

---

# Context Loading

Only load documentation related to the requested task.

## Authentication

Read:

- PROJECT_CONTEXT.md
- BUSINESS_RULES.md
- BACKEND_ARCHITECTURE.md
- FRONTEND_ARCHITECTURE.md
- API_SPEC.md

---

## Clinic Management

Read:

- DATABASE_SCHEMA.md
- BUSINESS_RULES.md
- API_SPEC.md

---

## Staff Management

Read:

- DATABASE_SCHEMA.md
- BUSINESS_RULES.md

---

## Owner Management

Read:

- DATABASE_SCHEMA.md
- API_SPEC.md
- BUSINESS_RULES.md
- MOBILE_ARCHITECTURE.md

---

## Pet Management

Read:

- DATABASE_SCHEMA.md
- BUSINESS_RULES.md
- API_SPEC.md

---

## Appointment

Read:

- DATABASE_SCHEMA.md
- API_SPEC.md
- BUSINESS_RULES.md

---

## Consultation

Read:

- DATABASE_SCHEMA.md
- API_SPEC.md
- BUSINESS_RULES.md

---

## Prescription

Read:

- DATABASE_SCHEMA.md
- BUSINESS_RULES.md

---

## Vaccination

Read:

- DATABASE_SCHEMA.md
- BUSINESS_RULES.md

---

## AI Screening

Read:

- AI_MODULE.md
- BUSINESS_RULES.md

---

## Reports

Read:

- API_SPEC.md
- FRONTEND_ARCHITECTURE.md

---

## Mobile (Owner App)

Read:

- MOBILE_ARCHITECTURE.md
- API_SPEC.md
- AI_MODULE.md
- BUSINESS_RULES.md

---

# Development Order

Every feature follows this lifecycle.

Requirements

↓

Business Rules

↓

Database

↓

Backend

↓

API

↓

Frontend

↓

Mobile (if applicable)

↓

Testing

↓

Documentation

↓

Review

Never skip steps.

---

# Architecture Rules

Backend

- Thin Views
- Thin Serializers
- Service Layer
- UUID Primary Keys
- RESTful APIs

Frontend

- Feature-based architecture
- Components remain presentational
- Hooks contain logic
- Services perform API requests
- Validation uses Zod
- Forms use React Hook Form

Mobile

- Expo Router
- TensorFlow Lite
- On-device inference only

---

# Business Rules

Business rules always override technical convenience.

Examples:

- AI assists pet owners and veterinarians.
- AI never provides a diagnosis.
- Medical history is immutable.
- Receptionists cannot create prescriptions.
- Clinics are onboarded manually.
- Clinic Admin changes password on first login.
- Every record belongs to exactly one clinic.
- Only Super Admin has cross-clinic access.

---

# Coding Standards

Always

- Use strict typing.
- Keep files focused.
- Reuse existing code.
- Write readable code.
- Handle errors.
- Validate inputs.

Never

- Use any unless absolutely necessary.
- Put business logic in React components.
- Put business logic in Django Views.
- Duplicate existing functionality.
- Introduce new libraries without approval.

---

# Scope Rules

Only modify files related to the requested task.

Do not:

- Rename folders
- Change architecture
- Move files
- Refactor unrelated code
- Change API contracts
- Replace libraries

unless explicitly requested.

---

# Testing

Business logic requires tests.

Generate when appropriate:

- Unit Tests
- API Tests
- Component Tests
- Integration Tests

Bug fixes require regression tests.

---

# Security

Always enforce:

- Authentication
- Authorization
- Validation
- Permission checks
- Secure defaults

Never expose:

- Secrets
- API Keys
- Passwords
- JWT Secrets
- Stack traces

---

# AI Rules

TensorFlow Lite runs ONLY on mobile.

Never

- Retrain models
- Perform inference in Django
- Modify model weights

Always

- Validate images
- Record model version
- Store prediction history
- Upload prediction metadata

---

# Response Format

Before coding (unless instructed otherwise):

Provide:

1. Summary
2. Implementation plan
3. Files to create
4. Files to modify
5. Potential risks

After coding provide:

- Files created
- Files modified
- Tests added
- Remaining TODOs

---

# Quality Checklist

Before considering a feature complete:

- Business rules satisfied
- Validation complete
- Permission checks implemented
- Error handling complete
- Tests passing
- Documentation updated
- No unrelated changes

Do not claim production-ready status unless all items are satisfied.

---

# Current Development Status

Completed

- Documentation
- System Architecture
- Repository Structure

In Progress

- Authentication

Planned

- Clinic Management
- Staff Management
- Owner Management
- Pet Management
- Appointment Management
- Consultation
- Prescription
- Vaccination
- AI Screening
- Reports
- Notifications
- Settings

---

# Final Rules

When uncertain:

1. Do not guess.
2. Ask for clarification.
3. Prefer simple solutions.
4. Follow existing architecture.
5. Keep implementations small and focused.
6. Generate code another developer can easily understand.