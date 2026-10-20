# Deployment

XPawSure deploys as a **stateless Django web service** plus a static React
frontend. It needs **no Celery, no Redis, no cron/scheduler, and no background
worker** — everything runs inside the request lifecycle.

The capstone deployment uses free tiers only:

| Layer | Service | Free-tier notes |
|---|---|---|
| Backend API | **Render Free** | 512 MB RAM, sleeps after 15 idle minutes, ~1 min cold start |
| Frontend | **Cloudflare Pages** | Static hosting + HTTPS, free subdomain |
| Database | **Supabase Free** | 500 MB database, 1 GB storage, pauses after 7 low-activity days |
| Production email | **Brevo Free** | 300 transactional emails/day, HTTPS API |
| Local email | **Gmail SMTP** | App Password, unchanged local workflow |

> **Why Brevo?** Render Free blocks outbound SMTP ports `25`, `465`, and `587`.
> Gmail SMTP therefore works locally but cannot connect from a Render Free
> service. Brevo delivers over HTTPS (`443`), which Render allows. The
> application code is unchanged: only `EMAIL_BACKEND` changes in production.

> **Free-tier caveat:** this setup has no SLA, no automatic database backups,
> and sleeps when idle. Use it for the capstone demo, not for real client data.

---

## 1. Email delivery: local vs production

| Environment | Backend | Transport |
|---|---|---|
| Local development | `django.core.mail.backends.smtp.EmailBackend` | Gmail SMTP `smtp.gmail.com:587` (STARTTLS) |
| Production | `core.backends.brevo.BrevoEmailBackend` | Brevo HTTPS `POST https://api.brevo.com/v3/smtp/email` |

Both backends go through `core.email_service.send_templated_email()`, so
templates, recipients, subjects, logging, and the “never retry a timeout”
policy are identical.

### Brevo setup

1. Create a free account at <https://www.brevo.com/>.
2. Verify the sender address:
   - **Senders, Domains & Dedicated IPs → Senders → Add a sender**.
   - Use the Gmail address that will appear in `DEFAULT_FROM_EMAIL`.
   - Open the verification email and confirm.
3. Create an API key:
   - **SMTP & API → API keys → Create a new API key**.
   - Copy the key once; it starts with `xkeysib-`.
   - Store it in Render as `BREVO_API_KEY`. Never commit it.
4. Set production variables:
   - `EMAIL_BACKEND=core.backends.brevo.BrevoEmailBackend`
   - `DEFAULT_FROM_EMAIL=<verified sender address>`
   - `SUPPORT_EMAIL=<verified sender address>`
   - `BREVO_API_KEY=<the API key>`
   - `EMAIL_TIMEOUT=10` (optional; this is the default)
   - `BREVO_API_URL` is optional; it defaults to
     `https://api.brevo.com/v3/smtp/email`.

The sender in `DEFAULT_FROM_EMAIL` **must** be verified in Brevo, or the API
rejects the request with a non-2xx response. A display name is allowed, for
example `XPawSure <clinic@gmail.com>`; the address inside the angle brackets is
what Brevo checks.

Brevo’s free plan allows 300 emails/day. Welcome and password-reset emails are
far below that limit.

---

## 2. Render Free — backend

Create a **Web Service** from the repository.

| Setting | Value |
|---|---|
| Root directory | `backend` |
| Runtime | Python 3 |
| Build command | `pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate --noinput` |
| Start command | `gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 1 --threads 4 --timeout 60 --access-logfile -` |

Use **one gunicorn worker**: Render Free provides 512 MB RAM, and Django plus
psycopg2 fits comfortably in one process. Four threads handle concurrent I/O
(email and Supabase uploads) without spawning more processes. The 60-second
timeout covers slow first requests; Render’s own cold start happens before
gunicorn handles the request.

`backend/.python-version` pins Python `3.13.3` for Render.

### Environment variables

Set these in **Render → your service → Environment**. Never commit real values;
`.env.example` contains placeholders only.

