from datetime import date

from django.utils import timezone
from rest_framework import serializers

from vaccinations.models import VaccinationRecord, VaccinationRoute


class VaccinationResponseSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source='vac_id', read_only=True)
    consultation_id = serializers.SerializerMethodField()
    pet_id = serializers.UUIDField(source='pet_id.pet_id', read_only=True)
    pet_name = serializers.CharField(source='pet_id.pet_name', read_only=True)
    veterinarian = serializers.SerializerMethodField()
    name = serializers.CharField(source='vac_name', read_only=True)
    brand = serializers.CharField(source='vac_brand', read_only=True)
    batch_no = serializers.CharField(source='vac_batch_no', read_only=True)
    dose = serializers.CharField(source='vac_dose', read_only=True)
    route = serializers.CharField(source='vac_route', read_only=True)
    date_given = serializers.DateField(source='vac_date_given', read_only=True)
    next_due = serializers.DateField(source='vac_next_due', read_only=True)
    notes = serializers.CharField(source='vac_notes', read_only=True)
    source = serializers.CharField(source='vac_source', read_only=True)
    created_at = serializers.DateTimeField(source='vac_created_at', read_only=True)

    class Meta:
        model = VaccinationRecord
        fields = [
            'id', 'consultation_id', 'pet_id', 'pet_name', 'veterinarian',
            'name', 'brand', 'batch_no', 'dose', 'route',
            'date_given', 'next_due', 'notes', 'source', 'created_at',
        ]

    def get_consultation_id(self, obj):
        return str(obj.con_id.con_id) if obj.con_id_id else None

    def get_veterinarian(self, obj) -> str | None:
        if not obj.stf_id_id:
            return None
        user = obj.stf_id.usr_id
        return f'{user.usr_first_name} {user.usr_last_name}'.strip() or None


class VaccinationValidationMixin:
    def validate_date_given(self, value):
        if value > timezone.localdate():
            raise serializers.ValidationError('Vaccination date cannot be in the future.')
        return value

    def validate_next_due(self, value):
        if value is None:
            return value
        date_given = self.initial_data.get('date_given')
        if date_given:
            if isinstance(date_given, str):
                try:
                    date_given = date.fromisoformat(date_given)
                except ValueError:
                    return value
            if value < date_given:
                raise serializers.ValidationError(
                    'Next due date must be on or after the vaccination date.'
                )
        return value


class VaccinationCreateSerializer(VaccinationValidationMixin, serializers.ModelSerializer):
    pet_id = serializers.UUIDField(required=True)
    name = serializers.CharField(source='vac_name', max_length=255)
    brand = serializers.CharField(source='vac_brand', required=False, allow_null=True, allow_blank=True, max_length=255)
    batch_no = serializers.CharField(source='vac_batch_no', required=False, allow_null=True, allow_blank=True, max_length=100)
    dose = serializers.CharField(source='vac_dose', max_length=100)
    route = serializers.ChoiceField(choices=VaccinationRoute.choices, source='vac_route')
    date_given = serializers.DateField(source='vac_date_given')
    next_due = serializers.DateField(source='vac_next_due', required=False, allow_null=True)
    notes = serializers.CharField(source='vac_notes', required=False, allow_null=True, allow_blank=True)

    class Meta:
        model = VaccinationRecord
        fields = [
            'pet_id', 'name', 'brand', 'batch_no', 'dose', 'route',
            'date_given', 'next_due', 'notes',
        ]


class VaccinationUpdateSerializer(VaccinationValidationMixin, serializers.ModelSerializer):
    name = serializers.CharField(source='vac_name', max_length=255)
    brand = serializers.CharField(source='vac_brand', required=False, allow_null=True, allow_blank=True, max_length=255)
    batch_no = serializers.CharField(source='vac_batch_no', required=False, allow_null=True, allow_blank=True, max_length=100)
    dose = serializers.CharField(source='vac_dose', max_length=100)
    route = serializers.ChoiceField(choices=VaccinationRoute.choices, source='vac_route')
    date_given = serializers.DateField(source='vac_date_given')
    next_due = serializers.DateField(source='vac_next_due', required=False, allow_null=True)
    notes = serializers.CharField(source='vac_notes', required=False, allow_null=True, allow_blank=True)

    class Meta:
        model = VaccinationRecord
        fields = [
            'name', 'brand', 'batch_no', 'dose', 'route',
            'date_given', 'next_due', 'notes',
        ]

    def validate_next_due(self, value):
        if value is None:
            return value
        date_given = self.initial_data.get('date_given')
        if date_given is None and self.instance is not None:
            date_given = self.instance.vac_date_given
        if date_given:
            if isinstance(date_given, str):
                try:
                    date_given = date.fromisoformat(date_given)
                except ValueError:
                    return value
            if value < date_given:
                raise serializers.ValidationError(
                    'Next due date must be on or after the vaccination date.'
                )
        return value
