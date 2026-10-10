import uuid as uuid_lib

from django.db import transaction

from appointments.models import AppointmentStatus
from audit_log.models import AuditAction
from audit_log.services import AuditService
from owners.models import OwnerProfile
from pets.models import Pet
from prescriptions.models import Prescription, PrescriptionItem


class PrescriptionStateError(Exception):
    """Raised when a prescription cannot be saved for the current appointment state."""


class PrescriptionService:

    @staticmethod
    def list_for_owner(owner_profile: OwnerProfile, pet_id: uuid_lib.UUID | None = None) -> list[Prescription]:
        if pet_id is not None and not Pet.objects.filter(pet_id=pet_id, own_id=owner_profile).exists():
            return []

        queryset = Prescription.objects.filter(
            con_id__apt_id__pet_id__own_id=owner_profile,
        ).select_related(
            'con_id__apt_id__pet_id', 'stf_id__usr_id',
        ).prefetch_related('items')

        if pet_id is not None:
            queryset = queryset.filter(con_id__apt_id__pet_id=pet_id)

        return list(queryset)

    @staticmethod
    def get_for_owner(prs_id, owner_profile: OwnerProfile) -> Prescription | None:
        return Prescription.objects.filter(
            prs_id=prs_id,
            con_id__apt_id__pet_id__own_id=owner_profile,
        ).select_related(
            'con_id__apt_id__pet_id', 'stf_id__usr_id',
        ).prefetch_related('items').first()

    @staticmethod
    @transaction.atomic
    def save_for_vet(consultation, validated_data: dict, staff, user_id: str, ip_address: str = '') -> tuple:
        appointment = consultation.apt_id

        if appointment.stf_id_id != staff.stf_id:
            raise PermissionError('This appointment is not assigned to you.')

        if appointment.apt_status != AppointmentStatus.IN_PROGRESS:
            raise PrescriptionStateError(
                'Prescriptions can only be saved while the appointment is in progress.',
            )

        instructions = validated_data.get('instructions') or None
        prescription = Prescription.objects.select_for_update().filter(
            con_id=consultation,
        ).first()
        created = prescription is None

        if created:
            prescription = Prescription.objects.create(
                con_id=consultation,
                stf_id=staff,
                prs_instructions=instructions,
            )
        else:
            prescription.prs_instructions = instructions
            prescription.save(update_fields=['prs_instructions', 'prs_updated_at'])
            prescription.items.all().delete()

        for item in validated_data['items']:
            PrescriptionItem.objects.create(
                prs_id=prescription,
                pri_medicine_name=item['medicine_name'],
                pri_generic_name=item.get('generic_name') or None,
                pri_dosage=item['dosage'],
                pri_frequency=item['frequency'],
                pri_duration=item['duration'],
                pri_route=item['route'],
                pri_quantity=item.get('quantity'),
                pri_notes=item.get('notes') or None,
            )

        AuditService.log(
            user_id=user_id,
            action=AuditAction.CREATE if created else AuditAction.UPDATE,
            module='prescriptions',
            table_name='PRESCRIPTION',
            record_id=str(prescription.prs_id),
            description=(
                'Veterinarian created prescription'
                if created else
                'Veterinarian updated prescription'
            ),
            new_values={'items': len(validated_data['items'])},
            ip_address=ip_address,
        )

        return prescription, created
