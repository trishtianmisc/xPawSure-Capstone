# ERROR_HANDLING.md

> Version: 2.0
> Project: XPawSure
> Applies To: Backend, Frontend, Mobile, AI

---

# 1. Purpose

This document defines the official error handling standards for XPawSure.

All errors must be:

- Consistent
- Predictable
- Secure
- User-friendly
- Easy to debug
- Properly logged

These standards apply to all contributors and AI coding assistants.

---

# 2. General Principles

Every error should:

- Clearly identify what went wrong
- Avoid exposing internal implementation details
- Be logged when appropriate
- Provide actionable information to the user
- Use standardized response formats

Never expose stack traces or sensitive system information to end users.

---

# 3. Error Categories

XPawSure classifies errors into the following categories:

### Validation Errors (400)

Example:

- Missing required field
- Invalid email
- Invalid appointment date

---

### Authentication Errors (401)

Example:

- Invalid credentials
- Expired JWT
- Missing access token

---

### Authorization Errors (403)

Example:

- Receptionist attempting to create a prescription
- Unauthorized access to medical records

---

### Not Found Errors (404)

Example:

- Pet not found
- Appointment not found
- Consultation not found

---

### Conflict Errors (409)

Example:

- Duplicate owner
- Duplicate appointment
- Existing active record

---

### Business Rule Errors (422)

Example:

- Consultation without appointment
- Prescription without consultation
- AI result submitted without consultation

---

### Server Errors (500)

Unexpected failures.

Should always be logged.

Never expose implementation details.

---

# 4. Standard API Response

Every API response follows this format.

## Success

```json
{
    "success": true,
    "message": "Pet created successfully.",
    "data": {}
}
```

---

## Failure

```json
{
    "success": false,
    "message": "Validation failed.",
    "errors": {
        "name": [
            "This field is required."
        ]
    }
}
```

Never invent different response structures.

---

# 5. Backend Exception Handling

Every exception should be:

- Specific
- Logged when necessary
- Converted into an API response

Avoid:

```python
except:
    pass
```

Preferred:

```python
except ValidationError as exc:
    raise APIValidationException(exc)
```

---

# 6. Custom Exceptions

Create custom exceptions for business rules.

Examples:

```
AppointmentConflictException

DuplicateOwnerException

ConsultationRequiredException

InvalidModelVersionException

AIInferenceException
```

Never overload generic exceptions for business logic.

---

# 7. Logging Rules

Log:

- Authentication failures
- Authorization failures
- Database errors
- AI inference failures
- File upload failures
- Unexpected exceptions

Do NOT log:

- Passwords
- JWT tokens
- API secrets
- Personal credentials

---

# 8. Frontend Error Handling

React applications should display:

- User-friendly messages
- Retry actions when possible
- Loading recovery
- Offline notifications

Never display raw backend exceptions.

---

# 9. Mobile Error Handling

React Native applications should gracefully handle:

- Camera permission denied
- Offline mode
- Upload failures
- TensorFlow Lite loading failures
- Corrupted AI model
- Invalid images

Users should always have a recovery path.

---

# 10. AI Error Handling

Possible AI errors:

- Model missing
- Model corrupted
- Invalid image
- Unsupported image format
- Inference timeout
- Prediction failure

Fallback behavior:

- Notify the user
- Log the error
- Allow manual consultation without AI

AI failure must never block clinical workflows.

---

# 11. Database Errors

Handle gracefully:

- Foreign key violations
- Unique constraint violations
- Transaction failures
- Connection failures

Never expose SQL errors directly.

---

# 12. File Upload Errors

Validate before upload:

- File type
- File size
- Corrupted files
- Unsupported format

Return meaningful validation messages.

---

# 13. Network Errors

Frontend and Mobile should handle:

- Request timeout
- Lost internet connection
- Slow network
- Server unavailable

Users should receive clear guidance and retry options.

---

# 14. Validation Errors

Validation should occur at multiple layers:

1. Frontend
2. API Serializer
3. Service Layer (business rules)
4. Database constraints

Never rely on frontend validation alone.

---

# 15. Error Messages

Good examples:

- "Appointment time is already booked."
- "This pet already exists for the selected owner."

Owner-specific mobile error scenarios:

- Registration failure: display field-level validation errors
- Login failure: "Invalid email or password"
- Pet limit reached (if applicable)
- Appointment booking conflict: "The selected time slot is no longer available"
- Screening upload failure: "Failed to upload screening result. Please try again."
- Network error during AI inference: "Unable to complete screening. Please check your connection."
- Image quality too low: "The captured image is not clear enough. Please try again with better lighting."
- "AI model could not process the uploaded image."

Avoid vague messages like:

- "Something went wrong."
- "Unknown error."

---

# 16. Retry Strategy

Safe to retry:

- Network requests
- Temporary server failures
- File uploads
- AI inference (if interrupted)

Do NOT automatically retry:

- Validation errors
- Permission errors
- Authentication failures

---

# 17. Monitoring

Track:

- Error frequency
- Failed logins
- API failures
- AI inference failures
- Upload failures
- Database exceptions

Monitoring data helps improve system reliability.

---

# 18. Rules for AI Coding Assistants

When implementing error handling:

- Use the standard API response format.
- Prefer custom exceptions for business rules.
- Never expose internal stack traces.
- Log unexpected errors.
- Display user-friendly messages.
- Handle failures gracefully without crashing the application.
- Ensure AI failures do not prevent veterinarians from completing consultations.