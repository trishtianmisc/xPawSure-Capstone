import uuid as uuid_lib

from django.db import transaction

from audit_log.models import AuditAction
from audit_log.services import AuditService
from owners.models import OwnerProfile
from pets.models import Pet
from vaccinations.models import VaccinationRecord, VaccinationSource


class VaccinationImmutableError(Exception):
    """Raised when a vet-issued vaccination record is modified by an owner."""


class VaccinationService:

    @staticmethod
    def list_for_owner(owner_profile: OwnerProfile, pet_id: uuid_lib.UUID | None = None) -> list[VaccinationRecord]:
        if pet_id is not None and not Pet.objects.filter(pet_id=pet_id, own_id=owner_profile).exists():
            return []

        queryset = VaccinationRecord.objects.filter(
            pet_id__own_id=owner_profile,
        ).select_related('pet_id', 'con_id', 'stf_id__usr_id')

        if pet_id is not None:
            queryset = queryset.filter(pet_id=pet_id)

        return list(queryset)

    @staticmethod
    def get_for_owner(vac_id, owner_profile: OwnerProfile) -> VaccinationRecord | None:
        return VaccinationRecord.objects.filter(
            vac_id=vac_id,
            pet_id__own_id=owner_profile,
        ).select_related('pet_id', 'con_id', 'stf_id__usr_id').first()

    @staticmethod
    @transaction.atomic
    def create_for_owner(
        pet: Pet,
        validated_data: dict,
        user_id: str = '',
        ip_address: str = '',
    ) -> VaccinationRecord:
        vaccination = VaccinationRecord.objects.create(
            pet_id=pet,
            con_id=None,
            stf_id=None,
            vac_name=validated_data.get('vac_name'),
            vac_brand=validated_data.get('vac_brand') or None,
            vac_batch_no=validated_data.get('vac_batch_no') or None,
            vac_dose=validated_data.get('vac_dose'),
            vac_route=validated_data.get('vac_route'),
            vac_date_given=validated_data.get('vac_date_given'),
            vac_next_due=validated_data.get('vac_next_due') or None,
            vac_notes=validated_data.get('vac_notes') or None,
            vac_source=VaccinationSource.OWNER,
        )

        AuditService.log(
            user_id=user_id,
            action=AuditAction.CREATE,
            module='vaccinations',
            table_name='VACCINATION_RECORD',
            record_id=str(vaccination.vac_id),
            description=f'Owner reported vaccination: {vaccination.vac_name} for {pet.pet_name}',
            new_values={
                'vac_name': vaccination.vac_name,
                'vac_dose': vaccination.vac_dose,
                'vac_route': vaccination.vac_route,
                'vac_date_given': str(vaccination.vac_date_given),
                'vac_next_due': str(vaccination.vac_next_due) if vaccination.vac_next_due else None,
            },
            ip_address=ip_address,
        )

        return vaccination

    _UPDATABLE_FIELDS = (
        'vac_name', 'vac_brand', 'vac_batch_no', 'vac_dose',
        'vac_route', 'vac_date_given', 'vac_next_due', 'vac_notes',
    )

    @staticmethod
    @transaction.atomic
    def update_for_owner(
        vaccination: VaccinationRecord,
        validated_data: dict,
        user_id: str = '',
        ip_address: str = '',
    ) -> VaccinationRecord:
        if vaccination.vac_source != VaccinationSource.OWNER:
            raise VaccinationImmutableError('Vet-issued records cannot be modified.')

        old_values = {}
        for key in VaccinationService._UPDATABLE_FIELDS:
            if key in validated_data:
                old_values[key] = str(getattr(vaccination, key)) if getattr(vaccination, key) is not None else None

        new_values = {}
        for key in VaccinationService._UPDATABLE_FIELDS:
            if key in validated_data:
                value = validated_data[key]
                if isinstance(value, str) and value == '':
                    value = None
                setattr(vaccination, key, value)
                new_values[key] = str(value) if value is not None else None

        vaccination.save()

        AuditService.log(
            user_id=user_id,
            action=AuditAction.UPDATE,
            module='vaccinations',
            table_name='VACCINATION_RECORD',
            record_id=str(vaccination.vac_id),
            description=f'Owner updated vaccination: {vaccination.vac_name}',
            old_values=old_values or None,
            new_values=new_values or None,
            ip_address=ip_address,
        )

        return vaccination

    @staticmethod
    @transaction.atomic
    def delete_for_owner(
        vaccination: VaccinationRecord,
        user_id: str = '',
        ip_address: str = '',
    ) -> None:
        if vaccination.vac_source != VaccinationSource.OWNER:
            raise VaccinationImmutableError('Vet-issued records cannot be modified.')

        vac_name = vaccination.vac_name
        vac_id = str(vaccination.vac_id)
        vaccination.delete()

        AuditService.log(
            user_id=user_id,
            action=AuditAction.DELETE,
            module='vaccinations',
            table_name='VACCINATION_RECORD',
            record_id=vac_id,
            description=f'Owner deleted vaccination: {vac_name}',
            ip_address=ip_address,
        )
