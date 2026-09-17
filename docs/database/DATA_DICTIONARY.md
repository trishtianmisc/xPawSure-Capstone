# Data Dictionary

> Project: XPawSure
> Version: 1.0
> Database: Supabase PostgreSQL
> Last Updated: September 2026

---

# Custom Enum Types

| Enum Name | Values |
|-----------|--------|
| UserRole | SUPER_ADMIN, CLINIC_ADMIN, VETERINARIAN, RECEPTIONIST, OWNER |
| ClinicStatus | ACTIVE, INACTIVE, SUSPENDED, ARCHIVED |
| PetSex | MALE, FEMALE |
| PetStatus | ACTIVE, DECEASED, MISSING, ADOPTED, ARCHIVED |
| PetImageType | PROFILE, MEDICAL, AI_SCREENING, FOLLOW_UP, OTHER |
| AppointmentStatus | PENDING, CONFIRMED, CHECKED_IN, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW |
| AppointmentType | CONSULTATION, FOLLOW_UP, VACCINATION, AI_REVIEW, EMERGENCY |
| DiagnosisStatus | PRELIMINARY, CONFIRMED, CHRONIC, RESOLVED |
| AttachmentType | IMAGE, PDF, XRAY, LAB_RESULT, DOCUMENT, OTHER |
| MedicineType | ANTIBIOTIC, ANTIFUNGAL, ANTI_PARASITIC, ANTI_INFLAMMATORY, VITAMIN, SHAMPOO, TOPICAL, OTHER |
| AdministrationRoute | ORAL, TOPICAL, INJECTION, SUBCUTANEOUS, INTRAMUSCULAR, INTRAVENOUS, EAR, EYE, OTHER |
| DiseaseSeverity | LOW, MODERATE, HIGH, UNKNOWN |
| AIScreeningStatus | PENDING_REVIEW, REVIEWED, CONFIRMED, DISMISSED |
| AIImageType | ORIGINAL, CROPPED, PREPROCESSED, ANNOTATED |
| NotificationType | APPOINTMENT_CREATED, APPOINTMENT_CONFIRMED, APPOINTMENT_CANCELLED, APPOINTMENT_REMINDER, CONSULTATION_AVAILABLE, PRESCRIPTION_AVAILABLE, VACCINATION_REMINDER, AI_SCREENING_COMPLETED, AI_SCREENING_REVIEWED, SYSTEM |
| AuditAction | CREATE, UPDATE, DELETE, LOGIN, LOGOUT, REGISTER, PASSWORD_CHANGE, PASSWORD_RESET, AI_SCREENING, BOOK_APPOINTMENT, EXPORT_REPORT |

---

# Tables

## USER

| Table | Field Name | Description | Data type | Null Characteristic |
|-------|------------|-------------|-----------|---------------------|
| USER | USR_ID | User ID (PK) | UUID | NOT NULL |
| USER | USR_EMAIL | Email address (unique) | VARCHAR | NOT NULL |
| USER | USR_PASSWORD_HASH | Hashed password | VARCHAR | NOT NULL |
| USER | USR_ROLE | User role (UserRole enum) | ENUM | NOT NULL |
| USER | USR_FIRST_NAME | First name | VARCHAR | NOT NULL |
| USER | USR_LAST_NAME | Last name | VARCHAR | NOT NULL |
| USER | USR_PHONE | Contact number | VARCHAR | NULL |
| USER | USR_IS_ACTIVE | Account active status | BOOLEAN | NULL |
| USER | USR_EMAIL_VERIFIED | Email verification status | BOOLEAN | NULL |
| USER | USR_MUST_CHANGE_PASSWORD | Force password change on first login | BOOLEAN | NULL |
| USER | USR_LAST_LOGIN | Last login timestamp | TIMESTAMP | NULL |
| USER | USR_CREATED_AT | Record creation timestamp | TIMESTAMP | NULL |
| USER | USR_UPDATED_AT | Last update timestamp | TIMESTAMP | NULL |
| USER | USR_DELETED_AT | Soft delete timestamp | TIMESTAMP | NULL |

---

## CLINIC

