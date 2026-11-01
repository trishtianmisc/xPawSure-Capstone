from django.utils import timezone
from rest_framework import serializers

from appointments.models import Appointment, AppointmentStatus
from owners.models import OwnerProfile
from pets.models import Pet
from pets.services.public_pet_service import PublicPetService
from vaccinations.models import VaccinationRecord


def _clinic_date(value, tz):
    if value is None:
        return None
    if tz is None:
        return value.date().isoformat()
    return timezone.localtime(value, tz).date().isoformat()


def _person_name(user):
    if user is None:
        return ''
    return f'{user.usr_first_name} {user.usr_last_name}'.strip()


class ClinicPatientOwnerSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    phone = serializers.CharField(source='usr_id.usr_phone', allow_null=True, read_only=True)
    email = serializers.EmailField(source='usr_id.usr_email', read_only=True)

    class Meta:
        model = OwnerProfile
        fields = ['name', 'phone', 'email']

    def get_name(self, obj):
        return _person_name(obj.usr_id)


class ClinicPatientListSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source='pet_id', read_only=True)
    name = serializers.CharField(source='pet_name', read_only=True)
    profile_picture = serializers.CharField(source='pet_profile_image', allow_null=True, read_only=True)
    breed = serializers.SerializerMethodField()
    sex = serializers.CharField(source='pet_sex', read_only=True)
    age = serializers.SerializerMethodField()
    owner = ClinicPatientOwnerSerializer(source='own_id', read_only=True)
    last_visit_date = serializers.SerializerMethodField()
    next_appointment_date = serializers.SerializerMethodField()
    total_appointments = serializers.IntegerField(read_only=True)
    no_show_count = serializers.IntegerField(read_only=True)
    cancelled_count = serializers.IntegerField(read_only=True)
    

    class Meta:
        model = Pet
        fields = [
            'id', 'name', 'profile_picture', 'breed', 'sex', 'age', 'owner',
            'last_visit_date', 'next_appointment_date', 'total_appointments',
            'no_show_count', 'cancelled_count',
        ]

    def get_breed(self, obj):
        return obj.brd_id.brd_name if obj.brd_id else None

    def get_age(self, obj):
        return PublicPetService.age_years(
            obj.pet_birth_date,
            self.context.get('today'),
        )

    def get_last_visit_date(self, obj):
        return _clinic_date(obj.last_visit_at, self.context.get('timezone'))

    def get_next_appointment_date(self, obj):
        return _clinic_date(obj.next_appointment_at, self.context.get('timezone'))




class ClinicPatientVaccinationSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='vac_name', read_only=True)
    date_given = serializers.DateField(source='vac_date_given', read_only=True)
    next_due = serializers.DateField(source='vac_next_due', allow_null=True, read_only=True)

    class Meta:
        model = VaccinationRecord
        fields = ['name', 'date_given', 'next_due']


class ClinicPatientAppointmentSerializer(serializers.ModelSerializer):
    apt_id = serializers.UUIDField(read_only=True)
    apt_scheduled_at = serializers.DateTimeField(read_only=True)
    apt_type = serializers.CharField(read_only=True)
    apt_status = serializers.CharField(read_only=True)
    vet_name = serializers.SerializerMethodField()
    apt_cancellation_reason = serializers.SerializerMethodField()

    class Meta:
        model = Appointment
        fields = [
            'apt_id', 'apt_scheduled_at', 'apt_type', 'apt_status',
            'vet_name', 'apt_cancellation_reason',
        ]

    def get_vet_name(self, obj):
        if obj.stf_id and obj.stf_id.usr_id:
            return _person_name(obj.stf_id.usr_id)
        return None

    def get_apt_cancellation_reason(self, obj):
        if obj.apt_status != AppointmentStatus.CANCELLED:
            return None
        return obj.apt_cancellation_reason


class ClinicPatientDetailSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source='pet_id', read_only=True)
    name = serializers.CharField(source='pet_name', read_only=True)
    profile_picture = serializers.CharField(source='pet_profile_image', allow_null=True, read_only=True)
    breed = serializers.SerializerMethodField()
    sex = serializers.CharField(source='pet_sex', read_only=True)
    age = serializers.SerializerMethodField()
    date_of_birth = serializers.DateField(source='pet_birth_date', allow_null=True, read_only=True)
    weight = serializers.DecimalField(
        source='pet_weight', max_digits=5, decimal_places=2,
        allow_null=True, read_only=True,
    )
    color = serializers.CharField(source='pet_color', allow_null=True, read_only=True)
    registered_at = serializers.DateTimeField(source='pet_created_at', read_only=True)
    owner = ClinicPatientOwnerSerializer(source='own_id', read_only=True)
    summary = serializers.SerializerMethodField()
    vaccination_status = serializers.SerializerMethodField()
    vaccinations = serializers.SerializerMethodField()
    appointments = serializers.SerializerMethodField()

    class Meta:
        model = Pet
        fields = [
            'id', 'name', 'profile_picture', 'breed', 'sex', 'age',
            'date_of_birth', 'weight', 'color', 'registered_at', 'owner',
            'summary', 'vaccination_status', 'vaccinations', 'appointments',
        ]

    def get_breed(self, obj):
        return obj.brd_id.brd_name if obj.brd_id else None

    def get_age(self, obj):
        return PublicPetService.age_years(
            obj.pet_birth_date,
            self.context.get('today'),
        )

    def get_summary(self, obj):
        return {
            'consultations': self.context.get('consultation_count', 0),
            'vaccinations': len(self.context.get('vaccinations', [])),
            'ai_screenings': self.context.get('screening_count', 0),
        }

    def get_vaccination_status(self, obj):
        return PublicPetService.overall_vaccination_status(
            [record.vac_next_due for record in self.context.get('vaccinations', [])],
            self.context.get('today'),
        )

    def get_vaccinations(self, obj):
        return ClinicPatientVaccinationSerializer(
            self.context.get('vaccinations', []),
            many=True,
        ).data

    def get_appointments(self, obj):
        return ClinicPatientAppointmentSerializer(
            self.context.get('appointments', []),
            many=True,
        ).data