| Variable | Value / purpose |
|---|---|
| `DEBUG` | `False` |
| `SECRET_KEY` | Strong random value. Generate with `python -c "import secrets; print(secrets.token_urlsafe(50))"` |
| `ALLOWED_HOSTS` | `<your-service>.onrender.com` |
| `DATABASE_URL` | Supabase **session pooler** connection string (see §4) |
| `CONN_MAX_AGE` | `60` (one worker) |
| `CORS_ALLOWED_ORIGINS` | `https://<your-project>.pages.dev` (comma-separated; required when `DEBUG=False`) |
| `CSRF_TRUSTED_ORIGINS` | `https://<your-project>.pages.dev` (optional; needed only for cross-origin session/CSRF requests) |
| `FRONTEND_URL` | `https://<your-project>.pages.dev` (used in email links) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (**secret**) |
| `SUPABASE_STORAGE_BUCKET_PET_IMAGES` | `pet-images` |
| `SUPABASE_STORAGE_BUCKET_QR_CODES` | `qr-codes` |
| `SUPABASE_STORAGE_BUCKET_OWNER_IMAGES` | `owner-images` |
| `SUPABASE_STORAGE_BUCKET_CLINIC_IMAGES` | `clinic-images` |
| `EMAIL_BACKEND` | `core.backends.brevo.BrevoEmailBackend` |
| `BREVO_API_KEY` | Brevo API key (**secret**) |
| `DEFAULT_FROM_EMAIL` | Verified Brevo sender address |
| `SUPPORT_EMAIL` | Address shown in email templates |
| `EMAIL_TIMEOUT` | `10` (seconds per delivery attempt) |

Notes:

- `CORS_ALLOWED_ORIGINS` has **no default** when `DEBUG=False`; a missing value
  makes settings fail to load.
- The backend refuses to boot when `DEBUG=False` and either the development
  `SECRET_KEY`, a wildcard or empty `ALLOWED_HOSTS`, or an empty
  `CORS_ALLOWED_ORIGINS` is still configured.
- The backend also refuses to boot without a PostgreSQL `DATABASE_URL` when
  `DEBUG=False`; the local SQLite fallback is never used on Render.
- HTTPS hardening is enabled automatically when `DEBUG=False`: Django redirects
  plain HTTP and sends HSTS for one year. Override `SECURE_SSL_REDIRECT` or
  `SECURE_HSTS_SECONDS` only if you have a specific reason.
- `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, and `EMAIL_HOST_PASSWORD` are
  **not needed in production**; the Brevo backend ignores them. Keep them in
  your local `.env` for Gmail.
- If `DEFAULT_FROM_EMAIL` is omitted, it falls back to `EMAIL_HOST_USER` (empty
  in production) and then to `noreply@localhost`, which Brevo will reject. Set
  it explicitly.

### First deploy

The build command runs migrations automatically. After the first successful
deploy:

1. Open `https://<your-service>.onrender.com/admin/` and confirm the page is
   styled (this verifies `collectstatic` + WhiteNoise).
2. Create the **app Super Admin** account. `createsuperuser` creates Django's
   built-in `auth.User`, which **cannot log into the React app**; the API
   authenticates against the custom `users.User` table. Use the project's
   management command instead.

   Open **Render → your service → Shell** (or run locally with the production
   environment set for that terminal), then run:

   ```
   python manage.py create_super_admin --email admin@xpawsure.com
   ```

   The command prompts for the password twice without echoing it, validates it,
   sets `usr_role=SUPER_ADMIN`, activates the account, and marks the email
   verified. Use `--force` only when you intentionally want to reset an
   existing account:

   ```
   python manage.py create_super_admin --email admin@xpawsure.com --force
   ```

   If Render Shell is unavailable, run the same command locally with the
   production environment from §2 set **for that terminal only** — especially
   `DATABASE_URL`, `SECRET_KEY`, `DEBUG=False`, `ALLOWED_HOSTS`, and
   `CORS_ALLOWED_ORIGINS`. On Windows PowerShell, set them with
   `$env:NAME="..."` first. Close the terminal afterward and never put these
   values in a committed file.

   Optional: if you also need the Django admin at `/admin/`, create a separate
   `createsuperuser` account. It is not the app login.
3. Log into the frontend with the app Super Admin, then create the clinic from
   **Clinics → Register New Clinic** (see §8). The backend creates the Clinic
   Admin account, generates a temporary password, and emails it to the clinic
   address.