| Table | Field Name | Description | Data type | Null Characteristic |
|-------|------------|-------------|-----------|---------------------|
| CLINIC | CLN_ID | Clinic ID (PK) | UUID | NOT NULL |
| CLINIC | CLN_NAME | Clinic name (unique) | VARCHAR | NOT NULL |
| CLINIC | CLN_EMAIL | Clinic email (unique) | VARCHAR | NULL |
| CLINIC | CLN_PHONE | Clinic phone number | VARCHAR | NULL |
| CLINIC | CLN_ADDRESS | Clinic full address | TEXT | NULL |
| CLINIC | CLN_LOGO_URL | Clinic logo image URL | TEXT | NULL |
| CLINIC | CLN_LICENSE_NO | Veterinary license number | VARCHAR | NULL |
| CLINIC | CLN_STATUS | Clinic status (ClinicStatus enum) | ENUM | NULL |
| CLINIC | CLN_CREATED_AT | Record creation timestamp | TIMESTAMP | NULL |
| CLINIC | CLN_UPDATED_AT | Last update timestamp | TIMESTAMP | NULL |
| CLINIC | CLN_DELETED_AT | Soft delete timestamp | TIMESTAMP | NULL |

---

## CLINIC_SETTINGS

| Table | Field Name | Description | Data type | Null Characteristic |
|-------|------------|-------------|-----------|---------------------|
| CLINIC_SETTINGS | CLS_ID | Settings ID (PK) | UUID | NOT NULL |
| CLINIC_SETTINGS | CLN_ID | Clinic ID (FK → CLINIC) | UUID | NOT NULL |
| CLINIC_SETTINGS | CLS_OPENING_TIME | Daily opening time | TIME | NULL |
| CLINIC_SETTINGS | CLS_CLOSING_TIME | Daily closing time | TIME | NULL |
| CLINIC_SETTINGS | CLS_APPOINTMENT_DURATION | Duration per appointment (minutes) | INT | NULL |
| CLINIC_SETTINGS | CLS_MAX_APPOINTMENTS_PER_DAY | Maximum appointments per day | INT | NULL |
| CLINIC_SETTINGS | CLS_ALLOW_OWNER_BOOKING | Allow owners to self-book | BOOLEAN | NULL |
| CLINIC_SETTINGS | CLS_CREATED_AT | Record creation timestamp | TIMESTAMP | NULL |
| CLINIC_SETTINGS | CLS_UPDATED_AT | Last update timestamp | TIMESTAMP | NULL |

---

## STAFF_PROFILE

| Table | Field Name | Description | Data type | Null Characteristic |
|-------|------------|-------------|-----------|---------------------|
| STAFF_PROFILE | STF_ID | Staff ID (PK) | UUID | NOT NULL |
| STAFF_PROFILE | USR_ID | User ID (FK → USER) | UUID | NOT NULL |
| STAFF_PROFILE | CLN_ID | Clinic ID (FK → CLINIC) | UUID | NOT NULL |
| STAFF_PROFILE | STF_LICENSE_NUMBER | Professional license number (for vets) | VARCHAR | NULL |
| STAFF_PROFILE | STF_CREATED_AT | Record creation timestamp | TIMESTAMP | NULL |
| STAFF_PROFILE | STF_UPDATED_AT | Last update timestamp | TIMESTAMP | NULL |

---

## OWNER_PROFILE

| Table | Field Name | Description | Data type | Null Characteristic |
|-------|------------|-------------|-----------|---------------------|
| OWNER_PROFILE | OWN_ID | Owner ID (PK) | UUID | NOT NULL |
| OWNER_PROFILE | USR_ID | User ID (FK → USER) | UUID | NOT NULL |
| OWNER_PROFILE | OWN_ADDRESS | Owner address | TEXT | NULL |
| OWNER_PROFILE | OWN_PROFILE_IMAGE | Profile image URL | TEXT | NULL |
| OWNER_PROFILE | OWN_CREATED_AT | Record creation timestamp | TIMESTAMP | NULL |
| OWNER_PROFILE | OWN_UPDATED_AT | Last update timestamp | TIMESTAMP | NULL |

---

## BREED

| Table | Field Name | Description | Data type | Null Characteristic |
|-------|------------|-------------|-----------|---------------------|
| BREED | BRD_ID | Breed ID (PK) | UUID | NOT NULL |
| BREED | BRD_NAME | Breed name (unique) | VARCHAR | NOT NULL |
| BREED | BRD_DESCRIPTION | Breed description | TEXT | NULL |
| BREED | BRD_CREATED_AT | Record creation timestamp | TIMESTAMP | NULL |
| BREED | BRD_UPDATED_AT | Last update timestamp | TIMESTAMP | NULL |

