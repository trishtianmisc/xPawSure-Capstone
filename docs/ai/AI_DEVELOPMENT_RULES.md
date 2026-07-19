# AI_DEVELOPMENT_RULES.md

> Version: 2.0
> Project: XPawSure
> Applies To: All AI Coding Assistants (Codex, GitHub Copilot, Claude Code, Cursor, Windsurf, ChatGPT)

---

# 1. Purpose

This document defines how AI coding assistants should contribute to XPawSure.

It does not describe the project architecture.

It describes the expected engineering behavior when planning, implementing, reviewing, and improving code.

Every AI assistant should read this document before generating code.

---

# 2. Primary Goal

Generate production-ready software that is:

- Correct
- Maintainable
- Secure
- Tested
- Documented
- Consistent

Never optimize for writing the shortest code.

Always optimize for long-term maintainability.

---

# 3. Think Before Coding

Before writing code, always determine:

- What feature is being requested?
- Which modules are affected?
- Which business rules apply?
- Which existing code can be reused?
- What are the edge cases?
- What tests will be required?

Do not immediately generate code.

Create an implementation plan first.

---

# 4. Never Guess

If information is missing:

Ask.

Examples:

- Should this endpoint require authentication?
- Should deleted records be soft deleted?
- Should this field be optional?

Never invent business requirements.

---

# 5. Follow Existing Architecture

Never introduce a new architectural pattern if an existing one already exists.

Use:

- Service Layer
- Feature-Based Frontend
- Thin Views
- Thin Components
- Repository Structure
- API Standards

Follow existing conventions before creating new ones.

---

# 6. Reuse Before Creating

Before generating code:

Search for:

- Existing service
- Existing component
- Existing hook
- Existing utility
- Existing validator
- Existing schema

Reuse existing implementations whenever practical.

Avoid duplicate code.

---

# 7. Implementation Order

Always implement features in this sequence:

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

Mobile

↓

Testing

↓

Documentation

Never start with UI before backend design.

---

# 8. Respect Business Rules

Technical correctness is not enough.

Always validate implementations against:

BUSINESS_RULES.md

Example:

A technically correct endpoint that allows deleting medical history is still incorrect.

Business rules override implementation convenience.

---

# 9. Write Incremental Code

Prefer small, reviewable changes.

Large implementations should be divided into logical milestones.

Example:

Step 1

Database

Step 2

Backend

Step 3

API

Step 4

Frontend

Step 5

Testing

Avoid extremely large pull requests.

---

# 10. Generate Complete Features

A feature is incomplete if it only includes:

- Models
- Views
- Components

A complete feature includes:

Backend

API

Frontend

Mobile (if applicable)

Tests

Documentation

Permissions

Validation

Error Handling

---

# 11. Do Not Skip Testing

Every business rule requires tests.

Generate:

- Unit Tests
- API Tests
- Component Tests
- Regression Tests (for bug fixes)

Never treat testing as optional.

---

# 12. Update Documentation

Whenever behavior changes, determine whether documentation should also change.

Possible updates:

- API_SPEC.md
- DATABASE_SCHEMA.md
- BUSINESS_RULES.md
- README.md

Documentation is part of the implementation.

---

# 13. Prefer Explicit Code

Prefer:

```python
if appointment.status == AppointmentStatus.COMPLETED:
```

Over:

```python
if appointment.status == 3:
```

Readable code is preferred over clever code.

---

# 14. Explain Trade-offs

If multiple implementations are possible:

Present the options.

Example:

Option A

Simpler implementation

Option B

Higher performance

Recommend one with justification.

Do not silently choose if the trade-off materially affects the project.

---

# 15. Avoid Premature Optimization

Do not introduce:

- Complex caching
- Micro-optimizations
- Distributed systems
- Generic abstractions

Unless required.

Solve today's problem while keeping tomorrow in mind.

---

# 16. Handle Errors Gracefully

Every implementation should include:

- Validation
- Exception handling
- Logging
- User-friendly messages

Never leave unexpected failures unhandled.

---

# 17. Security by Default

Every feature should consider:

- Authentication
- Authorization
- Input validation
- Sensitive data
- File uploads
- OWASP guidance

Never assume a route is safe because the frontend hides it.

---

# 18. Performance Awareness

Before writing code, consider:

- Database queries
- N+1 problems
- Component re-renders
- Network requests
- Mobile memory usage
- AI inference performance

Optimize where appropriate without sacrificing readability.

---

# 19. Respect Module Boundaries

Backend modules should not tightly couple unrelated domains.

Example:

Appointments should not directly manage prescriptions.

Instead:

Appointment Service

↓

Consultation Service

↓

Prescription Service

Maintain separation of concerns.

---

# 20. AI Module Rules

Never:

- Retrain models inside the app
- Perform inference on the backend
- Modify TensorFlow Lite models

Always:

- Validate images
- Preprocess correctly
- Run on-device inference
- Store model version
- Upload prediction results

The AI assists veterinarians only.

---

# 21. Git Practices

Generate changes suitable for:

- Small commits
- Focused pull requests
- Easy review

Avoid combining unrelated changes.

---

# 22. Self-Review Before Responding

Before returning code, verify:

☐ Coding standards followed

☐ Business rules respected

☐ Architecture respected

☐ Tests included

☐ Documentation updated

☐ Security considered

☐ Error handling implemented

☐ No duplicated logic

☐ Maintainable design

---

# 23. When Reviewing Existing Code

Do not immediately rewrite code.

First determine:

- Is it correct?
- Is it secure?
- Is it maintainable?
- Does it follow project standards?

Recommend improvements only when they provide measurable value.

---

# 24. Communication Style

When assisting developers:

- Explain reasoning clearly.
- State assumptions explicitly.
- Mention trade-offs.
- Ask clarifying questions when needed.
- Avoid unnecessary jargon.
- Keep explanations concise but complete.

---

# 25. Large Feature Strategy

For large features:

Phase 1

Database

Phase 2

Backend

Phase 3

API

Phase 4

Frontend

Phase 5

Mobile

Phase 6

Testing

Phase 7

Documentation

Avoid implementing everything in a single step.

---

# 26. Completion Checklist

Before considering work complete, confirm:

✓ Requirements implemented

✓ Business rules enforced

✓ Architecture respected

✓ Security reviewed

✓ Error handling implemented

✓ Tests passing

✓ Documentation updated

✓ Ready for code review

If any item is incomplete, explicitly state what remains.

---

# 27. Rules for AI Coding Assistants

Always:

- Plan before coding.
- Reuse existing code.
- Ask instead of guessing.
- Respect project architecture.
- Respect business rules.
- Generate tests with production code.
- Update documentation.
- Review your own output before responding.

Never:

- Invent requirements.
- Bypass the service layer.
- Skip validation.
- Skip permissions.
- Skip testing.
- Skip documentation.
- Claim a feature is complete if it does not satisfy DEFINITION_OF_DONE.md.