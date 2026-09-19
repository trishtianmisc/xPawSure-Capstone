# BUSINESS_RULES.md

> Version: 1.0
> Project: XPawSure
> Domain: Veterinary Clinic Management

---

# 1. Purpose

This document defines the business rules that govern XPawSure.

Business rules describe how the veterinary clinic operates.

These rules take precedence over implementation details.

AI coding assistants must follow these rules when generating features.

---

# 2. Core Principles

XPawSure is a Veterinary Management System.

The application must:

- Preserve medical history
- Maintain data integrity
- Assist veterinarians
- Reduce administrative work
- Improve patient tracking

The application must never replace professional veterinary judgment.

---

# 3. User Roles

Current roles:

Super Admin

Clinic Admin

Receptionist

Veterinarian

Owner

Permissions are assigned by role.

Never assign permissions directly to users.

---

## Data Isolation Rule

Every Owner, Pet, Appointment, Consultation, Prescription, Vaccination, AI Screening, and Report belongs to exactly one clinic.

Users may access only data belonging to their own clinic. Super Admin is the only role with cross-clinic access.

This rule must be enforced for reads, creates, updates, deletes, exports, and reports.

---

# 4. Super Admin Rules

Super Admins can

- Review clinic requests received outside the system
- Manage all clinics
- Create Clinic records after manual approval
- Create Clinic Admin accounts
- Send a temporary password or account activation email to the clinic's registered email address
- Suspend or activate clinics
- View platform analytics

Super Admins cannot modify historical medical records.

---

# 5. Clinic Onboarding Workflow

XPawSure does not allow public clinic registration. Interested veterinary clinics must contact XPawSure outside the system, such as through email, phone, Facebook page, or website inquiry.

The onboarding process is:

1. A clinic contacts XPawSure outside the system.
2. A Super Admin reviews the request manually.
3. If approved, the Super Admin creates the Clinic record.
4. The Super Admin creates the Clinic Admin account.
5. The Super Admin sends a temporary password or account activation email to the clinic's registered email address.
6. On first login, the Clinic Admin must change their password before accessing the system.
7. The Clinic Admin can then create and manage Veterinarian and Receptionist accounts within that clinic.

The system must not provide a public clinic registration page, a public clinic-registration endpoint, or an in-system clinic application or pending-approval workflow.

---

# 6. Clinic Admin Rules

Clinic Admins can

- Manage their clinic profile
- Manage Veterinarian and Receptionist accounts for their own clinic
- View clinic reports

Clinic Admins cannot

- Create or manage another clinic
- Manage users outside their own clinic
- Modify historical medical records
- Grant Super Admin privileges

---

# 7. First Login Password Change Rule

Clinic Admins created through clinic onboarding must change their temporary password on their first successful login.

Until the password is changed, the Clinic Admin must not access protected application functionality other than the password-change process. Temporary passwords must be stored only as password hashes and sent only through an approved secure delivery method.

---

# 8. Receptionist Rules

Receptionists can

- Register owners
- Register pets
- Schedule appointments
- Check patients in

Receptionists may perform these actions only for their own clinic.

Receptionists cannot

- Create diagnoses
- Create prescriptions
- Modify consultations
- Delete medical history
- Run AI screening
- Manage user accounts
- Access records outside their own clinic

---

# 9. Veterinarian Rules

Veterinarians can

- Manage consultations
- Review AI screening results
- Create prescriptions
- Maintain medical records

Veterinarians may perform these actions only for appointments and records within their own clinic.

Veterinarians cannot

- Delete completed consultations
- Delete medical history
- Manage user accounts
- Access records outside their own clinic

---

# 10. Owner Rules

Owners register through the mobile application.

Owner registration creates a User with role=OWNER and an associated OwnerProfile.

One owner profile can own many pets.

A pet belongs to only one owner profile.

Duplicate owner records are prohibited.

Owners may:

- Register and manage their profile
- Register and manage their own pets
- Perform AI-assisted screening (mobile only)
- Book and cancel appointments
- View appointment history
- View consultation history (read-only)
- View prescription history (read-only)
- View vaccination history (read-only)
- View AI screening history

Owners cannot:

- Edit medical records
- Create consultations
- Create prescriptions
- Record vaccinations
- Access other owners' data
- Register a clinic

---

# 11. Pet Rules

Every pet must belong to an owner.

Required information:

- Name
- Species
- Breed
- Sex
- Birth Date (or Estimated Age)
- Weight

Each pet receives a permanent medical history.

---

# 12. Appointment Rules

Appointments are required before consultations.

Appointments must have

- Pet
- Veterinarian
- Date
- Time
- Status

Statuses

Pending

Confirmed

Completed

Cancelled

No Show

Appointments cannot overlap for the same veterinarian.

Completed appointments cannot be edited except by a Super Admin.

---

# 13. Consultation Rules

A consultation requires:

- A completed appointment
- A veterinarian

