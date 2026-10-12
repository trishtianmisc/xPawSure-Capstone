from datetime import date, timedelta

from django.test import TestCase
from django.utils import timezone

from ai_screenings.models import AiScreening, Disease
from appointments.models import Appointment, AppointmentStatus, AppointmentType
from clinics.models import Clinic
from consultations.models import Consultation
from owners.models import OwnerProfile
from pets.models import Pet, Sex
from prescriptions.models import Prescription, PrescriptionItem, PrescriptionRoute
from users.models import StaffPosition, StaffProfile, User, UserRole
from vaccinations.models import VaccinationRecord, VaccinationRoute, VaccinationSource

PASSWORD = 'TestPass123!'
REC_A_EMAIL = 'rec-a@example.com'
REC_B_EMAIL = 'rec-b@example.com'
OWNER_EMAIL = 'pat.owner@example.com'


class ReceptionistPetBase(TestCase):

    def setUp(self):
        self.clinic_a = Clinic.objects.create(cln_name='Clinic A')
        self.clinic_b = Clinic.objects.create(cln_name='Clinic B')

        self.receptionist_a = self._create_user(
            REC_A_EMAIL, UserRole.RECEPTIONIST, 'Rita', 'Alpha',
        )
        self.receptionist_b = self._create_user(
            REC_B_EMAIL, UserRole.RECEPTIONIST, 'Rob', 'Beta',
        )
        StaffProfile.objects.create(
            usr_id=self.receptionist_a,
            cln_id=self.clinic_a,
            stf_position=StaffPosition.RECEPTIONIST,
        )
        StaffProfile.objects.create(
            usr_id=self.receptionist_b,
            cln_id=self.clinic_b,
            stf_position=StaffPosition.RECEPTIONIST,
        )

        self.owner_user = self._create_user(
            OWNER_EMAIL, UserRole.OWNER, 'Olga', 'Owner',
        )
        self.owner = OwnerProfile.objects.create(usr_id=self.owner_user)

        self.patient_a = Pet.objects.create(
            own_id=self.owner, pet_name='Rex', pet_sex=Sex.MALE,
        )
        Appointment.objects.create(
            pet_id=self.patient_a,
            cln_id=self.clinic_a,
            apt_type=AppointmentType.CONSULTATION,
            apt_status=AppointmentStatus.CONFIRMED,
            apt_scheduled_at=timezone.now(),
        )

        self.stray = Pet.objects.create(
            own_id=self.owner, pet_name='Stray', pet_sex=Sex.FEMALE,
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


class ReceptionistPetListTests(ReceptionistPetBase):

    def test_list_returns_only_pets_with_appointment_at_own_clinic(self):
        response = self.client.get(
            '/api/receptionist/pets/', **self._auth(REC_A_EMAIL),
        )
        self.assertEqual(response.status_code, 200, response.data)
        names = [pet['name'] for pet in response.data['results']]
        self.assertEqual(names, ['Rex'])
        self.assertEqual(response.data['total'], 1)

    def test_pets_without_appointments_are_not_listed(self):
        response = self.client.get(
            '/api/receptionist/pets/', **self._auth(REC_A_EMAIL),
        )
        names = [pet['name'] for pet in response.data['results']]
        self.assertNotIn('Stray', names)

    def test_other_clinic_sees_no_patients(self):
        response = self.client.get(
            '/api/receptionist/pets/', **self._auth(REC_B_EMAIL),
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['total'], 0)
        self.assertEqual(response.data['results'], [])

    def test_owner_scope_returns_owner_pets_across_clinics(self):
        response = self.client.get(
            '/api/receptionist/pets/',
            {'scope': 'owner', 'owner_id': str(self.owner.own_id)},
            **self._auth(REC_B_EMAIL),
        )
        self.assertEqual(response.status_code, 200, response.data)
        names = sorted(pet['name'] for pet in response.data['results'])
        self.assertEqual(names, ['Rex', 'Stray'])

    def test_owner_scope_requires_owner_id(self):
        response = self.client.get(
            '/api/receptionist/pets/',
            {'scope': 'owner'},
            **self._auth(REC_B_EMAIL),
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['total'], 0)

    def test_invalid_page_params_fall_back_to_defaults(self):
        response = self.client.get(
            '/api/receptionist/pets/',
            {'page': 'abc', 'page_size': 'xyz'},
            **self._auth(REC_A_EMAIL),
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['page'], 1)
        self.assertEqual(response.data['page_size'], 20)


class ReceptionistPetDetailTests(ReceptionistPetBase):

    def test_detail_of_own_clinic_patient_returns_200(self):
        response = self.client.get(
            f'/api/receptionist/pets/{self.patient_a.pet_id}/',
            **self._auth(REC_A_EMAIL),
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['name'], 'Rex')

    def test_detail_of_other_clinic_pet_returns_404(self):
        response = self.client.get(
            f'/api/receptionist/pets/{self.patient_a.pet_id}/',
            **self._auth(REC_B_EMAIL),
        )
        self.assertEqual(response.status_code, 404)

    def test_detail_of_unregistered_pet_returns_404(self):
        response = self.client.get(
            f'/api/receptionist/pets/{self.stray.pet_id}/',
            **self._auth(REC_A_EMAIL),
        )
        self.assertEqual(response.status_code, 404)

    def test_patch_of_other_clinic_pet_returns_404(self):
        response = self.client.patch(
            f'/api/receptionist/pets/{self.patient_a.pet_id}/',
            {'pet_name': 'Hijacked'},
            content_type='application/json',
            **self._auth(REC_B_EMAIL),
        )
        self.assertEqual(response.status_code, 404)
        self.patient_a.refresh_from_db()
        self.assertEqual(self.patient_a.pet_name, 'Rex')

    def test_patch_of_own_clinic_patient_succeeds(self):
        response = self.client.patch(
            f'/api/receptionist/pets/{self.patient_a.pet_id}/',
            {'pet_name': 'Rexy'},
            content_type='application/json',
            **self._auth(REC_A_EMAIL),
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.patient_a.refresh_from_db()
        self.assertEqual(self.patient_a.pet_name, 'Rexy')


class ReceptionistOwnerPetsScopingTests(ReceptionistPetBase):

    def test_owner_list_pet_count_is_clinic_scoped(self):
        response = self.client.get('/api/owners/', **self._auth(REC_A_EMAIL))
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['total'], 1)
        self.assertEqual(response.data['results'][0]['pet_count'], 1)

        response = self.client.get('/api/owners/', **self._auth(REC_B_EMAIL))
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['results'][0]['pet_count'], 0)

    def test_owner_detail_pets_are_clinic_scoped(self):
        path = f'/api/owners/{self.owner.own_id}/'

        response = self.client.get(path, **self._auth(REC_A_EMAIL))
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual([pet['name'] for pet in response.data['pets']], ['Rex'])

        response = self.client.get(path, **self._auth(REC_B_EMAIL))
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['pets'], [])


