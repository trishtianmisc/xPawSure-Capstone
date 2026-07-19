# SUPABASE_ARCHITECTURE.md

> Version: 2.0
> Project: XPawSure
> Last Updated: July 2026

---

# 1. Purpose

This document defines how Supabase supports the XPawSure architecture.

Supabase provides the managed PostgreSQL database and object storage services used by the Django backend.

Django remains the primary backend, REST API, authentication, authorization, and business-logic layer.

Supabase does not replace Django.

---

# 2. Why Supabase

Supabase is used to provide:

- Managed PostgreSQL hosting
- Managed object storage
- Database backup and recovery capabilities
- A single managed platform for persistent application data and uploaded media

The project uses only Supabase PostgreSQL and Supabase Storage unless a future architectural decision explicitly expands this scope.

---

# 3. Django ↔ Supabase Architecture

```
React Web / React Native
            ↓
Django REST Framework API
            ↓
     Django Service Layer
            ↓
Supabase PostgreSQL / Supabase Storage
```

All web and mobile clients communicate with Django REST Framework.

Django connects to Supabase PostgreSQL using the PostgreSQL connection string.

Django validates upload requests, applies authorization and business rules, and stores approved files in Supabase Storage.

Clients must not bypass Django for application data or file-upload workflows.

TensorFlow Lite inference remains entirely on the mobile application. Django stores screening results and image references only.

---

# 4. Supabase PostgreSQL

Supabase PostgreSQL is the system database for:

- Users
- Owners
- Pets
- Appointments
- Consultations
- Medical records
- Prescriptions
- Vaccinations
- AI screenings
- Notifications
- Audit logs

Django models, migrations, foreign key constraints, transactions, and business rules remain the source of truth for database access.

Use the PostgreSQL connection string provided by Supabase in Django database configuration.

---

# 5. Supabase Storage

Supabase Storage stores uploaded files and media outside the Django application source code.

Django is responsible for validating file type, file size, ownership, and permissions before storing files.

The database stores the object path or URL reference associated with each uploaded file. It does not store the file binary in relational records.

---

# 6. Environment Variables

Store Supabase configuration in environment variables. Never commit secrets to version control.

Required variables:

```env
DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<database>
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<server-only-storage-key>
SUPABASE_STORAGE_BUCKET_PET_IMAGES=pet-images
SUPABASE_STORAGE_BUCKET_SCREENING_IMAGES=screening-images
SUPABASE_STORAGE_BUCKET_MEDICAL_ATTACHMENTS=medical-attachments
```

`DATABASE_URL` is the Supabase PostgreSQL connection string used by Django.

`SUPABASE_SERVICE_ROLE_KEY` is server-only and must never be exposed to the web or mobile applications.

---

# 7. Storage Buckets

Use separate buckets for each file category:

- `pet-images` for pet profile photos
- `screening-images` for captured skin lesion images
- `medical-attachments` for approved medical documents and attachments

Use UUID-based object paths and retain the original filename only as metadata when required.

Example:

```
screening-images/<consultation-id>/<screening-id>/<file-id>.jpg
```

---

# 8. Security Considerations

Security requirements:

- Keep Supabase credentials in environment variables or a secure secret manager.
- Use least-privileged database accounts.
- Use HTTPS for all production traffic.
- Validate file type, MIME type, size, and ownership before upload.
- Generate unique object paths and never trust client-provided paths.
- Restrict bucket access to authorized server-side workflows.
- Do not expose database passwords, service-role keys, or internal storage paths in API responses or logs.
- Preserve existing Django authentication, authorization, validation, and audit logging rules.

Supabase Auth and Supabase Edge Functions are not part of this architecture.

---

# 9. Backups

Enable and monitor Supabase PostgreSQL backups according to the selected Supabase plan and retention policy.

Before destructive schema changes:

1. Confirm a recent backup is available.
2. Test Django migrations in a non-production environment.
3. Schedule the migration if it affects production availability.
4. Verify application and data integrity after deployment.

Treat Supabase Storage objects as production data. Apply an appropriate retention and recovery process for uploaded medical media.

---

# 10. Local Development

Local development may use a dedicated Supabase development project or a local Supabase environment.

Developers must:

- Use development-only database and storage credentials.
- Keep local configuration in `.env` files that are not committed.
- Run Django migrations against the development database.
- Use development storage buckets or isolated object-path prefixes.
- Never use production credentials or production medical data locally.

The repository `media/` directory is reserved for local development only. Production uploads use Supabase Storage.

---

# 11. Production Deployment

Production deployment requires:

- A production Supabase project
- Supabase PostgreSQL connection details configured in Django environment variables
- Required Supabase Storage buckets created before file uploads are enabled
- Server-only storage credentials configured in the Django deployment environment
- HTTPS enabled for Django and all client applications
- Database backup, retention, and recovery procedures confirmed
- Django migrations applied through the approved deployment process

Django REST Framework remains the only application API exposed to web and mobile clients.

Do not introduce Supabase Auth, Supabase Edge Functions, or backend AI inference without an explicit architecture update.
