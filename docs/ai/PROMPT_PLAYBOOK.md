# PROMPT_PLAYBOOK.md

> Version: 2.0
> Project: XPawSure
> Audience: Developers using AI Coding Assistants
> Compatible With: Codex, ChatGPT, Claude Code, Cursor, GitHub Copilot, Windsurf

---

# Purpose

This document contains standardized prompts for working on XPawSure.

These prompts ensure AI assistants:

- Follow project architecture
- Respect business rules
- Generate production-ready code
- Write tests
- Update documentation
- Follow coding standards

Always reference AGENTS.md before using these prompts.

---

# General Rules

Every prompt should assume:

- Read AGENTS.md first.
- Follow CODING_STANDARDS.md.
- Follow BUSINESS_RULES.md.
- Follow DEVELOPMENT_WORKFLOW.md.
- Follow FEATURE_CHECKLIST.md.
- Follow DEFINITION_OF_DONE.md.

Do not assume requirements that are not explicitly stated.

---

# Prompt 1 — Create a New Feature

```
Read AGENTS.md and all relevant engineering documents.

Implement a new feature called "<FEATURE NAME>".

Requirements:

<REQUIREMENTS>

Follow:

- Service Layer architecture
- Coding Standards
- Business Rules
- Feature Templates

Generate:

1. Database changes
2. Backend
3. API
4. Frontend
5. Mobile (if applicable)
6. Tests
7. Documentation updates

Before writing code, provide an implementation plan.
```

---

# Prompt 2 — Create a New Django Module

```
Create a new Django module named "<MODULE NAME>".

Follow FEATURE_TEMPLATES.md.

Generate:

- models.py
- serializers.py
- services.py
- permissions.py
- views.py
- urls.py
- admin.py
- tests

Use UUID primary keys.

Keep Views thin.

Business logic belongs in Services.
```

---

# Prompt 3 — Implement CRUD

```
Implement complete CRUD for "<ENTITY>".

Include:

- Django Model
- Migration
- Serializer
- Service
- Permissions
- ViewSet
- Routes
- React API
- React Hooks
- Forms
- Validation
- Loading
- Error Handling
- Tests

Follow API_SPEC.md.
```

---

# Prompt 4 — Review Existing Code

```
Review the following code.

Evaluate:

- Architecture
- Coding Standards
- Business Rules
- Security
- Performance
- Maintainability
- Error Handling
- Testing

Do not rewrite immediately.

Explain problems first.

Then propose improvements ranked by priority.
```

---

# Prompt 5 — Refactor a Module

```
Refactor the following module.

Goals:

- Reduce duplication
- Improve readability
- Preserve functionality
- Preserve public APIs

Do not change behavior.

Generate updated tests if needed.
```

---

# Prompt 6 — Debug an Issue

```
Analyze the following issue.

Steps:

1. Identify the root cause.
2. Explain why it happens.
3. Propose multiple solutions.
4. Recommend the best solution.
5. Implement the fix.
6. Generate regression tests.

Do not guess.
```

---

# Prompt 7 — Write Tests

```
Generate comprehensive tests for the following feature.

Include:

- Unit Tests
- Integration Tests
- API Tests
- Edge Cases
- Invalid Input
- Permission Tests
- Regression Tests

Follow TESTING_GUIDELINES.md.
```

---

# Prompt 8 — Build a React Feature

```
Create a React feature named "<FEATURE>".

Generate:

- Feature Folder
- Components
- Hooks
- API Service
- Zod Validation
- React Query
- Types
- Pages
- Tests

Use Feature-Based Architecture.

Business logic belongs in hooks.
```

---

# Prompt 9 — Build a Mobile Feature

```
Create a React Native feature for the Pet Owner mobile application.

Generate:

- Screen
- Hooks
- Services
- Navigation
- API Integration
- Secure Storage
- Tests

If AI is involved:

Use TensorFlow Lite.

Never perform backend inference.
```

---

# Prompt 10 — Implement Owner Registration

```
Implement owner self-registration.

The owner registers through the mobile application.

Requirements:

- User with role=OWNER is created
- OwnerProfile is created with clinic assignment
- JWT tokens are returned on success
- Email uniqueness is enforced

Generate:

- Serializer
- Service
- ViewSet
- Permissions
- URL
- Tests

Update:

- API_SPEC.md (POST /api/auth/register/)
- BUSINESS_RULES.md if needed
```

---

# Prompt 11 — Add a New API Endpoint

```
Implement a new REST endpoint.

Generate:

- Serializer
- Service
- Permission
- ViewSet
- URL
- Tests

Return the standardized API response format.

Update API_SPEC.md.
```

---

# Prompt 12 — Optimize Performance

```
Review this code for performance.

Analyze:

- Database queries
- N+1 queries
- React rendering
- Mobile performance
- Network requests
- Memory usage

Recommend improvements ranked by impact.

Avoid premature optimization.
```

---

# Prompt 13 — Security Review

```
Review this implementation using SECURITY_GUIDELINES.md.

Check:

- Authentication
- Authorization
- Validation
- Secrets
- File Uploads
- SQL Injection
- XSS
- CSRF

Explain every discovered issue.
```

---

# Prompt 14 — Feature Planning

```
Do not write code.

Plan the implementation.

Produce:

- Architecture impact
- Database changes
- Backend tasks
- Frontend tasks
- Mobile tasks
- AI tasks
- Testing tasks
- Documentation updates
- Risks
- Estimated complexity

Only after approval should implementation begin.
```

---

# Prompt 15 — Pull Request Review

```
Review this Pull Request.

Use:

- CODE_REVIEW_CHECKLIST.md
- FEATURE_CHECKLIST.md
- DEFINITION_OF_DONE.md

Return:

Critical Issues

High Priority

Medium Priority

Suggestions

Approve or Reject with justification.
```

---

# Prompt 16 — Generate Documentation

```
Generate documentation for the following feature.

Update only the documents affected.

Possible updates:

- API_SPEC.md
- DATABASE_SCHEMA.md
- BUSINESS_RULES.md
- README.md

Avoid unnecessary documentation changes.
```

---

# Prompt 17 — Before Merging

```
Before considering this feature complete:

Review it against:

- FEATURE_CHECKLIST.md
- CODE_REVIEW_CHECKLIST.md
- DEFINITION_OF_DONE.md

Identify anything missing.

Do not assume completion.

Only approve if every applicable requirement is satisfied.
```

---

# Recommended AI Workflow

For every feature:

1. Plan
2. Review Business Rules
3. Design Database
4. Build Backend
5. Build API
6. Build Frontend
7. Build Mobile
8. Write Tests
9. Update Documentation
10. Self Review
11. Code Review
12. Ready for Merge

Never skip a step.

---

# AI Assistant Rules

Every AI assistant should:

- Think before coding.
- Ask clarifying questions when requirements are incomplete.
- Prefer existing code over creating new abstractions.
- Generate maintainable, production-ready code.
- Include tests with implementation.
- Update documentation when behavior changes.
- Never claim a feature is complete unless it satisfies DEFINITION_OF_DONE.md.  