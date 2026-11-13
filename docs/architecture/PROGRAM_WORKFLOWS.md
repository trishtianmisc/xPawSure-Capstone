# Program Workflows

Role-based program workflows for XPawSure web application.

These diagrams reflect the implemented code, not the intended design. Source of truth:

- Backend permissions: `backend/core/permissions.py`, per-app `views.py`
- Frontend routes and guards: `frontend/React/src/App.tsx`, `features/auth/components/ProtectedRoute.tsx`
- Appointment transitions: `backend/appointments/services.py` (`VALID_TRANSITIONS`)

Editable draw.io sources:

- `docs/assets/diagrams/receptionist-program-workflow.drawio`
- `docs/assets/diagrams/clinic-admin-program-workflow.drawio`

---

## 1. Receptionist

### 1.1 Corrections applied to the previous diagram

| Previous step | Problem | Correction |
|---|---|---|
| Dashboard → Manage Vet Accounts → Add / Deactivate Veterinarian | Receptionist has no staff permissions. `staff/views.py` and `veterinarians/views.py` are `IsClinicAdmin`; API returns 403. | Removed. Moved to the Clinic Admin workflow. |
| Log in → Dashboard | Missing forced first-login password change. `usr_must_change_password` blocks every write until changed. | Added "First login → Change password" gate before Dashboard. |
| Manage Appointment → Select Appointment → View Schedule → Set Schedule | Selecting an appointment does not lead to schedule setup. Schedule is an independent module (vet list → slot grid → generate/block). | Split into two branches: "Manage Appointments" and "Manage Schedule". |
| Set Vet for Consultation (after Set Schedule) | The veterinarian is chosen at booking time via the selected slot. No re-assign endpoint exists (`stf_id` is written only at creation). | Moved into the booking flow: "Select date and veterinarian → Select time slot". |
| Confirm Payment (after setting the vet) | No staff confirmation action exists. Payment gates booking *before* the appointment is created: cash is `PAID` at checkout creation, GCash/Card settle at the gateway/webhook. | Payment step placed inside the booking flow, before "Book appointment". Added read-only Payments module with `PENDING → VOID` cancel only. |
| Update Appointment Status (single box) | Hides the actual transition rules, roles, and auto-close behavior. | Expanded into the five real actions with exact transitions (§1.3). |

Missing from the previous diagram and now added: Payments, Patients, Owners modules; the veterinarian handoff for starting a consultation; system auto-close behavior.

### 1.2 Workflow

```mermaid
flowchart TD
    A["Clinic"] --> B["Log in - email and password"]
    B --> C{"First login?"}
    C -->|"must change password"| D["Change password - forced setup"]
    C -->|"no"| E
    D --> E["Dashboard - today's stats, upcoming appointments, past-due alert"]

    E --> F["Manage Appointments"]
    E --> G["Manage Schedule"]
    E --> H["View Payments"]
    E --> I["View Patients"]
    E --> J["View Owners"]
    E --> K["My Profile - edit name and phone, change password"]

    subgraph CREATE["Create appointment - desk booking"]
        F --> F1["New Appointment"]
        F1 --> F2["Select owner and pet"]
        F2 --> F3["Select date and veterinarian"]
        F3 --> F4["Select time slot"]
        F4 --> F5["Enter type and reason"]
        F5 --> F6["Collect payment - only when clinic fee is set"]
        F6 --> F7["Book appointment - created as CONFIRMED"]
    end

    subgraph STATUS["Update appointment status"]
        F --> S1["Select appointment - list, dashboard, pet history, schedule"]
        S1 --> S2["Open appointment detail"]
        S2 --> S3["Confirm - PENDING to CONFIRMED - owner bookings"]
        S2 --> S4["Check In - CONFIRMED to CHECKED_IN"]
        S2 --> S5["Complete - CHECKED_IN or IN_PROGRESS to COMPLETED"]
        S2 --> S6["Cancel with reason - slot released"]
        S2 --> S7["Mark No-Show - CONFIRMED past time - slot released"]
    end

    subgraph SCHEDULE["Schedule management"]
        G --> G1["View schedule list per veterinarian"]
        G1 --> G2["Open schedule grid"]
        G2 --> G3["Generate slots, block or unblock slots, block all remaining"]
    end

    subgraph PAY["Payments"]
        H --> H1["Payment ledger - read only"]
        H1 --> H2["Cancel unpaid checkout - PENDING to VOID"]
    end

    subgraph PATIENTS["Patients"]
        I --> I1["Pet list and search"]
        I1 --> I2["Pet detail and medical history - read only"]
        I2 --> I3["Book appointment"]
    end

    subgraph OWNERS["Owners"]
        J --> J1["Owner list and search"]
        J1 --> J2["Owner detail - read only, owners self-register"]
    end

    I3 --> F1

    F6 -.-> FN["Cash: recorded PAID now. GCash/Card: checkout paid at gateway. Booking blocked until PAID. No fee: book directly."]
    S4 -.-> VET["Veterinarian starts consultation - CHECKED_IN to IN_PROGRESS - veterinarian only"]
    S2 -.-> AUTOCLOSE["Auto-close on view: past-due PENDING becomes CANCELLED; CONFIRMED more than 60 minutes late becomes NO_SHOW"]
    FORBID["Not permitted: manage staff or vet accounts, create prescriptions or consultations, refund paid payments"]

    classDef note fill:#fff3cd,stroke:#d6b656,stroke-dasharray: 5 5,color:#000;
    classDef forbid fill:#f8d7da,stroke:#c00,stroke-dasharray: 5 5,color:#000;
    class FN,VET,AUTOCLOSE note;
    class FORBID forbid;
```

