import uuid as uuid_lib
from datetime import datetime, time

from django.db import transaction
from django.utils import timezone

from appointments.models import Appointment, AppointmentStatus, AppointmentType
from appointments.services import CLINIC_TIMEZONE
from audit_log.models import AuditAction
from audit_log.services import AuditService
from consultations.models import Consultation
from owners.models import OwnerProfile
from pets.models import Pet


class ConsultationStateError(Exception):
    """Raised when a consultation cannot be saved for the current appointment state."""


class ConsultationValidationError(Exception):
    """Raised when consultation data fails business validation."""


def _iso_date(value):
    return value.isoformat() if value else None


class ConsultationService:

    @staticmethod
    def _resolve_follow_up(appointment, required: bool, target_date):
        if not required:
            return False, None

        if target_date is None:
            raise ConsultationValidationError(
                'Preferred follow-up date is required when follow-up is requested.',
            )

        today = timezone.localdate(timezone=CLINIC_TIMEZONE)
        if target_date < today:
            raise ConsultationValidationError(
                'Preferred follow-up date cannot be in the past.',
            )

        appointment_date = timezone.localtime(
            appointment.apt_scheduled_at, CLINIC_TIMEZONE,
        ).date()
        if target_date <= appointment_date:
            raise ConsultationValidationError(
                'Preferred follow-up date must be after the appointment date.',
            )

        return True, target_date

    @staticmethod
    def _follow_up_scheduled_at(target_date):
        return timezone.make_aware(
            datetime.combine(target_date, time.min),
            CLINIC_TIMEZONE,
        )

    @staticmethod
    def _sync_follow_up_appointment(
        consultation, source_appointment, user_id, ip_address='',
    ):
        linked = Appointment.objects.select_for_update().filter(
            apt_source_consultation=consultation,
        ).first()

        if not consultation.con_follow_up_required:
            if linked is None or linked.apt_deleted_at is not None:
                return
            if linked.apt_status != AppointmentStatus.REVIEW:
                raise ConsultationValidationError(
                    'The follow-up appointment is already being processed and '
                    'cannot be changed.',
                )

            linked.apt_deleted_at = timezone.now()
            linked.save()
            AuditService.log(
                user_id=user_id,
                action=AuditAction.DELETE,
                module='appointments',
                table_name='APPOINTMENT',
                record_id=str(linked.apt_id),
                description=(
                    'Removed follow-up appointment because the veterinarian '
                    'cleared the recommendation.'
                ),
                old_values={
                    'apt_status': AppointmentStatus.REVIEW,
                    'apt_scheduled_at': linked.apt_scheduled_at.isoformat(),
                },
                ip_address=ip_address,
            )
            return

        scheduled_at = ConsultationService._follow_up_scheduled_at(
            consultation.con_follow_up_target_date,
        )
        reason = f'Follow-up consultation: {consultation.con_diagnosis}'

        if linked is not None and linked.apt_deleted_at is None:
            if linked.apt_status != AppointmentStatus.REVIEW:
                raise ConsultationValidationError(
                    'The follow-up appointment is already being processed and '
                    'cannot be changed.',
                )

            old_values = {
                'apt_scheduled_at': linked.apt_scheduled_at.isoformat(),
                'apt_reason': linked.apt_reason,
                'apt_status': linked.apt_status,
            }
            linked.apt_scheduled_at = scheduled_at
            linked.apt_reason = reason
            linked.apt_status = AppointmentStatus.REVIEW
            linked.save()
            if (
                old_values['apt_scheduled_at'] != scheduled_at.isoformat()
                or old_values['apt_reason'] != reason
            ):
                AuditService.log(
                    user_id=user_id,
                    action=AuditAction.UPDATE,
                    module='appointments',
                    table_name='APPOINTMENT',
                    record_id=str(linked.apt_id),
                    description='Updated follow-up appointment from consultation.',
                    old_values=old_values,
                    new_values={
                        'apt_scheduled_at': scheduled_at.isoformat(),
                        'apt_reason': reason,
                        'apt_status': AppointmentStatus.REVIEW,
                    },
                    ip_address=ip_address,
                )
            return

        if source_appointment.apt_status != AppointmentStatus.COMPLETED:
            return

        if linked is not None:
            appointment = linked
            appointment.apt_scheduled_at = scheduled_at
            appointment.apt_reason = reason
            appointment.apt_status = AppointmentStatus.REVIEW
            appointment.apt_type = AppointmentType.FOLLOW_UP
            appointment.apt_deleted_at = None
            appointment.save()
        else:
            appointment = Appointment.objects.create(
                pet_id_id=source_appointment.pet_id_id,
                cln_id_id=source_appointment.cln_id_id,
                stf_id_id=source_appointment.stf_id_id,
                apt_type=AppointmentType.FOLLOW_UP,
                apt_status=AppointmentStatus.REVIEW,
                apt_scheduled_at=scheduled_at,
                apt_reason=reason,
                apt_created_by_id=consultation.stf_id.usr_id_id,
                apt_screening_id=source_appointment.apt_screening_id,
                apt_source_consultation=consultation,
            )

        AuditService.log(
            user_id=user_id,
            action=AuditAction.CREATE,
            module='appointments',
            table_name='APPOINTMENT',
            record_id=str(appointment.apt_id),
            description='Created follow-up appointment from consultation.',
            new_values={
                'pet_id': str(appointment.pet_id_id),
                'vet_id': str(appointment.stf_id_id),
                'apt_scheduled_at': appointment.apt_scheduled_at.isoformat(),
                'apt_type': AppointmentType.FOLLOW_UP,
                'apt_status': AppointmentStatus.REVIEW,
            },
            ip_address=ip_address,
        )

    @staticmethod
    @transaction.atomic
    def sync_follow_up_for_completed_appointment(
        appointment, user_id, ip_address='',
    ):
        if appointment.apt_status != AppointmentStatus.COMPLETED:
            return

        consultation = Consultation.objects.select_related('stf_id').filter(
            apt_id=appointment,
        ).first()
        if consultation is None:
            return

        already_processed = Appointment.objects.filter(
            apt_source_consultation=consultation,
            apt_deleted_at__isnull=True,
        ).exclude(
            apt_status=AppointmentStatus.REVIEW,
        ).exists()
        if already_processed:
            return

        ConsultationService._sync_follow_up_appointment(
            consultation=consultation,
            source_appointment=appointment,
            user_id=user_id,
            ip_address=ip_address,
        )

    @staticmethod
    def list_for_owner(owner_profile: OwnerProfile, pet_id: uuid_lib.UUID | None = None) -> list[Consultation]:
        if pet_id is not None and not Pet.objects.filter(pet_id=pet_id, own_id=owner_profile).exists():
            return []

        queryset = Consultation.objects.filter(
            apt_id__pet_id__own_id=owner_profile,
        ).select_related('apt_id__pet_id', 'stf_id__usr_id')

        if pet_id is not None:
            queryset = queryset.filter(apt_id__pet_id=pet_id)

        return list(queryset)

    @staticmethod
    def get_for_owner(con_id, owner_profile: OwnerProfile) -> Consultation | None:
        return Consultation.objects.filter(
            con_id=con_id,
            apt_id__pet_id__own_id=owner_profile,
        ).select_related('apt_id__pet_id', 'stf_id__usr_id').first()

    @staticmethod
    @transaction.atomic
    def create_for_vet(appointment, validated_data: dict, staff, user_id: str, ip_address: str = '') -> Consultation:
        if appointment.stf_id_id != staff.stf_id:
            raise PermissionError('This appointment is not assigned to you.')

        if appointment.apt_status != AppointmentStatus.IN_PROGRESS:
            raise ConsultationStateError(
                'Consultations can only be saved while the appointment is in progress.',
            )

        if Consultation.objects.filter(apt_id=appointment).exists():
            raise ConsultationStateError('A consultation already exists for this appointment.')

        follow_up_required, follow_up_target_date = ConsultationService._resolve_follow_up(
            appointment,
            validated_data.get('follow_up_required', False),
            validated_data.get('follow_up_target_date'),
        )

        consultation = Consultation.objects.create(
            apt_id=appointment,
            stf_id=staff,
            con_chief_complaint=validated_data.get('chief_complaint') or None,
            con_objective=validated_data.get('objective') or None,
            con_diagnosis=validated_data['diagnosis'],
            con_specific_disease=(validated_data.get('specific_disease') or '').strip() or None,
            con_notes=validated_data.get('notes') or None,
            con_follow_up_required=follow_up_required,
            con_follow_up_target_date=follow_up_target_date,
        )

        ConsultationService._sync_follow_up_appointment(
            consultation=consultation,
            source_appointment=appointment,
            user_id=user_id,
            ip_address=ip_address,
        )

        AuditService.log(
            user_id=user_id,
            action=AuditAction.CREATE,
            module='consultations',
            table_name='CONSULTATION',
            record_id=str(consultation.con_id),
            description=f'Veterinarian created consultation for appointment {appointment.apt_id}',
            new_values={
                'con_diagnosis': consultation.con_diagnosis,
                'con_specific_disease': consultation.con_specific_disease,
                'con_follow_up_required': consultation.con_follow_up_required,
                'con_follow_up_target_date': _iso_date(consultation.con_follow_up_target_date),
            },
            ip_address=ip_address,
        )

        return consultation

    @staticmethod
    @transaction.atomic
    def update_for_vet(consultation: Consultation, validated_data: dict, staff, user_id: str, ip_address: str = '') -> Consultation:
        appointment = consultation.apt_id

        if appointment.stf_id_id != staff.stf_id:
            raise PermissionError('This appointment is not assigned to you.')

        if appointment.apt_status != AppointmentStatus.IN_PROGRESS:
            raise ConsultationStateError(
                'Consultations can only be edited while the appointment is in progress.',
            )

        follow_up_required, follow_up_target_date = ConsultationService._resolve_follow_up(
            appointment,
            validated_data.get('follow_up_required', consultation.con_follow_up_required),
            validated_data.get('follow_up_target_date', consultation.con_follow_up_target_date),
        )

        old_values = {
            'con_diagnosis': consultation.con_diagnosis,
            'con_specific_disease': consultation.con_specific_disease,
            'con_follow_up_required': consultation.con_follow_up_required,
            'con_follow_up_target_date': _iso_date(consultation.con_follow_up_target_date),
        }
        follow_up_changed = (
            follow_up_required != consultation.con_follow_up_required
            or follow_up_target_date != consultation.con_follow_up_target_date
        )
        consultation.con_chief_complaint = validated_data.get('chief_complaint') or None
        consultation.con_objective = validated_data.get('objective') or None
        consultation.con_diagnosis = validated_data['diagnosis']
        consultation.con_specific_disease = (validated_data.get('specific_disease') or '').strip() or None
        consultation.con_notes = validated_data.get('notes') or None
        consultation.con_follow_up_required = follow_up_required
        consultation.con_follow_up_target_date = follow_up_target_date
        consultation.save()

        if follow_up_changed:
            ConsultationService._sync_follow_up_appointment(
                consultation=consultation,
                source_appointment=appointment,
                user_id=user_id,
                ip_address=ip_address,
            )

        AuditService.log(
            user_id=user_id,
            action=AuditAction.UPDATE,
            module='consultations',
            table_name='CONSULTATION',
            record_id=str(consultation.con_id),
            description='Veterinarian updated consultation',
            old_values=old_values,
            new_values={
                'con_diagnosis': consultation.con_diagnosis,
                'con_specific_disease': consultation.con_specific_disease,
                'con_follow_up_required': consultation.con_follow_up_required,
                'con_follow_up_target_date': _iso_date(consultation.con_follow_up_target_date),
            },
            ip_address=ip_address,
        )

        return consultation

