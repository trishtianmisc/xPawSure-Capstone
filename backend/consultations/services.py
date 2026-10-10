import uuid as uuid_lib

from django.db import transaction

from appointments.models import AppointmentStatus
from audit_log.models import AuditAction
from audit_log.services import AuditService
from consultations.models import Consultation
from owners.models import OwnerProfile
from pets.models import Pet


class ConsultationStateError(Exception):
    """Raised when a consultation cannot be saved for the current appointment state."""


class ConsultationService:

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

        consultation = Consultation.objects.create(
            apt_id=appointment,
            stf_id=staff,
            con_chief_complaint=validated_data.get('chief_complaint') or None,
            con_objective=validated_data.get('objective') or None,
            con_diagnosis=validated_data['diagnosis'],
            con_notes=validated_data.get('notes') or None,
        )

        AuditService.log(
            user_id=user_id,
            action=AuditAction.CREATE,
            module='consultations',
            table_name='CONSULTATION',
            record_id=str(consultation.con_id),
            description=f'Veterinarian created consultation for appointment {appointment.apt_id}',
            new_values={'con_diagnosis': consultation.con_diagnosis},
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

        old_values = {'con_diagnosis': consultation.con_diagnosis}
        consultation.con_chief_complaint = validated_data.get('chief_complaint') or None
        consultation.con_objective = validated_data.get('objective') or None
        consultation.con_diagnosis = validated_data['diagnosis']
        consultation.con_notes = validated_data.get('notes') or None
        consultation.save()

        AuditService.log(
            user_id=user_id,
            action=AuditAction.UPDATE,
            module='consultations',
            table_name='CONSULTATION',
            record_id=str(consultation.con_id),
            description='Veterinarian updated consultation',
            old_values=old_values,
            new_values={'con_diagnosis': consultation.con_diagnosis},
            ip_address=ip_address,
        )

        return consultation

