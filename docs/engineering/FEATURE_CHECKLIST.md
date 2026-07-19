# FEATURE_CHECKLIST.md

> Version: 2.0
> Project: XPawSure
> Applies To: Every New Feature, Enhancement, and Major Bug Fix

---

# 1. Purpose

This checklist defines the minimum implementation requirements for every feature in XPawSure.

No feature is considered complete until every applicable item has been reviewed.

AI coding assistants must use this checklist before marking any task as completed.

---

# 2. Requirements

☐ Requirements understood

☐ Business rules identified

☐ Existing functionality reviewed

☐ Similar modules checked for reuse

☐ Edge cases considered

☐ Acceptance criteria defined

---

# 3. Database

If database changes are required:

☐ Model created

☐ UUID used

☐ Relationships defined

☐ Foreign keys validated

☐ Indexes added where appropriate

☐ Constraints implemented

☐ Audit fields included

☐ Migration created

☐ Migration tested

☐ DATABASE_SCHEMA.md updated

---

# 4. Backend

☐ Django app structure followed

☐ Model implemented

☐ Serializer created

☐ Service implemented

☐ Permissions implemented

☐ ViewSet created

☐ Routes registered

☐ Validation completed

☐ Transactions used where needed

☐ Logging added

☐ Exceptions handled

☐ Response format follows API specification

☐ No business logic inside Views

☐ No business logic inside Serializers

☐ Services remain focused on one responsibility

---

# 5. API

☐ Endpoint created

☐ Authentication enforced

☐ Authorization enforced

☐ Request validation completed

☐ Response schema documented

☐ Status codes correct

☐ Pagination implemented (if required)

☐ Filtering implemented (if required)

☐ Sorting implemented (if required)

☐ Search implemented (if required)

☐ API_SPEC.md updated

---

# 6. Frontend

☐ Route created

☐ Page created

☐ Feature folder created

☐ Components reusable

☐ React Query integrated

☐ API service created

☐ Form validation completed

☐ Loading state implemented

☐ Empty state implemented

☐ Error state implemented

☐ Success notifications implemented

☐ Accessibility reviewed

☐ Responsive layout verified

---

# 7. Mobile

If applicable:

☐ Screen created

☐ Navigation registered

☐ Hooks implemented

☐ API integration completed

☐ Camera integration completed

☐ Offline handling considered

☐ Secure storage used where appropriate

☐ TensorFlow Lite integration completed

☐ Upload workflow tested

☐ Owner self-registration flow tested

☐ Owner data isolation verified (only own data visible)

☐ Read-only medical record access enforced

---

# 8. AI Module

If applicable:

☐ Image validation

☐ Image preprocessing

☐ TensorFlow Lite inference

☐ Confidence calculation

☐ Model version recorded

☐ Prediction uploaded

☐ AI limitations respected

☐ No backend inference introduced

---

# 9. Security

☐ Authentication verified

☐ Authorization verified

☐ Input validation completed

☐ File uploads validated

☐ Sensitive data protected

☐ Secrets not exposed

☐ SQL injection prevented

☐ XSS considered

☐ CSRF considered

☐ OWASP practices followed

---

# 10. Error Handling

☐ Validation errors handled

☐ API errors handled

☐ Network failures handled

☐ Unexpected exceptions logged

☐ User-friendly error messages shown

☐ Internal errors not exposed

---

# 11. Performance

☐ Queries optimized

☐ select_related() used where needed

☐ prefetch_related() used where needed

☐ N+1 queries avoided

☐ Unnecessary renders prevented

☐ Expensive computations memoized

☐ Large assets optimized

---

# 12. Testing

Backend

☐ Unit tests

☐ Service tests

☐ API tests

Frontend

☐ Component tests

☐ Hook tests

Mobile

☐ Screen tests

☐ Integration tests

AI

☐ Inference tests

☐ Prediction validation

General

☐ Existing tests still pass

☐ No regressions introduced

---

# 13. Documentation

☐ README updated (if needed)

☐ API documentation updated

☐ Database documentation updated

☐ Business rules updated

☐ Architecture updated (if required)

☐ Code comments added where necessary

---

# 14. Code Quality

☐ Linting passes

☐ Formatting passes

☐ No unused imports

☐ No dead code

☐ No duplicated logic

☐ Naming follows standards

☐ Functions remain small

☐ Files remain manageable

☐ Type safety maintained

---

# 15. Git

☐ Feature branch used

☐ Conventional commit messages used

☐ Clean commit history

☐ Pull request created

☐ Reviewer assigned

---

# 16. Deployment Readiness

☐ Environment variables documented

☐ Database migrations included

☐ Builds successfully

☐ Frontend compiles

☐ Mobile builds successfully

☐ AI model verified

☐ Release notes updated (if required)

---

# 17. Definition of Complete

A feature is complete only when:

✓ Functional requirements met

✓ Business rules enforced

✓ Backend complete

✓ API complete

✓ Frontend complete

✓ Mobile complete (if applicable)

✓ AI complete (if applicable)

✓ Tests passing

✓ Documentation updated

✓ Security reviewed

✓ Performance reviewed

✓ Code reviewed

✓ Ready for deployment

---

# 18. Rules for AI Coding Assistants

Before marking a feature as complete:

- Execute every applicable checklist item.
- Do not skip testing.
- Do not skip documentation.
- Do not assume permissions exist.
- Reuse existing modules before creating new ones.
- Reject implementations that violate business rules or coding standards.
- If any checklist item is incomplete, clearly state what remains to be done.