---

## PET

| Table | Field Name | Description | Data type | Null Characteristic |
|-------|------------|-------------|-----------|---------------------|
| PET | PET_ID | Pet ID (PK) | UUID | NOT NULL |
| PET | OWN_ID | Owner ID (FK → OWNER_PROFILE) | UUID | NOT NULL |
| PET | BRD_ID | Breed ID (FK → BREED) | UUID | NOT NULL |
| PET | PET_NAME | Pet name | VARCHAR | NOT NULL |
| PET | PET_SEX | Pet sex (PetSex enum) | ENUM | NOT NULL |
| PET | PET_STATUS | Pet status (PetStatus enum) | ENUM | NOT NULL |
| PET | PET_BIRTH_DATE | Date of birth | DATE | NULL |
| PET | PET_WEIGHT | Weight in kg | DECIMAL | NULL |
| PET | PET_COLOR | Coat color | VARCHAR | NULL |
| PET | PET_MICROCHIP_NO | Microchip identification number (unique) | VARCHAR | NULL |
| PET | PET_QR_CODE | QR code value | VARCHAR | NULL |
| PET | PET_QR_CODE_URL | QR code image URL | TEXT | NULL |
| PET | PET_CREATED_AT | Record creation timestamp | TIMESTAMP | NULL |
| PET | PET_UPDATED_AT | Last update timestamp | TIMESTAMP | NULL |
| PET | PET_DELETED_AT | Soft delete timestamp | TIMESTAMP | NULL |

---

## PET_IMAGE

| Table | Field Name | Description | Data type | Null Characteristic |
|-------|------------|-------------|-----------|---------------------|
| PET_IMAGE | PTI_ID | Image ID (PK) | UUID | NOT NULL |
| PET_IMAGE | PET_ID | Pet ID (FK → PET) | UUID | NOT NULL |
| PET_IMAGE | PTI_IMAGE_URL | Image URL | TEXT | NOT NULL |
| PET_IMAGE | PTI_IMAGE_TYPE | Image type (PetImageType enum) | ENUM | NOT NULL |
| PET_IMAGE | PTI_IS_PRIMARY | Is primary profile image | BOOLEAN | NULL |
| PET_IMAGE | PTI_CREATED_AT | Record creation timestamp | TIMESTAMP | NULL |

---

## APPOINTMENT

| Table | Field Name | Description | Data type | Null Characteristic |
|-------|------------|-------------|-----------|---------------------|
| APPOINTMENT | APT_ID | Appointment ID (PK) | UUID | NOT NULL |
| APPOINTMENT | PET_ID | Pet ID (FK → PET) | UUID | NOT NULL |
| APPOINTMENT | CLN_ID | Clinic ID (FK → CLINIC) | UUID | NOT NULL |
| APPOINTMENT | STF_ID | Staff ID (FK → STAFF_PROFILE) | UUID | NULL |
| APPOINTMENT | APT_TYPE | Appointment type (AppointmentType enum) | ENUM | NOT NULL |
| APPOINTMENT | APT_STATUS | Appointment status (AppointmentStatus enum) | ENUM | NOT NULL |
| APPOINTMENT | APT_SCHEDULED_AT | Scheduled date and time | TIMESTAMP | NOT NULL |
| APPOINTMENT | APT_REASON | Reason for visit | TEXT | NULL |
| APPOINTMENT | APT_CREATED_BY | Created by user (FK → USER) | UUID | NOT NULL |
| APPOINTMENT | APT_CONFIRMED_AT | Confirmation timestamp | TIMESTAMP | NULL |
| APPOINTMENT | APT_COMPLETED_AT | Completion timestamp | TIMESTAMP | NULL |
| APPOINTMENT | APT_CANCELLED_AT | Cancellation timestamp | TIMESTAMP | NULL |
| APPOINTMENT | APT_CREATED_AT | Record creation timestamp | TIMESTAMP | NULL |
| APPOINTMENT | APT_UPDATED_AT | Last update timestamp | TIMESTAMP | NULL |
| APPOINTMENT | APT_DELETED_AT | Soft delete timestamp | TIMESTAMP | NULL |

---

## CONSULTATION

