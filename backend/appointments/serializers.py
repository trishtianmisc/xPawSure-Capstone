from rest_framework import serializers

from appointments.models import Appointment, AppointmentType, VetSlot


class VetSlotSerializer(serializers.ModelSerializer):
    vet_name = serializers.SerializerMethodField()

    class Meta:
        model = VetSlot
        fields = [
            'vsl_id', 'stf_id', 'cln_id', 'vsl_date',
            'vsl_start_time', 'vsl_end_time', 'vsl_appointment',
            'vet_name', 'vsl_created_at',
        ]
        read_only_fields = ['vsl_id', 'vsl_created_at']

    def get_vet_name(self, obj):
        if obj.stf_id and obj.stf_id.usr_id:
            return f'{obj.stf_id.usr_id.usr_first_name} {obj.stf_id.usr_id.usr_last_name}'
        return None


class AppointmentListSerializer(serializers.ModelSerializer):
    pet_name = serializers.CharField(source='pet_id.pet_name', read_only=True)
    pet_species = serializers.SerializerMethodField()
    vet_name = serializers.SerializerMethodField()
    owner_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Appointment
        fields = [
            'apt_id', 'pet_id', 'pet_name', 'pet_species',
            'cln_id', 'stf_id', 'vet_name', 'owner_name',
            'apt_type', 'apt_status', 'apt_scheduled_at',
            'apt_reason', 'created_by_name',
            'apt_checked_in_at', 'apt_completed_at',
            'apt_cancelled_at', 'apt_created_at',
        ]

    def get_pet_species(self, obj):
        if obj.pet_id and obj.pet_id.brd_id:
            return obj.pet_id.brd_id.brd_name
        return None

    def get_vet_name(self, obj):
        if obj.stf_id and obj.stf_id.usr_id:
            return f'{obj.stf_id.usr_id.usr_first_name} {obj.stf_id.usr_id.usr_last_name}'
        return None

    def get_owner_name(self, obj):
        if obj.pet_id and obj.pet_id.own_id and obj.pet_id.own_id.usr_id:
            u = obj.pet_id.own_id.usr_id
            return f'{u.usr_first_name} {u.usr_last_name}'
        return None

    def get_created_by_name(self, obj):
        if obj.apt_created_by:
            u = obj.apt_created_by
            return f'{u.usr_first_name} {u.usr_last_name}'
        return None


class AppointmentDetailSerializer(serializers.ModelSerializer):
    pet_name = serializers.CharField(source='pet_id.pet_name', read_only=True)
    pet_breed = serializers.SerializerMethodField()
    pet_sex = serializers.CharField(source='pet_id.pet_sex', read_only=True)
    owner_name = serializers.SerializerMethodField()
    owner_phone = serializers.SerializerMethodField()
    vet_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    clinic_name = serializers.CharField(source='cln_id.cln_name', read_only=True)

    class Meta:
        model = Appointment
        fields = [
            'apt_id', 'pet_id', 'pet_name', 'pet_breed', 'pet_sex',
            'cln_id', 'clinic_name', 'stf_id', 'vet_name',
            'owner_name', 'owner_phone',
            'apt_type', 'apt_status', 'apt_scheduled_at',
            'apt_reason', 'created_by_name',
            'apt_checked_in_at', 'apt_completed_at',
            'apt_cancelled_at', 'apt_cancellation_reason',
            'apt_created_at', 'apt_updated_at',
        ]

    def get_pet_breed(self, obj):
        if obj.pet_id and obj.pet_id.brd_id:
            return obj.pet_id.brd_id.brd_name
        return None

    def get_owner_name(self, obj):
        if obj.pet_id and obj.pet_id.own_id and obj.pet_id.own_id.usr_id:
            u = obj.pet_id.own_id.usr_id
            return f'{u.usr_first_name} {u.usr_last_name}'
        return None

    def get_owner_phone(self, obj):
        if obj.pet_id and obj.pet_id.own_id and obj.pet_id.own_id.usr_id:
            return obj.pet_id.own_id.usr_id.usr_phone
        return None

    def get_vet_name(self, obj):
        if obj.stf_id and obj.stf_id.usr_id:
            return f'{obj.stf_id.usr_id.usr_first_name} {obj.stf_id.usr_id.usr_last_name}'
        return None

    def get_created_by_name(self, obj):
        if obj.apt_created_by:
            u = obj.apt_created_by
            return f'{u.usr_first_name} {u.usr_last_name}'
        return None


class CreateAppointmentSerializer(serializers.Serializer):
    pet_id = serializers.UUIDField()
    slot_id = serializers.UUIDField()
    apt_type = serializers.ChoiceField(choices=AppointmentType.choices)
    reason = serializers.CharField(required=False, allow_blank=True, default='')


class ScheduleAppointmentSerializer(serializers.Serializer):
    apt_id = serializers.CharField()
    pet_name = serializers.CharField()
    owner_name = serializers.CharField()
    apt_type = serializers.CharField()
    apt_status = serializers.CharField()


class ScheduleSlotSerializer(serializers.Serializer):
    vsl_id = serializers.CharField()
    vsl_start_time = serializers.CharField()
    vsl_end_time = serializers.CharField()
    status = serializers.CharField()
    appointment = ScheduleAppointmentSerializer(allow_null=True)


class ScheduleDaySerializer(serializers.Serializer):
    date = serializers.CharField()
    is_working = serializers.BooleanField()
    slots = ScheduleSlotSerializer(many=True)


class ScheduleVetSerializer(serializers.Serializer):
    stf_id = serializers.CharField()
    full_name = serializers.CharField()
    days = ScheduleDaySerializer(many=True)


class ScheduleResponseSerializer(serializers.Serializer):
    start_date = serializers.CharField()
    end_date = serializers.CharField()
    vets = ScheduleVetSerializer(many=True)


class GenerateSlotsSerializer(serializers.Serializer):
    start_date = serializers.CharField()
    end_date = serializers.CharField()
    vet_id = serializers.UUIDField(required=False, allow_null=True)