Render Free sleeps after 15 minutes of inactivity. The first request after a
sleep can take roughly a minute; the frontend should keep its request timeouts
and loading states generous.

---

## 3. Cloudflare Pages — frontend

Create a **Pages** project connected to the same repository.

| Setting | Value |
|---|---|
| Root directory | `frontend/React` |
| Framework preset | Vite |
| Build command | `npm ci && npm run build` |
| Build output directory | `dist` |
| Environment variable | `NODE_VERSION=22` |
| Environment variable | `VITE_API_URL=https://<your-service>.onrender.com/api` |

`VITE_API_URL` is the **full API base URL including `/api`**, with no trailing
slash. During local development it is unset, so the frontend falls back to
Vite’s `/api` proxy. In production the browser calls Render directly; there is
no Pages proxy, because Render cold starts can exceed a proxy’s timeout.

`frontend/React/public/_redirects` contains:

```
/* /index.html 200
```

Cloudflare Pages copies it into `dist`, so deep links such as
`/owners/123/pets` still load the React app.

After Pages gives you a URL (for example
`https://xpawsure.pages.dev`), add it to Render’s
`CORS_ALLOWED_ORIGINS` and `FRONTEND_URL`, then redeploy the backend. If you
add a custom domain to Pages later, include that origin as well.

---

## 4. Supabase — database and storage

Use the existing Supabase project (or a new free one).

- **Database connection:** copy the **session pooler** connection string
  (host ends in `pooler.supabase.com`, port `5432`) and use it as
  `DATABASE_URL`. It includes the project ref in the username and the database
  password; keep `?sslmode=require` if Supabase provides it.
- **Transaction pooler:** if you switch to port `6543`, set `CONN_MAX_AGE=0`.
  The session pooler is recommended for this single-worker deployment.
- **Storage:** create the `pet-images`, `qr-codes`, `owner-images`, and
  `clinic-images` buckets. The service role key is server-side only and must
  never appear in the frontend.
- **Free-tier behavior:** the project pauses after about 7 days of very low
  activity. Open the Supabase dashboard and restore it before a demo.
- **Backups:** the free tier has no automatic backups. Export important demo
  data with `pg_dump` before risky changes.
- **Tests:** never point the test suite at the production database. Use the
  local Postgres from `docker-compose.yml` for full runs.

---

## 5. Local development (Gmail SMTP)

Local development keeps the existing Gmail workflow. In your local `.env`:

```
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-account@gmail.com
EMAIL_HOST_PASSWORD=your-16-character-app-password
DEFAULT_FROM_EMAIL=your-account@gmail.com
SUPPORT_EMAIL=your-account@gmail.com
EMAIL_TIMEOUT=10
```

Gmail setup:

1. Enable **2-Step Verification** on the Google account.
2. Create an **App Password** at <https://myaccount.google.com/apppasswords>
   (Security → App passwords). Copy the 16-character value once.
3. Use the App Password, never the normal Google password. With 2-Step
   Verification enabled, Gmail rejects normal passwords with SMTP error `535`.

To print rendered emails to the terminal instead of sending them:

```
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
```

Local development needs no Brevo key. `DEBUG=True` by default, so secure
cookies and the production fail-fast checks are inactive.

---

## 6. Error handling and guarantees

- Emails are sent **synchronously after the database transaction commits**
  (`transaction.on_commit`), so nothing is sent for a rolled-back transaction.
- Every attempt is capped at `EMAIL_TIMEOUT` (default **10 seconds**): the SMTP
  socket timeout locally, the HTTP request timeout in production.
- Failures — connection errors, Gmail authentication errors (`535`), SMTP
  server errors, Brevo non-2xx responses, timeouts, or template render errors —
  are logged with `logger.exception()` (recipient and subject only; never
  passwords, API keys, or tokens) and reported through the failed
  `EmailResult`.
- **An email delivery failure never turns a committed registration or
  staff/clinic/veterinarian creation into an HTTP 500.**
- A timeout leaves delivery uncertain, so sends are **never retried
  automatically** — a blind retry could deliver the message twice. The Brevo
  backend converts `requests.Timeout` into Python’s built-in `TimeoutError`,
  so the existing uncertainty warning still applies.