| Table | Field Name | Description | Data type | Null Characteristic |
|-------|------------|-------------|-----------|---------------------|
| CONSULTATION | CON_ID | Consultation ID (PK) | UUID | NOT NULL |
| CONSULTATION | APT_ID | Appointment ID (FK → APPOINTMENT, unique) | UUID | NOT NULL |
| CONSULTATION | STF_ID | Veterinarian ID (FK → STAFF_PROFILE) | UUID | NOT NULL |
| CONSULTATION | CON_CHIEF_COMPLAINT | Patient main complaint | TEXT | NULL |
| CONSULTATION | CON_SUBJECTIVE | Subjective findings (SOAP) | TEXT | NULL |
| CONSULTATION | CON_OBJECTIVE | Objective findings (SOAP) | TEXT | NULL |
| CONSULTATION | CON_ASSESSMENT | Clinical assessment (SOAP) | TEXT | NULL |
| CONSULTATION | CON_PLAN | Treatment plan (SOAP) | TEXT | NULL |
| CONSULTATION | CON_DIAGNOSIS | Diagnosis text | TEXT | NOT NULL |
| CONSULTATION | CON_DIAGNOSIS_STATUS | Diagnosis status (DiagnosisStatus enum) | ENUM | NULL |
| CONSULTATION | CON_TREATMENT | Treatment description | TEXT | NULL |
| CONSULTATION | CON_NOTES | Additional notes | TEXT | NULL |
| CONSULTATION | CON_CREATED_AT | Record creation timestamp | TIMESTAMP | NULL |
| CONSULTATION | CON_UPDATED_AT | Last update timestamp | TIMESTAMP | NULL |

---

## CONSULTATION_ATTACHMENT

| Table | Field Name | Description | Data type | Null Characteristic |
|-------|------------|-------------|-----------|---------------------|
| CONSULTATION_ATTACHMENT | CAT_ID | Attachment ID (PK) | UUID | NOT NULL |
| CONSULTATION_ATTACHMENT | CON_ID | Consultation ID (FK → CONSULTATION) | UUID | NOT NULL |
| CONSULTATION_ATTACHMENT | CAT_FILE_URL | File URL | TEXT | NOT NULL |
| CONSULTATION_ATTACHMENT | CAT_FILE_NAME | Original filename | VARCHAR | NULL |
| CONSULTATION_ATTACHMENT | CAT_FILE_TYPE | File type (AttachmentType enum) | ENUM | NULL |
| CONSULTATION_ATTACHMENT | CAT_FILE_SIZE | File size in bytes | INT | NULL |
| CONSULTATION_ATTACHMENT | CAT_UPLOADED_AT | Upload timestamp | TIMESTAMP | NULL |

---

## PRESCRIPTION

| Table | Field Name | Description | Data type | Null Characteristic |
|-------|------------|-------------|-----------|---------------------|
| PRESCRIPTION | PRS_ID | Prescription ID (PK) | UUID | NOT NULL |
| PRESCRIPTION | CON_ID | Consultation ID (FK → CONSULTATION) | UUID | NOT NULL |
| PRESCRIPTION | STF_ID | Prescribing staff ID (FK → STAFF_PROFILE) | UUID | NOT NULL |
| PRESCRIPTION | PRS_INSTRUCTIONS | General instructions | TEXT | NULL |
| PRESCRIPTION | PRS_CREATED_AT | Record creation timestamp | TIMESTAMP | NULL |
| PRESCRIPTION | PRS_UPDATED_AT | Last update timestamp | TIMESTAMP | NULL |

---

## PRESCRIPTION_ITEM

| Table | Field Name | Description | Data type | Null Characteristic |
|-------|------------|-------------|-----------|---------------------|
| PRESCRIPTION_ITEM | PRI_ID | Item ID (PK) | UUID | NOT NULL |
| PRESCRIPTION_ITEM | PRS_ID | Prescription ID (FK → PRESCRIPTION) | UUID | NOT NULL |
| PRESCRIPTION_ITEM | PRI_MEDICINE_NAME | Medication name | VARCHAR | NOT NULL |
| PRESCRIPTION_ITEM | PRI_MEDICINE_TYPE | Medicine type (MedicineType enum) | ENUM | NULL |
| PRESCRIPTION_ITEM | PRI_DOSAGE | Dosage (e.g., 500mg) | VARCHAR | NOT NULL |
| PRESCRIPTION_ITEM | PRI_FREQUENCY | Frequency (e.g., Twice daily) | VARCHAR | NOT NULL |
| PRESCRIPTION_ITEM | PRI_DURATION | Duration (e.g., 7 days) | VARCHAR | NOT NULL |
| PRESCRIPTION_ITEM | PRI_ROUTE | Administration route (AdministrationRoute enum) | ENUM | NULL |
| PRESCRIPTION_ITEM | PRI_QUANTITY | Quantity dispensed | INT | NULL |
| PRESCRIPTION_ITEM | PRI_NOTES | Additional notes | TEXT | NULL |
| PRESCRIPTION_ITEM | PRI_CREATED_AT | Record creation timestamp | TIMESTAMP | NULL |

