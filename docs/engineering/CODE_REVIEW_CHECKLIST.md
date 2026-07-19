# CODE_REVIEW_CHECKLIST.md

> Version: 2.0
> Project: XPawSure
> Applies To: Backend, Frontend, Mobile, AI

---

# 1. Purpose

This document defines the official code review process for XPawSure.

Every pull request, feature, bug fix, and refactor must satisfy this checklist before merging.

This document is intended for both human reviewers and AI coding assistants.

The objective is to maintain:

- Code quality
- Consistency
- Security
- Maintainability
- Reliability

---

# 2. General Review Principles

Every reviewer should verify:

- Correctness
- Readability
- Simplicity
- Maintainability
- Security
- Performance
- Testability

Code should solve the problem without introducing unnecessary complexity.

---

# 3. Requirements Review

Verify:

☐ Requirements were fully implemented

☐ No requested functionality missing

☐ No unnecessary features added

☐ Business rules followed

☐ Acceptance criteria satisfied

---

# 4. Architecture Review

Confirm the implementation follows project architecture.

Backend

☐ Uses Service Layer

☐ Thin Views

☐ Thin Serializers

☐ Models only represent data

Frontend

☐ Feature-based structure

☐ Business logic inside hooks

☐ Components remain presentational

Mobile

☐ Screen remains thin

☐ TensorFlow Lite isolated in services

---

# 5. Coding Standards Review

Verify:

☐ Naming conventions followed

☐ Files organized correctly

☐ Functions remain small

☐ No duplicated logic

☐ SOLID principles respected

☐ DRY principle respected

☐ KISS principle respected

---

# 6. Business Rules Review

Confirm:

☐ Appointment workflow valid

☐ Consultation workflow valid

☐ Prescription workflow valid

☐ AI screening workflow valid

☐ Medical history preserved

☐ No business rules violated

---

# 7. Database Review

Verify:

☐ UUID used

☐ Relationships correct

☐ Constraints implemented

☐ Indexes added where needed

☐ Migrations included

☐ No unnecessary queries

☐ No N+1 queries

---

# 8. Backend Review

Verify:

☐ Models correct

☐ Serializers validate only

☐ Services contain business logic

☐ Permissions implemented

☐ ViewSets remain thin

☐ API responses standardized

☐ Exceptions handled

☐ Logging implemented

---

# 9. API Review

Verify:

☐ RESTful endpoints

☐ Authentication required

☐ Authorization enforced

☐ Validation complete

☐ Correct status codes

☐ Pagination supported

☐ Filtering supported

☐ Search supported

☐ Response schema consistent

---

# 10. Frontend Review

Verify:

☐ Components reusable

☐ Hooks reusable

☐ React Query used correctly

☐ Forms validated

☐ Loading state exists

☐ Empty state exists

☐ Error state exists

☐ Accessibility considered

☐ Responsive layout maintained

---

# 11. Mobile Review

Verify:

☐ Navigation correct

☐ Camera integration stable

☐ Offline behavior considered

☐ Secure storage used

☐ Upload workflow verified

☐ AI integration isolated

☐ Owner self-registration flow secure

☐ Owner data isolation enforced

☐ Read-only medical record access verified

---

# 12. AI Review

Verify:

☐ TensorFlow Lite loads correctly

☐ Preprocessing matches training

☐ Confidence calculated correctly

☐ Model version stored

☐ Backend does not perform inference

☐ Veterinarian remains decision-maker

---

# 13. Security Review

Verify:

☐ Authentication enforced

☐ Authorization enforced

☐ Input validation completed

☐ File uploads validated

☐ Secrets protected

☐ No sensitive logging

☐ OWASP risks addressed

---

# 14. Performance Review

Verify:

☐ Queries optimized

☐ Caching used where appropriate

☐ No unnecessary renders

☐ Lazy loading implemented where beneficial

☐ API efficient

☐ Mobile performance acceptable

☐ AI inference acceptable

---

# 15. Error Handling Review

Verify:

☐ Validation errors handled

☐ Network errors handled

☐ API errors handled

☐ User-friendly messages

☐ Internal exceptions hidden

☐ Logs generated appropriately

---

# 16. Testing Review

Verify:

☐ Unit tests added

☐ Integration tests added

☐ API tests updated

☐ Frontend tests updated

☐ Mobile tests updated

☐ AI tests updated

☐ Regression tests included for bug fixes

☐ Existing tests still pass

---

# 17. Documentation Review

Verify:

☐ API documentation updated

☐ Database documentation updated

☐ Business rules updated

☐ README updated (if needed)

☐ Comments added for complex logic

---

# 18. Git Review

Verify:

☐ Branch naming follows convention

☐ Conventional commits used

☐ Pull request description complete

☐ Clean commit history

☐ No debug code committed

☐ No commented-out code left behind

---

# 19. User Experience Review

Verify:

☐ Clear feedback for actions

☐ Consistent UI

☐ Helpful validation messages

☐ Accessible controls

☐ No dead-end workflows

☐ Smooth navigation

---

# 20. Deployment Review

Verify:

☐ Builds successfully

☐ Environment variables documented

☐ Migrations included

☐ Static assets generated

☐ Mobile builds successfully

☐ AI model packaged correctly

---

# 21. Common Issues to Reject

Reject code if it contains:

- Business logic inside Views
- Business logic inside React components
- Hardcoded secrets
- Hardcoded URLs
- Duplicate code
- Missing tests
- Missing permissions
- Unused imports
- Dead code
- Console debugging statements
- TODO comments without issue references
- Disabled lint rules without justification

---

# 22. Self-Review Questions

Before approving, ask:

- Is this the simplest correct solution?
- Can existing code be reused?
- Will another developer understand this in six months?
- Does this follow project architecture?
- Is there a security risk?
- Is there a performance issue?
- Have all business rules been enforced?
- Are tests sufficient?
- Would I confidently deploy this to production?

---

# 23. Rules for AI Coding Assistants

Before marking any task as complete:

1. Review generated code against this checklist.
2. Fix any failed checklist items before responding.
3. Clearly identify remaining issues if the feature is incomplete.
4. Never claim production readiness if required checklist items are missing.
5. Prefer maintainability and correctness over clever implementations.
6. Reject your own implementation if it violates XPawSure standards.