A consultation contains

- Chief complaint
- History
- Physical examination
- Assessment
- Diagnosis
- Treatment plan
- Notes

Each consultation belongs to exactly one appointment.

Consultations become permanent medical records.

---

# 14. Diagnosis Rules

Only veterinarians can create diagnoses.

Diagnoses cannot be generated automatically.

The AI must never create or overwrite a diagnosis.

If the veterinarian changes the diagnosis after reviewing the AI result, the veterinarian's diagnosis is authoritative.

---

# 15. AI Screening Rules

AI screening is optional.

AI screening can be initiated by:

- Pet owner (via mobile app, before or without a consultation)
- Veterinarian (during a consultation)

A screening may or may not be associated with a consultation.

If performed by an owner before a consultation, the screening result is available for the veterinarian to review during the consultation.

A consultation may have

- Zero screenings
- One screening
- Multiple screenings

Each screening records

- Prediction
- Confidence
- Model version
- Image
- Timestamp

The AI only provides a preliminary screening.

The veterinarian makes the final diagnosis.

---

# 16. Prescription Rules

A prescription requires:

- Consultation
- Veterinarian

Each prescription contains

- Medication
- Dosage
- Frequency
- Duration
- Instructions

One consultation may have multiple prescriptions.

Prescriptions cannot exist without consultations.

---

# 17. Vaccination Rules

Vaccinations belong to pets.

Every vaccination records

- Vaccine name
- Date administered
- Veterinarian
- Batch number (optional)
- Next due date (optional)

Vaccination history cannot be deleted.

---

# 18. Medical Record Rules

Medical history is permanent.

Medical records

Must never be physically deleted.

Corrections should create audit entries rather than erase historical information.

---

# 19. AI Result Workflow

## Owner-Initiated Screening

Capture Image (Mobile)

↓

Run TensorFlow Lite

↓

Display Prediction to Owner

↓

Upload Result to Backend

↓

Veterinarian Reviews During Next Consultation

## Veterinarian-Initiated Screening

Capture Image (Mobile or Upload)

↓

Run TensorFlow Lite

↓

Display Prediction to Veterinarian

↓

Accept or Ignore

↓

Diagnosis

↓

Save Consultation

The veterinarian may ignore AI recommendations.

---

# 20. Appointment Workflow

Owner Registered

↓

Pet Registered

↓

Appointment Created

↓

Appointment Confirmed

↓

Consultation

↓

AI Screening (Optional)

↓

Diagnosis

↓

Prescription

↓

Vaccination (Optional)

↓

Consultation Completed

---

# 21. Notification Rules

Notify veterinarians when:

- New appointment assigned
- Appointment rescheduled
- Appointment cancelled

Notify owners when:

- Appointment confirmed
- Appointment reminder
- Screening results reviewed by veterinarian
- Vaccination due

For clinic staff, notify when:

- New appointment booked by owner
- Appointment rescheduled or cancelled by owner

---

# 22. Audit Rules

The system records

- Record creation
- Record updates
- User responsible
- Timestamp

Audit logs cannot be modified.

---

# 23. Reporting Rules

Reports are generated from historical data.

Reports are read-only.

Reports must never modify records.

---

# 24. Security Rules

Medical information is confidential.

Only authorized users may access patient records.

Every action must be attributable to an authenticated user.

---

# 25. Future Business Rules

Future versions may support:

- Multiple clinic branches
- Billing
- Inventory
- Laboratory requests
- SMS notifications
- Telemedicine

These features must not break existing workflows.

---

---

# Receptionist Schedule Management Rules

Receptionists can view and manage veterinarian schedules for their clinic.

Receptionists can generate time slots for veterinarians based on clinic operating hours.

Receptionists can toggle slot status between AVAILABLE and BLOCKED for any slot that has no appointment.

BOOKED slots cannot be blocked — the appointment must be cancelled first, notifying the owner.

Receptionists can bulk-block all remaining available slots for a vet on a specific date.

Bulk block operations skip BOOKED slots and return a count of skipped slots so the receptionist knows which appointments still need individual handling.

When an appointment is cancelled or marked no-show, the slot automatically returns to AVAILABLE status.

Slot generation uses ClinicOperatingHours (opening/closing times) and ClinicSettings.cls_appointment_duration (default 30 minutes).

The mobile app's booking flow queries slots with status = AVAILABLE. Blocked slots are not visible to owners.

---

# 26. Rules for AI Coding Assistants

When implementing features:

- Preserve medical history.
- Never delete historical consultations.
- Never allow AI to replace veterinarian decisions.
- Enforce role-based permissions.
- Enforce clinic data isolation; only Super Admins may access data across clinics.
- Enforce manual clinic onboarding and first-login password change requirements.
- Validate business rules before database operations.
- Keep appointment, consultation, screening, prescription, and vaccination workflows consistent.
- Reject implementations that violate these business rules, even if they are technically possible.