---

## VACCINE

| Table | Field Name | Description | Data type | Null Characteristic |
|-------|------------|-------------|-----------|---------------------|
| VACCINE | VCC_ID | Vaccine ID (PK) | UUID | NOT NULL |
| VACCINE | VCC_NAME | Vaccine name (unique) | VARCHAR | NOT NULL |
| VACCINE | VCC_MANUFACTURER | Manufacturer name | VARCHAR | NULL |
| VACCINE | VCC_DESCRIPTION | Vaccine description | TEXT | NULL |
| VACCINE | VCC_CREATED_AT | Record creation timestamp | TIMESTAMP | NULL |
| VACCINE | VCC_UPDATED_AT | Last update timestamp | TIMESTAMP | NULL |

---

## VACCINATION_RECORD

| Table | Field Name | Description | Data type | Null Characteristic |
|-------|------------|-------------|-----------|---------------------|
| VACCINATION_RECORD | VAC_ID | Vaccination ID (PK) | UUID | NOT NULL |
| VACCINATION_RECORD | CON_ID | Consultation ID (FK → CONSULTATION) | UUID | NOT NULL |
| VACCINATION_RECORD | PET_ID | Pet ID (FK → PET) | UUID | NOT NULL |
| VACCINATION_RECORD | STF_ID | Veterinarian ID (FK → STAFF_PROFILE) | UUID | NOT NULL |
| VACCINATION_RECORD | VCC_ID | Vaccine ID (FK → VACCINE) | UUID | NOT NULL |
| VACCINATION_RECORD | VAC_BATCH_NO | Vaccine batch number | VARCHAR | NULL |
| VACCINATION_RECORD | VAC_DOSE | Dose info (e.g., 1st dose) | VARCHAR | NULL |
| VACCINATION_RECORD | VAC_ROUTE | Administration route (AdministrationRoute enum) | ENUM | NULL |
| VACCINATION_RECORD | VAC_DATE_GIVEN | Date vaccine was given | DATE | NOT NULL |
| VACCINATION_RECORD | VAC_NEXT_DUE | Next due date for booster | DATE | NULL |
| VACCINATION_RECORD | VAC_NOTES | Notes | TEXT | NULL |
| VACCINATION_RECORD | VAC_CREATED_AT | Record creation timestamp | TIMESTAMP | NULL |
| VACCINATION_RECORD | VAC_UPDATED_AT | Last update timestamp | TIMESTAMP | NULL |

---

## DISEASE

| Table | Field Name | Description | Data type | Null Characteristic |
|-------|------------|-------------|-----------|---------------------|
| DISEASE | DIS_ID | Disease ID (PK) | UUID | NOT NULL |
| DISEASE | DIS_NAME | Disease name (unique) | VARCHAR | NOT NULL |
| DISEASE | DIS_DESCRIPTION | Disease description | TEXT | NULL |
| DISEASE | DIS_SEVERITY | Disease severity (DiseaseSeverity enum) | ENUM | NULL |
| DISEASE | DIS_CREATED_AT | Record creation timestamp | TIMESTAMP | NULL |

---

## AI_SCREENING

