import uuid

from django.test import TestCase
from django.utils import timezone

from appointments.models import Appointment, AppointmentStatus, AppointmentType
from clinics.models import Clinic
from consultations.models import Consultation
from owners.models import OwnerProfile
from pets.models import Breed, Pet, Sex
from prescriptions.models import Prescription, PrescriptionItem, PrescriptionRoute
from users.models import StaffPosition, StaffProfile, User, UserRole

PASSWORD = 'TestPass123!'
OWNER_EMAIL = 'prsowner@example.com'
FOREIGN_EMAIL = 'prsforeign@example.com'
VET_EMAIL = 'prsvet@example.com'

LIST_FIELDS = {
    'id', 'consultation_id', 'pet_id', 'pet_name', 'veterinarian',
    'instructions', 'items', 'created_at',
}
ITEM_FIELDS = {
    'id', 'medicine_name', 'generic_name', 'dosage', 'frequency', 'duration',
    'route', 'quantity', 'notes',
}


class PrescriptionBase(TestCase):

    def setUp(self):
        self.clinic = Clinic.objects.create(cln_name='Happy Paws Prescriptions')
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
        )
        self.foreign_consultation = Consultation.objects.create(
            apt_id=self.foreign_appointment,
            stf_id=self.vet,
            con_diagnosis='Foreign diagnosis',
        )

        self.prescription = Prescription.objects.create(
            con_id=self.consultation,
            stf_id=self.vet,
            prs_instructions='Give with food',
        )
        PrescriptionItem.objects.create(
            prs_id=self.prescription,
            pri_medicine_name='Apoquel',
            pri_dosage='5.4 mg',
            pri_frequency='Twice daily',
            pri_duration='14 days',
            pri_route=PrescriptionRoute.ORAL,
            pri_quantity=28,
        )
        PrescriptionItem.objects.create(
            prs_id=self.prescription,
            pri_medicine_name='Chlorhexidine shampoo',
            pri_dosage='Topical',
            pri_frequency='Weekly',
            pri_duration='4 weeks',
            pri_route=PrescriptionRoute.TOPICAL,
        )

        self.foreign_prescription = Prescription.objects.create(
            con_id=self.foreign_consultation,
            stf_id=self.vet,
        )
        PrescriptionItem.objects.create(
            prs_id=self.foreign_prescription,
            pri_medicine_name='Foreign med',
            pri_dosage='1 ml',
            pri_frequency='Daily',
            pri_duration='3 days',
            pri_route=PrescriptionRoute.ORAL,
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


class PrescriptionListTests(PrescriptionBase):

    def test_owner_lists_own_prescriptions_with_items(self):
        response = self.client.get('/api/prescriptions/', **self._auth(OWNER_EMAIL))
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(len(response.data), 1)

        record = response.data[0]
        self.assertEqual(set(record.keys()), LIST_FIELDS)
        self.assertEqual(record['id'], str(self.prescription.prs_id))
        self.assertEqual(record['consultation_id'], str(self.consultation.con_id))
        self.assertEqual(record['pet_name'], 'Rex')
        self.assertEqual(record['veterinarian'], 'Vera Vet')
        self.assertEqual(record['instructions'], 'Give with food')

        self.assertEqual(len(record['items']), 2)
        item = record['items'][0]
        self.assertEqual(set(item.keys()), ITEM_FIELDS)
        self.assertEqual(item['medicine_name'], 'Apoquel')
        self.assertEqual(item['route'], 'ORAL')

    def test_list_excludes_other_owners_prescriptions(self):
        response = self.client.get('/api/prescriptions/', **self._auth(OWNER_EMAIL))
        ids = [item['id'] for item in response.data]
        self.assertNotIn(str(self.foreign_prescription.prs_id), ids)

    def test_list_requires_authentication(self):
        response = self.client.get('/api/prescriptions/')
        self.assertEqual(response.status_code, 401)

    def test_list_filters_by_own_pet(self):
        response = self.client.get(
            f'/api/prescriptions/?pet_id={self.pet.pet_id}',
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

    def test_list_with_foreign_pet_filter_returns_empty(self):
        response = self.client.get(
            f'/api/prescriptions/?pet_id={self.foreign_pet.pet_id}',
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])

    def test_list_with_invalid_pet_filter_returns_400(self):
        response = self.client.get(
            '/api/prescriptions/?pet_id=not-a-uuid',
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 400)


class PrescriptionDetailTests(PrescriptionBase):

    def test_owner_reads_own_prescription(self):
        response = self.client.get(
            f'/api/prescriptions/{self.prescription.prs_id}/',
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['id'], str(self.prescription.prs_id))
        self.assertEqual(len(response.data['items']), 2)
        medicine_names = [item['medicine_name'] for item in response.data['items']]
        self.assertIn('Apoquel', medicine_names)

    def test_foreign_prescription_returns_404(self):
        response = self.client.get(
            f'/api/prescriptions/{self.foreign_prescription.prs_id}/',
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 404)

    def test_unknown_prescription_returns_404(self):
        response = self.client.get(
            f'/api/prescriptions/{uuid.uuid4()}/',
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 404)

    def test_detail_requires_authentication(self):
        response = self.client.get(f'/api/prescriptions/{self.prescription.prs_id}/')
        self.assertEqual(response.status_code, 401)
