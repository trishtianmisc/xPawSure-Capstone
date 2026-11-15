import unicodedata
import uuid as uuid_lib

from django.db import transaction
from django.db.models import Exists, OuterRef, Q

from audit_log.models import AuditAction
from audit_log.services import AuditService
from owners.models import OwnerProfile
from pets.models import Pet
from vaccinations.models import VaccinationRecord, VaccinationSource


class VaccinationImmutableError(Exception):
    """Raised when a vet-issued vaccination record is modified by an owner."""


class InvalidVaccinationSeriesError(Exception):
    """Raised when a dose is linked to a different pet's vaccine series."""


class VaccinationDateBeforePreviousDoseError(Exception):
    """Raised when a new dose predates the latest dose in its series."""


class VaccinationService:

    @staticmethod
    def annotate_latest_in_series(queryset):
        newer = VaccinationRecord.objects.filter(
            pet_id_id=OuterRef('pet_id_id'),
            vac_series_id=OuterRef('vac_series_id'),
        ).filter(
            Q(vac_date_given__gt=OuterRef('vac_date_given'))
            | Q(
                vac_date_given=OuterRef('vac_date_given'),
                vac_created_at__gt=OuterRef('vac_created_at'),
            )
            | Q(
                vac_date_given=OuterRef('vac_date_given'),
                vac_created_at=OuterRef('vac_created_at'),
                vac_id__gt=OuterRef('vac_id'),
            )
        )
        return queryset.annotate(is_latest_in_series=~Exists(newer))

    @staticmethod
    def _normalized_name(name: str) -> str:
        return ' '.join(unicodedata.normalize('NFKC', name).casefold().split())

    @staticmethod
    def latest_by_series(vaccinations: list[VaccinationRecord]) -> list[VaccinationRecord]:
        latest: dict[tuple[object, object], VaccinationRecord] = {}
        for vaccination in vaccinations:
            key = (vaccination.pet_id_id, vaccination.vac_series_id)
            current = latest.get(key)
            rank = (vaccination.vac_date_given, vaccination.vac_created_at, str(vaccination.vac_id))
            current_rank = (
                (current.vac_date_given, current.vac_created_at, str(current.vac_id))
                if current else None
            )
            if current_rank is None or rank > current_rank:
                latest[key] = vaccination

        latest_ids = {record.vac_id for record in latest.values()}
        for vaccination in vaccinations:
            vaccination.is_latest_in_series = vaccination.vac_id in latest_ids
        return list(latest.values())

    @staticmethod
    def latest_for_pet(pet: Pet) -> list[VaccinationRecord]:
        records = list(VaccinationRecord.objects.filter(pet_id=pet))
        return VaccinationService.latest_by_series(records)

    @staticmethod
    def _resolve_series_id(pet: Pet, validated_data: dict) -> uuid_lib.UUID:
        requested_series_id = validated_data.get('vac_series_id')
        if requested_series_id is not None:
            if not VaccinationRecord.objects.filter(
                pet_id=pet,
                vac_series_id=requested_series_id,
            ).exists():
                raise InvalidVaccinationSeriesError('Vaccine series was not found for this pet.')
            return requested_series_id

        normalized_name = VaccinationService._normalized_name(validated_data['vac_name'])
        records = VaccinationRecord.objects.filter(pet_id=pet).order_by(
            '-vac_date_given', '-vac_created_at', '-vac_id',
        )
        for record in records:
            if VaccinationService._normalized_name(record.vac_name) == normalized_name:
                return record.vac_series_id
        return uuid_lib.uuid4()

    @staticmethod
    def _validate_new_dose_date(pet: Pet, series_id: uuid_lib.UUID, date_given) -> None:
        latest_date = VaccinationRecord.objects.filter(
            pet_id=pet,
            vac_series_id=series_id,
        ).order_by('-vac_date_given').values_list('vac_date_given', flat=True).first()
        if latest_date is not None and date_given < latest_date:
            raise VaccinationDateBeforePreviousDoseError(
                'Date given cannot be before the latest dose in this series.'
            )

    @staticmethod
    def _audit_values(vaccination: VaccinationRecord) -> dict:
        return {
            'pet_id': str(vaccination.pet_id_id),
            'vac_name': vaccination.vac_name,
            'vac_brand': vaccination.vac_brand,
            'vac_batch_no': vaccination.vac_batch_no,
            'vac_veterinarian_name': vaccination.vac_veterinarian_name,
            'vac_series_id': str(vaccination.vac_series_id),
            'vac_dose': vaccination.vac_dose,
            'vac_route': vaccination.vac_route,
            'vac_date_given': str(vaccination.vac_date_given),
            'vac_next_due': str(vaccination.vac_next_due) if vaccination.vac_next_due else None,
            'vac_notes': vaccination.vac_notes,
            'vac_source': vaccination.vac_source,
        }

    @staticmethod
    def list_for_owner(owner_profile: OwnerProfile, pet_id: uuid_lib.UUID | None = None) -> list[VaccinationRecord]:
        if pet_id is not None and not Pet.objects.filter(pet_id=pet_id, own_id=owner_profile).exists():
            return []

        queryset = VaccinationRecord.objects.filter(
            pet_id__own_id=owner_profile,
        ).select_related('pet_id', 'con_id', 'stf_id__usr_id')

        if pet_id is not None:
            queryset = queryset.filter(pet_id=pet_id)

        vaccinations = list(queryset)
        VaccinationService.latest_by_series(vaccinations)
        return vaccinations

    @staticmethod
    def get_for_owner(vac_id, owner_profile: OwnerProfile) -> VaccinationRecord | None:
        vaccination = VaccinationRecord.objects.filter(
            vac_id=vac_id,
            pet_id__own_id=owner_profile,
        ).select_related('pet_id', 'con_id', 'stf_id__usr_id').first()
        if vaccination is not None:
            records = list(VaccinationRecord.objects.filter(
                pet_id_id=vaccination.pet_id_id,
                vac_series_id=vaccination.vac_series_id,
            ))
            VaccinationService.latest_by_series(records)
            vaccination.is_latest_in_series = next(
                record.is_latest_in_series for record in records
                if record.vac_id == vaccination.vac_id
            )
        return vaccination

    @staticmethod
    @transaction.atomic
    def create_for_owner(
        pet: Pet,
        validated_data: dict,
        user_id: str = '',
        ip_address: str = '',
    ) -> VaccinationRecord:
        series_id = VaccinationService._resolve_series_id(pet, validated_data)
        VaccinationService._validate_new_dose_date(
            pet,
            series_id,
            validated_data['vac_date_given'],
        )
        vaccination = VaccinationRecord.objects.create(
            pet_id=pet,
            con_id=None,
            stf_id=None,
            vac_name=validated_data.get('vac_name'),
            vac_brand=validated_data.get('vac_brand') or None,
            vac_batch_no=validated_data.get('vac_batch_no') or None,
            vac_veterinarian_name=validated_data.get('vac_veterinarian_name') or None,
            vac_series_id=series_id,
            vac_dose=validated_data.get('vac_dose') or None,
            vac_route=validated_data.get('vac_route') or None,
            vac_date_given=validated_data.get('vac_date_given'),
            vac_next_due=validated_data.get('vac_next_due') or None,
            vac_notes=validated_data.get('vac_notes') or None,
            vac_source=VaccinationSource.OWNER,
        )
        vaccination.is_latest_in_series = True

        AuditService.log(
            user_id=user_id,
            action=AuditAction.CREATE,
            module='vaccinations',
            table_name='VACCINATION_RECORD',
            record_id=str(vaccination.vac_id),
            description=f'Owner reported vaccination: {vaccination.vac_name} for {pet.pet_name}',
            new_values=VaccinationService._audit_values(vaccination),
            ip_address=ip_address,
        )

        return vaccination

    _UPDATABLE_FIELDS = (
        'vac_name', 'vac_brand', 'vac_batch_no', 'vac_veterinarian_name', 'vac_dose',
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

        old_values = VaccinationService._audit_values(vaccination)
        for key in VaccinationService._UPDATABLE_FIELDS:
            if key in validated_data:
                value = validated_data[key]
                if isinstance(value, str) and value == '':
                    value = None
                setattr(vaccination, key, value)

        vaccination.save()
        records = list(VaccinationRecord.objects.filter(
            pet_id_id=vaccination.pet_id_id,
            vac_series_id=vaccination.vac_series_id,
        ))
        VaccinationService.latest_by_series(records)
        vaccination.is_latest_in_series = next(
            record.is_latest_in_series for record in records
            if record.vac_id == vaccination.vac_id
        )

        AuditService.log(
            user_id=user_id,
            action=AuditAction.UPDATE,
            module='vaccinations',
            table_name='VACCINATION_RECORD',
            record_id=str(vaccination.vac_id),
            description=f'Owner updated vaccination: {vaccination.vac_name}',
            old_values=old_values,
            new_values=VaccinationService._audit_values(vaccination),
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

        vac_id = str(vaccination.vac_id)
        old_values = VaccinationService._audit_values(vaccination)
        vaccination.delete()

        AuditService.log(
            user_id=user_id,
            action=AuditAction.DELETE,
            module='vaccinations',
            table_name='VACCINATION_RECORD',
            record_id=vac_id,
            description=f'Owner deleted vaccination: {old_values["vac_name"]}',
            old_values=old_values,
            ip_address=ip_address,
        )
