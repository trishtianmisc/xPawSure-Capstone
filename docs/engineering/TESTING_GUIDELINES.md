# TESTING_GUIDELINES.md

> Version: 2.0
> Project: XPawSure
> Applies To: Backend, Frontend, Mobile, AI

---

# 1. Purpose

This document defines the official testing strategy for XPawSure.

Every feature, bug fix, refactor, and enhancement must include appropriate tests.

Testing ensures:

- Reliability
- Correctness
- Maintainability
- Security
- Regression prevention

Testing is mandatory for production-ready code.

---

# 2. Testing Philosophy

XPawSure follows the Testing Pyramid.

```

            E2E Tests
          -------------
        Integration Tests
      ---------------------
         Unit Tests

```

Most tests should be unit tests.

Integration tests verify modules working together.

End-to-end tests verify complete user workflows.

---

# 3. Testing Principles

Every test should be:

- Independent
- Repeatable
- Fast
- Readable
- Deterministic

Tests must never depend on execution order.

---

# 4. Backend Testing

Framework

```
pytest
pytest-django
factory_boy
```

Backend testing includes:

- Models
- Services
- Serializers
- Permissions
- API endpoints
- Signals
- Tasks
- Authentication

---

# 5. Backend Folder Structure

```
tests/

test_models.py

test_services.py

test_serializers.py

test_permissions.py

test_views.py

test_api.py
```

Tests mirror the production module.

---

# 6. Model Testing

Verify:

☐ Required fields

☐ Relationships

☐ Constraints

☐ Helper methods

☐ Default values

☐ Soft delete behavior

---

# 7. Service Testing

Every business rule belongs here.

Test:

☐ Appointment creation

☐ Consultation workflow

☐ AI upload

☐ Prescription creation

☐ Validation

☐ Transactions

☐ Exceptions

Services should have the highest test coverage.

---

# 8. Serializer Testing

Verify:

☐ Required fields

☐ Validation rules

☐ Field serialization

☐ Deserialization

☐ Invalid input

---

# 9. Permission Testing

Verify every role.

Super Admin

Clinic Admin

Receptionist

Veterinarian

Future Pet Owner

Test both:

Allowed actions

Denied actions

Test clinic data isolation for Owners, Pets, Appointments, Consultations, Prescriptions, Vaccinations, AI Screenings, and Reports. Verify that only Super Admins can access records across clinics.

---

# 10. API Testing

Test every endpoint.

Verify:

☐ Status codes

☐ Authentication

☐ Authorization

☐ Request validation

☐ Response schema

☐ Pagination

☐ Filtering

☐ Sorting

☐ Search

☐ Error responses

---

# 11. Database Testing

Verify:

- Foreign keys
- Cascade rules
- Transactions
- Unique constraints
- Indexes
- Rollbacks

---

# 12. Frontend Testing

Framework

```
Vitest

React Testing Library

MSW
```

Test:

- Components
- Hooks
- Forms
- API integration
- Routing
- State management

---

# 13. Component Testing

Every reusable component should verify:

☐ Rendering

☐ Props

☐ Events

☐ Accessibility

☐ Error state

☐ Loading state

---

# 14. Hook Testing

Verify:

- API calls
- Loading
- Errors
- Success state
- Cache updates

---

# 15. Form Testing

Verify:

☐ Validation

☐ Error messages

☐ Submission

☐ Reset

☐ Disabled state

---

# 16. Mobile Testing

Framework

```
Jest

React Native Testing Library
```

Test:

- Screens
- Hooks
- Navigation
- Camera
- Upload
- Offline mode
- Owner self-registration flow
- Pet registration by owner
- Appointment booking by owner
- Read-only access to medical records
- Data isolation (owner sees only own pets)
- AI screening upload from device

---

# 17. AI Testing

The AI module requires additional testing.

Verify:

☐ Model loads successfully

☐ Model version matches expected version

☐ Image preprocessing

☐ TensorFlow Lite inference

☐ Output format

☐ Confidence calculation

☐ Prediction mapping

☐ Failure handling

Never modify the production model during testing.

---

# 18. Image Testing

Use:

- Valid images
- Blurry images
- Corrupted files
- Unsupported formats
- Extremely large images

Verify graceful failure.

---

# 19. Integration Testing

Verify complete workflows.

Examples:

Owner

↓

Pet Registration

↓

Appointment

↓

Consultation

↓

AI Screening

↓

Prescription

↓

Medical Record

Each workflow should behave correctly from start to finish.

---

# 20. End-to-End Testing

Recommended tool:

```
Playwright
```

Critical E2E scenarios:

☐ User login

☐ Create owner

☐ Register pet

☐ Schedule appointment

☐ Start consultation

☐ AI screening upload

☐ Create prescription

☐ Logout

---

# 21. Performance Testing

Measure:

- API response time
- Database queries
- Mobile startup
- AI inference time
- Upload speed

Performance regressions should be investigated.

---

# 22. Security Testing

Verify:

☐ JWT authentication

☐ Unauthorized access denied

☐ Role permissions

☐ File upload validation

☐ SQL injection protection

☐ XSS protection

☐ CSRF protection

---

# 23. Test Data

Use:

- Factory Boy
- Fixtures
- Generated data

Avoid hardcoded IDs.

Never use production data.

---

# 24. Code Coverage

Minimum recommended coverage:

Backend

90%

Services

95%

Frontend

80%

Mobile

80%

AI utilities

95%

Coverage is a guide, not a substitute for meaningful tests.

---

# 25. Continuous Integration

Every pull request should automatically:

1. Install dependencies
2. Run linters
3. Run backend tests
4. Run frontend tests
5. Run mobile tests
6. Check formatting
7. Generate coverage reports
8. Fail if required checks do not pass

No code should be merged if required CI checks fail.

---

# 26. Regression Testing

Whenever a bug is fixed:

1. Write a failing test that reproduces the bug.
2. Implement the fix.
3. Verify the new test passes.
4. Confirm existing tests still pass.

This prevents the same issue from recurring.

---

# 27. Rules for AI Coding Assistants

When implementing a feature:

- Generate tests together with production code.
- Test business rules before UI behavior.
- Prefer unit tests over end-to-end tests when appropriate.
- Never leave new business logic untested.
- Update existing tests if behavior changes.
- Ensure all tests pass before considering the feature complete.
- If a bug is fixed, include a regression test.
