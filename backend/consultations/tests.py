import uuid

from django.test import TestCase
from django.utils import timezone

from appointments.models import Appointment, AppointmentStatus, AppointmentType
from clinics.models import Clinic
from consultations.models import Consultation
from owners.models import OwnerProfile
from pets.models import Breed, Pet, Sex
from users.models import StaffPosition, StaffProfile, User, UserRole

PASSWORD = 'TestPass123!'
OWNER_EMAIL = 'conowner@example.com'
FOREIGN_EMAIL = 'conforeign@example.com'
VET_EMAIL = 'convet@example.com'
NO_PROFILE_EMAIL = 'connoprofile@example.com'

LIST_FIELDS = {
    'id', 'appointment_id', 'pet_id', 'pet_name', 'veterinarian',
    'chief_complaint', 'subjective', 'objective', 'assessment', 'plan',
    'diagnosis', 'treatment', 'notes', 'created_at',
}


class ConsultationBase(TestCase):

    def setUp(self):
        self.clinic = Clinic.objects.create(cln_name='Happy Paws Consultations')
        self.vet_user = self._create_user(VET_EMAIL, UserRole.VETERINARIAN, 'Vera', 'Vet')
        self.vet = StaffProfile.objects.create(
            usr_id=self.vet_user,
            cln_id=self.clinic,
            stf_position=StaffPosition.VETERINARIAN,
        )

        self.owner_user = self._create_user(OWNER_EMAIL, UserRole.OWNER, 'Olivia', 'Owner')
        self.owner = OwnerProfile.objects.create(usr_id=self.owner_user)
        self.breed = Breed.objects.create(brd_name='Labrador')
        self.pet = Pet.objects.create(
            own_id=self.owner,
            brd_id=self.breed,
            pet_name='Rex',
            pet_sex=Sex.MALE,
        )

        self.foreign_user = self._create_user(FOREIGN_EMAIL, UserRole.OWNER, 'Otto', 'Other')
        self.foreign_owner = OwnerProfile.objects.create(usr_id=self.foreign_user)
        self.foreign_pet = Pet.objects.create(
            own_id=self.foreign_owner,
            pet_name='Milo',
            pet_sex=Sex.MALE,
        )

        self.appointment = Appointment.objects.create(
            pet_id=self.pet,
            cln_id=self.clinic,
            stf_id=self.vet,
            apt_type=AppointmentType.CONSULTATION,
            apt_status=AppointmentStatus.COMPLETED,
            apt_scheduled_at=timezone.now(),
        )
        self.foreign_appointment = Appointment.objects.create(
            pet_id=self.foreign_pet,
            cln_id=self.clinic,
            stf_id=self.vet,
            apt_type=AppointmentType.CONSULTATION,
            apt_status=AppointmentStatus.COMPLETED,
            apt_scheduled_at=timezone.now(),
        )

        self.consultation = Consultation.objects.create(
            apt_id=self.appointment,
            stf_id=self.vet,
            con_diagnosis='Allergic dermatitis',
            con_treatment='Antihistamine course',
        )
        self.foreign_consultation = Consultation.objects.create(
            apt_id=self.foreign_appointment,
            stf_id=self.vet,
            con_diagnosis='Foreign diagnosis',
        )

    def _create_user(self, email, role, first_name, last_name):
        user = User.objects.create(
            usr_email=email,
            usr_password_hash='hashed',
            usr_role=role,
            usr_first_name=first_name,
            usr_last_name=last_name,
        )
        user.set_password(PASSWORD)
        user.save()
        return user

    def _auth(self, email):
        response = self.client.post(
            '/api/auth/login/',
            {'email': email, 'password': PASSWORD},
        )
        self.assertEqual(response.status_code, 200, response.data)
        return {'HTTP_AUTHORIZATION': f"Bearer {response.data['access']}"}


class ConsultationListTests(ConsultationBase):

    def test_owner_lists_own_consultations(self):
        response = self.client.get('/api/consultations/', **self._auth(OWNER_EMAIL))
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(len(response.data), 1)

        record = response.data[0]
        self.assertEqual(set(record.keys()), LIST_FIELDS)
        self.assertEqual(record['id'], str(self.consultation.con_id))
        self.assertEqual(record['appointment_id'], str(self.appointment.apt_id))
        self.assertEqual(record['pet_id'], str(self.pet.pet_id))
        self.assertEqual(record['pet_name'], 'Rex')
        self.assertEqual(record['veterinarian'], 'Vera Vet')
        self.assertEqual(record['diagnosis'], 'Allergic dermatitis')
        self.assertEqual(record['treatment'], 'Antihistamine course')

    def test_list_excludes_other_owners_records(self):
        response = self.client.get('/api/consultations/', **self._auth(OWNER_EMAIL))
        ids = [item['id'] for item in response.data]
        self.assertNotIn(str(self.foreign_consultation.con_id), ids)

    def test_list_requires_authentication(self):
        response = self.client.get('/api/consultations/')
        self.assertEqual(response.status_code, 401)

    def test_list_returns_empty_without_owner_profile(self):
        self._create_user(NO_PROFILE_EMAIL, UserRole.OWNER, 'No', 'Profile')
        response = self.client.get('/api/consultations/', **self._auth(NO_PROFILE_EMAIL))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])

    def test_list_filters_by_own_pet(self):
        response = self.client.get(
            f'/api/consultations/?pet_id={self.pet.pet_id}',
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

    def test_list_with_foreign_pet_filter_returns_empty(self):
        response = self.client.get(
            f'/api/consultations/?pet_id={self.foreign_pet.pet_id}',
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])

    def test_list_with_invalid_pet_filter_returns_400(self):
        response = self.client.get(
            '/api/consultations/?pet_id=not-a-uuid',
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 400)


class ConsultationDetailTests(ConsultationBase):

    def test_owner_reads_own_consultation(self):
        response = self.client.get(
            f'/api/consultations/{self.consultation.con_id}/',
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['id'], str(self.consultation.con_id))
        self.assertEqual(response.data['diagnosis'], 'Allergic dermatitis')
        self.assertEqual(response.data['veterinarian'], 'Vera Vet')

    def test_foreign_consultation_returns_404(self):
        response = self.client.get(
            f'/api/consultations/{self.foreign_consultation.con_id}/',
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 404)

    def test_unknown_consultation_returns_404(self):
        response = self.client.get(
            f'/api/consultations/{uuid.uuid4()}/',
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 404)

    def test_detail_requires_authentication(self):
        response = self.client.get(f'/api/consultations/{self.consultation.con_id}/')
        self.assertEqual(response.status_code, 401)