- The Brevo backend supports plain text, HTML, To/Cc/Bcc, Reply-To, custom
  headers, and attachments. The current flows use text + HTML.

Covered flows: clinic welcome, staff welcome/create, veterinarian welcome,
staff `reset-password`, and staff `resend-welcome` — all go through
`core.email_service.send_templated_email()`. In-app appointment confirmations
and status updates are handled by the notifications app, not email.

---

## 7. No worker, no scheduler

There is no Celery beat, cron job, or queue. Overdue appointment statuses are
**refreshed on reads**: the receptionist dashboard and the appointment list
run `AppointmentService.close_past_due(clinic_id)` for the requesting clinic
before returning (clinic-scoped, idempotent, row-locked with
`select_for_update`). See `docs/api/API_SPEC.md` for the exact rules and
`docs/architecture/BACKEND_ARCHITECTURE.md` §17 for the rationale.

---

## 8. Post-deploy smoke test

Run these against the deployed URLs after the first deploy:

1. Open the frontend, log in with the **app Super Admin** created above.
2. Create a clinic with an email address you control; confirm the welcome
   email arrives and the temporary-password link opens the correct frontend.
3. Use **Staff → Reset password** (or **Resend welcome**) for a staff account;
   confirm the email arrives.
4. Open a public pet page (QR/profile URL) in a logged-out browser.
5. Upload a pet or owner image; confirm it is served from Supabase Storage.
6. Check Render logs for `Failed to send email` or 5xx responses.
7. Check the Brevo dashboard (**Transactional → Logs**) for the sent messages.

---

## 9. Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| Render deploy fails with `ImproperlyConfigured` | `DEBUG=False` with a short/default `SECRET_KEY`, wildcard/empty `ALLOWED_HOSTS`, missing `CORS_ALLOWED_ORIGINS`, or a missing/SQLite `DATABASE_URL` |
| `DisallowedHost` / 400 | Add the exact Render hostname to `ALLOWED_HOSTS` |
| Browser reports a CORS error | Add the exact Pages origin (scheme included) to `CORS_ALLOWED_ORIGINS`; redeploy |
| First request takes ~1 minute | Render Free cold start; keep loading states and retry once |
| 502 from Render | Service still starting, crashed, or exceeded memory; check Render logs |
| Database connection error | Use the session-pooler URL, check the password, SSL mode, and whether the Supabase project is paused |
| Admin page unstyled | Build command must run `collectstatic --noinput`; `STATIC_ROOT` + WhiteNoise are configured |
| Images broken | Check Supabase bucket names, service role key, and bucket policies |
| Email not delivered | Check `EMAIL_BACKEND`, `BREVO_API_KEY`, the verified `DEFAULT_FROM_EMAIL`, Render logs, and the Brevo transactional log |
| Brevo `401` | Missing/invalid API key |
| Brevo `400` | Sender not verified, malformed address, or missing body |
| Brevo quota reached | Free plan is 300 emails/day; wait for the daily reset |

---

## 10. Tests

From `backend/`:

```
python manage.py test
```

Tests run on Django’s in-memory (locmem) email backend. SMTP-specific tests
mock `smtplib.SMTP`, and Brevo backend tests mock `requests.post` at the HTTP
transport boundary — automated tests never contact `smtp.gmail.com` or the
Brevo API and never send real email.

Targeted runs:

```
python manage.py test core --keepdb
python manage.py test core.test_brevo_backend --keepdb
```

---

## 11. Security checklist

- `.env` is gitignored; production secrets live only in Render’s Environment
  tab. Rotate the Brevo key immediately if it is exposed.
- `DEBUG=False`, a strong `SECRET_KEY`, and explicit `ALLOWED_HOSTS` are
  mandatory; the backend fails fast otherwise.
- The Supabase **service role** key stays server-side. Never expose it through
  `VITE_*` variables or the frontend bundle.
- `VITE_API_URL` is public by design; it contains no secrets.
- Free-tier hosting is suitable for the capstone demo only. Do not store real
  client medical data without backups, an SLA, and a privacy review.