| Table | Field Name | Description | Data type | Null Characteristic |
|-------|------------|-------------|-----------|---------------------|
| AI_SCREENING | AIS_ID | Screening ID (PK) | UUID | NOT NULL |
| AI_SCREENING | PET_ID | Pet ID (FK → PET) | UUID | NOT NULL |
| AI_SCREENING | USR_ID | User who initiated screening (FK → USER) | UUID | NOT NULL |
| AI_SCREENING | CON_ID | Consultation ID (FK → CONSULTATION) | UUID | NULL |
| AI_SCREENING | AIS_PRIMARY_DISEASE_ID | Primary predicted disease (FK → DISEASE) | UUID | NOT NULL |
| AI_SCREENING | AIS_PRIMARY_CONFIDENCE | Confidence score (0-100) | DECIMAL | NULL |
| AI_SCREENING | AIS_TOP_PREDICTIONS | All prediction results (JSON array) | JSONB | NULL | 
| AI_SCREENING | AIS_MODEL_VERSION | TFLite model version used | VARCHAR | NULL |
| AI_SCREENING | AIS_INFERENCE_TIME_MS | Inference time in milliseconds | INT | NULL |
| AI_SCREENING | AIS_DEVICE | Device used for inference | VARCHAR | NULL |
| AI_SCREENING | AIS_STATUS | Screening status (AIScreeningStatus enum) | ENUM | NULL |
| AI_SCREENING | AIS_CREATED_AT | Record creation timestamp | TIMESTAMP | NULL |

---

## AI_SCREENING_IMAGE

| Table | Field Name | Description | Data type | Null Characteristic |
|-------|------------|-------------|-----------|---------------------|
| AI_SCREENING_IMAGE | ASI_ID | Image ID (PK) | UUID | NOT NULL |
| AI_SCREENING_IMAGE | AIS_ID | Screening ID (FK → AI_SCREENING) | UUID | NOT NULL |
| AI_SCREENING_IMAGE | ASI_IMAGE_URL | Image URL | TEXT | NOT NULL |
| AI_SCREENING_IMAGE | ASI_IMAGE_TYPE | Image type (AIImageType enum) | ENUM | NULL |
| AI_SCREENING_IMAGE | ASI_CREATED_AT | Record creation timestamp | TIMESTAMP | NULL |

---

## NOTIFICATION

| Table | Field Name | Description | Data type | Null Characteristic |
|-------|------------|-------------|-----------|---------------------|
| NOTIFICATION | NTF_ID | Notification ID (PK) | UUID | NOT NULL |
| NOTIFICATION | USR_ID | Recipient user ID (FK → USER) | UUID | NOT NULL |
| NOTIFICATION | NTF_TITLE | Notification title | VARCHAR | NULL |
| NOTIFICATION | NTF_MESSAGE | Notification body | TEXT | NULL |
| NOTIFICATION | NTF_TYPE | Notification type (NotificationType enum) | ENUM | NULL |
| NOTIFICATION | NTF_IS_READ | Read status | BOOLEAN | NULL |
| NOTIFICATION | NTF_REFERENCE_TABLE | Related table name | VARCHAR | NULL |
| NOTIFICATION | NTF_REFERENCE_ID | Related record ID | UUID | NULL |
| NOTIFICATION | NTF_CREATED_AT | Record creation timestamp | TIMESTAMP | NULL |
| NOTIFICATION | NTF_READ_AT | Read timestamp | TIMESTAMP | NULL |

---

## AUDIT_LOG

| Table | Field Name | Description | Data type | Null Characteristic |
|-------|------------|-------------|-----------|---------------------|
| AUDIT_LOG | ADL_ID | Log ID (PK) | UUID | NOT NULL |
| AUDIT_LOG | USR_ID | Acting user ID (FK → USER) | UUID | NOT NULL |
| AUDIT_LOG | ADL_ACTION | Action performed (AuditAction enum) | ENUM | NULL |
| AUDIT_LOG | ADL_MODULE | System module affected | VARCHAR | NULL |
| AUDIT_LOG | ADL_TABLE_NAME | Affected table name | VARCHAR | NULL |
| AUDIT_LOG | ADL_RECORD_ID | Affected record ID | UUID | NULL |
| AUDIT_LOG | ADL_DESCRIPTION | Human-readable description | TEXT | NULL |
| AUDIT_LOG | ADL_OLD_VALUES | Previous state (for updates) | JSONB | NULL |
| AUDIT_LOG | ADL_NEW_VALUES | New state (for creates/updates) | JSONB | NULL |
| AUDIT_LOG | ADL_IP_ADDRESS | Client IP address | VARCHAR | NULL |
| AUDIT_LOG | ADL_DEVICE | Client device info | VARCHAR | NULL |
| AUDIT_LOG | ADL_CREATED_AT | Action timestamp | TIMESTAMP | NULL |
