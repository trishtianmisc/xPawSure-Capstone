# SECURITY_GUIDELINES.md

> Version: 2.0
> Project: XPawSure
> Applies To: Backend, Frontend, Mobile, AI, Database

---

# 1. Purpose

This document defines the official security standards for XPawSure.

All contributors and AI coding assistants must follow these guidelines when designing, implementing, testing, and deploying features.

The objectives are:

- Protect veterinary and patient data
- Prevent unauthorized access
- Preserve data integrity
- Maintain auditability
- Reduce security risks

---

# 2. Security Principles

XPawSure follows these principles:

- Least Privilege
- Defense in Depth
- Secure by Default
- Fail Securely
- Zero Trust
- Principle of Least Knowledge

Every request must be authenticated and authorized.

---

# 3. Authentication

XPawSure uses:

- JWT Access Tokens
- JWT Refresh Tokens

Requirements:

- Short-lived access tokens
- Secure refresh token rotation
- Token expiration enforced
- Logout invalidates refresh tokens

Never store passwords or tokens in plaintext.

---

# 4. Authorization

XPawSure uses Role-Based Access Control (RBAC).

Current roles:

- Super Admin
- Clinic Admin
- Receptionist
- Veterinarian

Permissions are granted to roles, never directly to users.

Every protected endpoint must verify authorization before executing business logic.

Every Owner, Pet, Appointment, Consultation, Prescription, Vaccination, AI Screening, and Report must be scoped to exactly one clinic. Users may access only their own clinic's data; Super Admins alone may access data across clinics.

---

# 5. Password Policy

Passwords must:

- Be hashed using Argon2 (preferred) or bcrypt
- Never be reversible
- Never be logged
- Never be returned by APIs

Minimum recommendations:

- 12+ characters
- Uppercase
- Lowercase
- Number
- Special character

---

# 6. Session Security

Users must:

- Re-authenticate after logout
- Be logged out when refresh tokens expire
- Be denied access with expired tokens

Idle sessions should expire automatically.

---

# 7. API Security

Every API endpoint must:

- Require authentication unless explicitly public
- Validate all input
- Enforce permissions
- Return standardized responses
- Use HTTPS in production

Never trust client-side validation.

---

# 8. Input Validation

Validate:

- Required fields
- Data types
- Length
- Allowed values
- File types
- File sizes

Validation occurs at:

1. Frontend
2. Serializer
3. Service Layer
4. Database

---

# 9. File Upload Security

Allowed uploads:

- Images
- Documents (if supported)

Validate:

- MIME type
- File extension
- File size
- Corrupted files

Reject executable files.

Store uploads in Supabase Storage, outside the application source code.

---

# 10. AI Model Security

The TensorFlow Lite model must:

- Be read-only
- Be versioned
- Be integrity checked before loading

Users must not modify:

- Labels
- Model weights
- Metadata

Inference occurs only on the mobile device.

---

# 11. Database Security

Use:

- Parameterized ORM queries
- Foreign key constraints
- Transactions
- Least-privileged database accounts

Never concatenate SQL strings.

Avoid raw SQL unless absolutely necessary.

---

# 12. Secrets Management

Never commit:

- API keys
- JWT secrets
- Database passwords
- SMTP credentials
- Cloud credentials

Use environment variables or a secure secret manager.

`.env` files must never be committed to version control.

---

# 13. Logging Security

Log:

- Login attempts
- Permission denials
- Unexpected exceptions
- File upload failures
- AI inference failures

Never log:

- Passwords
- JWT tokens
- Personal secrets
- Sensitive medical notes unless required for auditing

---

# 14. Audit Logging

Record:

- User ID
- Action performed
- Timestamp
- Resource affected

Examples:

- User login
- Appointment creation
- Consultation update
- Prescription creation
- AI screening upload

Audit logs must be immutable.

---

# 15. Data Privacy

Medical records are confidential.

Only authorized personnel may access:

- Pet medical history
- Consultation notes
- Prescriptions
- AI screening results

Data should only be collected when necessary.

---

# 16. OWASP Best Practices

Mitigate:

- Broken Access Control
- Cryptographic Failures
- Injection
- Insecure Design
- Security Misconfiguration
- Vulnerable Components
- Authentication Failures
- Software Integrity Failures
- Logging Failures
- SSRF (if applicable)

Review OWASP Top 10 periodically.

---

# 17. HTTPS

Production deployments must:

- Use HTTPS only
- Redirect HTTP to HTTPS
- Use valid TLS certificates

Never transmit authentication tokens over plain HTTP.

---

# 18. Rate Limiting

Apply rate limits to:

- Login
- Password reset
- AI upload endpoints
- File uploads
- Public APIs

Return HTTP 429 when limits are exceeded.

---

# 19. Dependency Security

Regularly:

- Update dependencies
- Review security advisories
- Remove unused packages
- Pin package versions

Run dependency vulnerability scans in CI.

---

# 20. Secure Coding

Developers should:

- Avoid duplicated security logic
- Use framework security features
- Prefer safe defaults
- Handle errors securely

Never disable security checks for convenience.

---

# 21. Mobile Security

Store sensitive information using secure storage.

Do not store:

- JWT tokens in AsyncStorage
- Passwords
- Secrets

Require runtime permissions for:

- Camera
- File access

Validate permissions before use.

Owners must be authenticated before accessing any API endpoint.

Owner session tokens must be revoked on logout.

Owner data isolation must be enforced at the API level:

- Owners may only access their own OwnerProfile
- Owners may only access their own pets
- Owners may only view medical records (read-only)
- Owners may not create consultations, prescriptions, or vaccinations

The mobile application must not cache JWT tokens in insecure storage.

---

# 22. AI Security

The AI module:

- Assists pet owners and veterinarians
- Must never make autonomous decisions
- Must not alter consultation records
- Must not overwrite diagnoses

All predictions must be reviewed by a veterinarian.

---

# 23. Incident Response

If a security issue is discovered:

1. Isolate affected systems.
2. Assess impact.
3. Notify maintainers.
4. Apply fixes.
5. Test the fix.
6. Document the incident.

Avoid silent fixes for serious vulnerabilities.

---

# 24. Security Testing

Every release should include:

- Authentication tests
- Authorization tests
- Input validation tests
- File upload tests
- Dependency scans
- Static analysis
- Penetration testing (when feasible)

Security testing is part of the release process.

---

# 25. Rules for AI Coding Assistants

When generating code:

- Enforce authentication and authorization.
- Validate all input.
- Never expose secrets.
- Never bypass permission checks.
- Use secure defaults.
- Follow OWASP recommendations.
- Keep sensitive data protected.
- Generate secure, production-ready implementations.
