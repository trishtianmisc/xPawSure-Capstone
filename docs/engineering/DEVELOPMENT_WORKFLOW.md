# DEVELOPMENT_WORKFLOW.md

> Version: 2.0
> Project: XPawSure
> Applies To: Backend, Frontend, Mobile, AI

---

# 1. Purpose

This document defines the official development workflow for XPawSure.

Every feature, bug fix, refactor, and enhancement must follow this workflow.

This document ensures all contributors and AI coding assistants implement features consistently.

---

# 2. Development Philosophy

Every feature must be developed in layers.

Never start with the frontend.

Never skip database design.

Never skip testing.

Every feature follows the same implementation sequence.

---

# 3. Feature Development Lifecycle

Every feature follows this order.

```

Requirements

↓

Business Rules

↓

Database Design

↓

Backend

↓

API

↓

Frontend

↓

Mobile

↓

Testing

↓

Documentation

↓

Review

↓

Merge

```

Skipping steps is prohibited.

---

# 4. Step 1 — Requirements Analysis

Before writing code, determine:

- What problem is being solved?
- Which users are affected?
- Which business rules apply?
- Which existing modules are involved?
- Are there security implications?
- Does this feature already exist?

AI coding assistants should ask for clarification if requirements are ambiguous.

---

# 5. Step 2 — Review Business Rules

Identify all applicable business rules.

Examples

Appointment

↓

BUSINESS_RULES.md

Consultation

↓

BUSINESS_RULES.md

AI Screening

↓

AI_MODULE.md

Never implement features that violate business rules.

---

# 6. Step 3 — Database Design

Before coding

Determine

- Tables
- Relationships
- Constraints
- Indexes
- UUID usage
- Audit fields

Update DATABASE_SCHEMA.md if necessary.

Generate

- Django Model
- Migration

---

# 7. Step 4 — Backend Development

Implementation order

```

Model

↓

Migration

↓

Serializer

↓

Service

↓

Permissions

↓

ViewSet

↓

Routes

↓

Tests

```

Never skip the service layer.

---

# 8. Backend Checklist

Every backend feature includes

☐ Django Model

☐ Migration

☐ Serializer

☐ Service

☐ Permission

☐ ViewSet

☐ URLs

☐ Admin Registration (if needed)

☐ Unit Tests

☐ API Tests

---

# 9. Step 5 — API Validation

Verify

Endpoints

↓

Permissions

↓

Validation

↓

Response Format

↓

Error Handling

↓

Pagination

↓

Filtering

↓

Documentation

All APIs must comply with API_SPEC.md.

---

# 10. Step 6 — Frontend Development

Implementation order

```

Route

↓

Page

↓

Feature

↓

Components

↓

Hooks

↓

Services

↓

Validation

↓

Tests

```

Frontend should consume APIs only.

Never access the database directly.

---

# 11. Frontend Checklist

☐ Route

☐ Page

☐ Feature Folder

☐ Components

☐ Hooks

☐ API Service

☐ React Query

☐ Forms

☐ Validation

☐ Loading State

☐ Empty State

☐ Error State

☐ Tests

---

# 12. Step 7 — Mobile Development

Only if applicable.

Implementation order

```

Navigation

↓

Screen

↓

Hooks

↓

Services

↓

AI Integration

↓

Upload

↓

Testing

```

---

# 13. Mobile Checklist

☐ Screen

☐ Navigation

☐ Hooks

☐ Services

☐ Camera

☐ TensorFlow Lite

☐ Upload

☐ Error Handling

☐ Tests

---

# 14. Step 8 — AI Integration

Only AI-related features.

Implementation

```

Image Capture

↓

Validation

↓

Preprocessing

↓

Inference

↓

Postprocessing

↓

Display

↓

Upload

```

Always match preprocessing with the trained model.

---

# 15. Step 9 — Testing

Minimum tests

Backend

- Unit Tests
- Service Tests
- API Tests

Frontend

- Component Tests
- Hook Tests

Mobile

- Screen Tests
- Hook Tests

AI

- Inference Tests
- Integration Tests

No feature is complete without testing.

---

# 16. Step 10 — Documentation

Update

PROJECT_CONTEXT.md (if architecture changes)

DATABASE_SCHEMA.md (if schema changes)

API_SPEC.md (if endpoints change)

BUSINESS_RULES.md (if workflows change)

README.md (if setup changes)

Documentation is part of the feature.

---

# 17. Step 11 — Code Review

Verify

- Architecture
- Business Rules
- Security
- Performance
- Naming
- Readability
- Tests
- Documentation

Only after approval may code be merged.

---

# 18. Git Workflow

Feature Branch

↓

Development

↓

Testing

↓

Pull Request

↓

Review

↓

Merge

↓

Delete Branch

Never commit directly to main.

---

# 19. Pull Request Requirements

Every PR includes

- Summary
- Related Issue
- Screenshots (if UI)
- Testing Evidence
- Checklist Completed

---

# 20. Bug Fix Workflow

Identify bug

↓

Reproduce

↓

Write failing test

↓

Fix issue

↓

Run tests

↓

Review

↓

Merge

Every bug fix should prevent regression.

---

# 21. Refactoring Workflow

Refactoring must

- Preserve functionality
- Improve readability
- Maintain tests
- Reduce duplication

Never combine refactoring with unrelated feature work.

---

# 22. Release Workflow

Before release

Run linters

↓

Run tests

↓

Build frontend

↓

Build mobile

↓

Verify AI model

↓

Generate changelog

↓

Tag release

↓

Deploy

---

# 23. AI Coding Assistant Workflow

When implementing a feature:

1. Read PROJECT_CONTEXT.md.
2. Read BUSINESS_RULES.md.
3. Review DATABASE_SCHEMA.md.
4. Review API_SPEC.md.
5. Follow BACKEND_ARCHITECTURE.md.
6. Follow FRONTEND_ARCHITECTURE.md.
7. Follow MOBILE_ARCHITECTURE.md if applicable.
8. Follow CODING_STANDARDS.md.
9. Generate tests.
10. Update documentation if necessary.

Never skip prerequisite documents.

---

# 24. Feature Completion Criteria

A feature is complete only when

✓ Requirements satisfied

✓ Business rules enforced

✓ Database updated

✓ Backend complete

✓ API documented

✓ Frontend complete

✓ Mobile complete (if required)

✓ AI integrated (if required)

✓ Tests passing

✓ Documentation updated

✓ Code reviewed

✓ Ready for deployment

---

# 25. Rules for AI Coding Assistants

When generating features:

- Follow the workflow exactly.
- Never start with UI before backend design.
- Respect project architecture.
- Keep implementations incremental.
- Reuse existing modules.
- Write production-ready code.
- Generate tests alongside features.
- Do not mark a feature complete until all checklist items are satisfied.