class ReceptionistPetHistoryTests(ReceptionistPetBase):

    def setUp(self):
        super().setUp()
        self.vet_a = self._create_user(
            'vet-a@example.com', UserRole.VETERINARIAN, 'Vera', 'Alpha',
        )
        self.vet_profile_a = StaffProfile.objects.create(
            usr_id=self.vet_a,
            cln_id=self.clinic_a,
            stf_position=StaffPosition.VETERINARIAN,
        )
        self.vet_b = self._create_user(
            'vet-b@example.com', UserRole.VETERINARIAN, 'Vince', 'Beta',
        )
        self.vet_profile_b = StaffProfile.objects.create(
            usr_id=self.vet_b,
            cln_id=self.clinic_b,
            stf_position=StaffPosition.VETERINARIAN,
        )

        self.appt_a = Appointment.objects.create(
            pet_id=self.patient_a,
            cln_id=self.clinic_a,
            stf_id=self.vet_profile_a,
            apt_type=AppointmentType.CONSULTATION,
            apt_status=AppointmentStatus.COMPLETED,
            apt_scheduled_at=timezone.now() - timedelta(days=2),
        )
        self.con_a = Consultation.objects.create(
            apt_id=self.appt_a,
            stf_id=self.vet_profile_a,
            con_chief_complaint='Itching',
            con_diagnosis='Skin infection',
        )
        self.prs_a = Prescription.objects.create(
            con_id=self.con_a,
            stf_id=self.vet_profile_a,
            prs_instructions='Give after meals',
        )
        PrescriptionItem.objects.create(
            prs_id=self.prs_a,
            pri_medicine_name='Amoxicillin',
            pri_dosage='10 mg',
            pri_frequency='Twice daily',
            pri_duration='7 days',
            pri_route=PrescriptionRoute.ORAL,
        )

        self.appt_b = Appointment.objects.create(
            pet_id=self.patient_a,
            cln_id=self.clinic_b,
            stf_id=self.vet_profile_b,
            apt_type=AppointmentType.CONSULTATION,
            apt_status=AppointmentStatus.COMPLETED,
            apt_scheduled_at=timezone.now() - timedelta(days=1),
        )
        self.con_b = Consultation.objects.create(
            apt_id=self.appt_b,
            stf_id=self.vet_profile_b,
            con_diagnosis='Other clinic diagnosis',
        )

        self.vac_vet = VaccinationRecord.objects.create(
            pet_id=self.patient_a,
            con_id=self.con_a,
            stf_id=self.vet_profile_a,
            vac_name='Rabies',
            vac_dose='1 ml',
            vac_route=VaccinationRoute.SUBCUTANEOUS,
            vac_date_given=date(2026, 1, 15),
            vac_source=VaccinationSource.VET,
        )
        self.vac_owner = VaccinationRecord.objects.create(
            pet_id=self.patient_a,
            vac_name='DHPPi (owner reported)',
            vac_dose='1 ml',
            vac_route=VaccinationRoute.SUBCUTANEOUS,
            vac_date_given=date(2026, 2, 20),
            vac_source=VaccinationSource.OWNER,
        )

        self.disease = Disease.objects.create(
            dis_code='DERM01', dis_name='Dermatitis',
        )
        self.screening = AiScreening.objects.create(
            pet_id=self.patient_a,
            dis_id=self.disease,
            usr_id=self.owner_user,
            ais_confidence=87.50,
            ais_model_version='v1.0',
            ais_status='PENDING_REVIEW',
            ais_source='DEVICE',
        )

    def _history(self, pet_id, email):
        return self.client.get(
            f'/api/receptionist/pets/{pet_id}/history/',
            **self._auth(email),
        )

    def test_history_returns_all_sections(self):
        response = self._history(self.patient_a.pet_id, REC_A_EMAIL)
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(
            set(response.data.keys()),
            {'consultations', 'prescriptions', 'vaccinations', 'screenings', 'appointments'},
        )
        self.assertEqual(len(response.data['consultations']), 1)
        self.assertEqual(
            response.data['consultations'][0]['diagnosis'], 'Skin infection',
        )
        self.assertEqual(len(response.data['prescriptions']), 1)
        self.assertEqual(
            response.data['prescriptions'][0]['items'][0]['medicine_name'],
            'Amoxicillin',
        )

    def test_consultations_and_prescriptions_clinic_scoped(self):
        response = self._history(self.patient_a.pet_id, REC_A_EMAIL)
        diagnoses = [c['diagnosis'] for c in response.data['consultations']]
        self.assertEqual(diagnoses, ['Skin infection'])
        self.assertNotIn('Other clinic diagnosis', diagnoses)
        self.assertEqual(len(response.data['prescriptions']), 1)

    def test_shared_patient_clinic_b_sees_own_records_only(self):
        response = self._history(self.patient_a.pet_id, REC_B_EMAIL)
        self.assertEqual(response.status_code, 200, response.data)
        diagnoses = [c['diagnosis'] for c in response.data['consultations']]
        self.assertEqual(diagnoses, ['Other clinic diagnosis'])
        self.assertEqual(response.data['prescriptions'], [])

    def test_vaccinations_are_pet_level(self):
        response = self._history(self.patient_a.pet_id, REC_A_EMAIL)
        names = {v['name'] for v in response.data['vaccinations']}
        self.assertEqual(names, {'Rabies', 'DHPPi (owner reported)'})
        sources = {v['source'] for v in response.data['vaccinations']}
        self.assertEqual(sources, {'VET', 'OWNER'})

        response_b = self._history(self.patient_a.pet_id, REC_B_EMAIL)
        names_b = {v['name'] for v in response_b.data['vaccinations']}
        self.assertIn('Rabies', names_b)

    def test_screenings_are_pet_level(self):
        response = self._history(self.patient_a.pet_id, REC_A_EMAIL)
        self.assertEqual(len(response.data['screenings']), 1)
        screening = response.data['screenings'][0]
        self.assertEqual(screening['disease'], 'Dermatitis')
        self.assertEqual(screening['ais_confidence'], '87.50')
        self.assertEqual(screening['ais_source'], 'DEVICE')

        response_b = self._history(self.patient_a.pet_id, REC_B_EMAIL)
        self.assertEqual(len(response_b.data['screenings']), 1)

    def test_appointments_clinic_scoped(self):
        response = self._history(self.patient_a.pet_id, REC_A_EMAIL)
        self.assertEqual(len(response.data['appointments']), 2)

        response_b = self._history(self.patient_a.pet_id, REC_B_EMAIL)
        self.assertEqual(len(response_b.data['appointments']), 1)

    def test_history_of_non_patient_returns_404(self):
        response = self._history(self.stray.pet_id, REC_A_EMAIL)
        self.assertEqual(response.status_code, 404)

    def test_history_requires_staff_profile(self):
        user = self._create_user(
            'rec-noprofile@example.com', UserRole.RECEPTIONIST, 'Nina', 'NoProfile',
        )
        user.save()
        response = self._history(self.patient_a.pet_id, 'rec-noprofile@example.com')
        self.assertEqual(response.status_code, 400)