### 1.3 Appointment status transitions owned by the receptionist

`PATCH /api/appointments/{id}/` — receptionist only for mutations (veterinarians receive 403 and must use start/request endpoints; the clinic admin cannot `PATCH` at all, see §3).

| From | Action | To | Notes |
|---|---|---|---|
| PENDING | Confirm | CONFIRMED | Owner mobile bookings only; desk bookings are created `CONFIRMED`. Past-time confirm is rejected. |
| CONFIRMED | Check In | CHECKED_IN | Sets `apt_checked_in_at`. |
| CHECKED_IN / IN_PROGRESS | Complete | COMPLETED | Sets `apt_completed_at`. |
| PENDING / CONFIRMED / CHECKED_IN | Cancel with reason | CANCELLED | Slot released to `AVAILABLE`; owner notified. |
| CONFIRMED (past time) | Mark No-Show | NO_SHOW | Slot released to `AVAILABLE`. |

System auto-close runs whenever the list or dashboard is read: past-due `PENDING → CANCELLED` ("Not confirmed in time"), `CONFIRMED` more than 60 minutes late `→ NO_SHOW`.

Veterinarian handoff: `CHECKED_IN → IN_PROGRESS` happens only through `POST /api/veterinarian/appointments/{id}/start/`, for the assigned veterinarian.

---

## 2. Clinic Admin

### 2.1 Workflow

```mermaid
flowchart TD
    A["Clinic"] --> B["Log in"]
    B --> C{"First login?"}
    C -->|"must change password"| D["Change password - temporary password"]
    C -->|"no"| E
    D --> E["Dashboard - total staff, patients, appointments this month, screenings awaiting review, charts, recent activity"]

    E --> F["Manage Staff"]
    E --> G["View Appointments - read only"]
    E --> H["Clinic Profile"]
    E --> I["My Profile"]
    E --> J["Recent Activity - audit log"]

    subgraph STAFF["Staff management"]
        F --> F1["Staff list - tabs: all, veterinarians, receptionists; status filters"]
        F1 --> F2["Add Staff - veterinarian or receptionist"]
        F1 --> F3["CSV bulk upload"]
        F1 --> F4["Staff detail"]
        F2 --> F5["Temporary password and welcome email - must change on first login"]
        F4 --> F6["Edit, Reset password, Resend welcome, Deactivate or Activate"]
    end

    subgraph APPTS["Appointments - view only"]
        G --> G1["Appointment volume chart - last 30 days"]
        G --> G2["Filterable list - veterinarian, date range, status"]
    end

    subgraph PROFILE["Clinic profile"]
        H --> H1["Clinic information and logo"]
        H --> H2["Clinic settings - hours, slot duration, max per day, owner booking, consultation fee"]
        H --> H3["Operating hours per day"]
    end

    subgraph MINE["My account"]
        I --> I1["Edit name and phone"]
        I --> I2["Change password"]
    end

    J --> J1["Last 10 audit events - staff, clinic, cancellation categories"]

    X["Not permitted: create or edit appointments, manage schedules, open payment or patient screens - Patients is disabled in the nav, platform reports and analytics - Super Admin only"]
    Y["Account boundary: creates veterinarians and receptionists only; clinics and clinic admin accounts are created by Super Admin"]

    classDef forbid fill:#f8d7da,stroke:#c00,stroke-dasharray: 5 5,color:#000;
    classDef note fill:#fff3cd,stroke:#d6b656,stroke-dasharray: 5 5,color:#000;
    class X forbid;
    class Y note;
```

### 2.2 Notes

- Dashboard data comes from `GET /api/staff/stats/`, `GET /api/appointments/volume/`, `GET /api/screenings/stats/`, and `GET /api/audit-logs/` — all `IsClinicAdmin`.
- Appointment list is read-only: `GET /api/appointments/` allows `CLINIC_ADMIN`, but `POST` returns 403 and the detail view (`GET`/`PATCH`) allows only `RECEPTIONIST`/`VETERINARIAN`. The admin UI has no detail route or status buttons.
- Clinic settings written here gate receptionist booking: consultation fee and "allow owner booking" are read by the booking flow (`GET /api/clinic/settings/` also admits receptionist).
- Staff accounts created here are created with `usr_must_change_password = True`; the new staff member is forced through the change-password screen on first login.

---

## 3. Known documentation discrepancy

`docs/api/API_SPEC.md` (§5, status change endpoint) states that the Clinic Admin may change appointment status. The implemented permission is `HasRole(RECEPTIONIST, VETERINARIAN)` (`backend/appointments/views.py:313`), so the clinic admin receives 403. These workflows follow the code. The API spec should be corrected separately.
