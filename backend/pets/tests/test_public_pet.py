from datetime import date, timedelta
from unittest.mock import patch

from django.conf import settings
from django.test import TestCase
from django.utils import timezone

from owners.models import OwnerProfile
from pets.models import Breed, Pet, Sex
from pets.services.pet_service import PetService
from pets.services.public_pet_service import PublicPetService
from users.models import User, UserRole
from vaccinations.models import VaccinationRecord, VaccinationRoute

SUPABASE_MOCK_URL = 'https://test-project.supabase.co/storage/v1/object/public/qr-codes/test/abc.png'

EXPECTED_PUBLIC_FIELDS = {
    'qr_code',
    'name',
    'breed_name',
    'sex',
    'date_of_birth',
    'age',
    'color',
    'profile_picture',
    'vaccinations',
}


def years_ago(today: date, years: int) -> date:
    try:
        return today.replace(year=today.year - years)
    except ValueError:
        return today.replace(year=today.year - years, day=28)


class PublicPetServiceTest(TestCase):

    def test_vaccination_status_overdue(self):
        today = date.today()
        self.assertEqual(
            PublicPetService.vaccination_status(today - timedelta(days=1), today),
            'OVERDUE',
        )

    def test_vaccination_status_due_soon(self):
        today = date.today()
        self.assertEqual(
            PublicPetService.vaccination_status(today + timedelta(days=30), today),
            'DUE_SOON',
        )

    def test_vaccination_status_current(self):
        today = date.today()
        self.assertEqual(
            PublicPetService.vaccination_status(today + timedelta(days=31), today),
            'CURRENT',
        )

    def test_vaccination_status_without_due_date(self):
        self.assertEqual(PublicPetService.vaccination_status(None), 'NO_DUE_DATE')

    def test_age_years(self):
        today = date.today()
        self.assertEqual(PublicPetService.age_years(years_ago(today, 3)), 3)
        self.assertEqual(PublicPetService.age_years(years_ago(today, 1) + timedelta(days=1)), 0)
        self.assertIsNone(PublicPetService.age_years(None))


class PublicPetAPITest(TestCase):

    def setUp(self):
        self.user = User.objects.create(
            usr_email='owner@example.com',
            usr_password_hash='hashed',
            usr_role=UserRole.OWNER,
            usr_first_name='John',
            usr_last_name='Doe',
        )
        self.owner_profile = OwnerProfile.objects.create(usr_id=self.user)
        self.breed = Breed.objects.create(brd_name='Labrador')

        with patch('pets.services.qr_service.QRStorageService.save', return_value=SUPABASE_MOCK_URL):
            self.pet = PetService.create(
                owner_profile=self.owner_profile,
                validated_data={
                    'brd_id': self.breed.brd_id,
                    'pet_name': 'Buddy',
                    'pet_sex': Sex.MALE,
                    'pet_birth_date': years_ago(date.today(), 3),
                    'pet_color': 'Brown',
                    'pet_microchip_no': 'CHIP-12345',
                },
                user_id=str(self.user.usr_id),
                ip_address='127.0.0.1',
            )

    def _url(self, qr_code):
        return f'/api/pets/public/{qr_code}/'

    def test_returns_profile_without_authentication(self):
        response = self.client.get(self._url(self.pet.pet_qr_code))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(set(response.data.keys()), EXPECTED_PUBLIC_FIELDS)
        self.assertEqual(response.data['name'], 'Buddy')
        self.assertEqual(response.data['breed_name'], 'Labrador')
        self.assertEqual(response.data['sex'], 'MALE')
        self.assertEqual(response.data['age'], 3)
        self.assertEqual(response.data['qr_code'], str(self.pet.pet_id))

    def test_never_exposes_owner_or_sensitive_fields(self):
        response = self.client.get(self._url(self.pet.pet_qr_code))

        self.assertEqual(response.status_code, 200)
        forbidden = {'id', 'weight', 'microchip_number', 'qr_code_url', 'own_id', 'breed_id', 'created_at'}
        self.assertTrue(forbidden.isdisjoint(set(response.data.keys())))
        self.assertNotIn('CHIP-12345', response.content.decode())

    def test_returns_404_for_unknown_qr_code(self):
        response = self.client.get(self._url('00000000-0000-0000-0000-000000000000'))
        self.assertEqual(response.status_code, 404)

    def test_returns_404_for_inactive_pet(self):
        Pet.objects.filter(pk=self.pet.pk).update(pet_is_active=False)
        response = self.client.get(self._url(self.pet.pet_qr_code))
        self.assertEqual(response.status_code, 404)

    def test_returns_404_for_soft_deleted_pet(self):
        Pet.objects.filter(pk=self.pet.pk).update(pet_is_active=False, pet_deleted_at=timezone.now())
        response = self.client.get(self._url(self.pet.pet_qr_code))
        self.assertEqual(response.status_code, 404)

    def test_vaccination_alerts_sorted_by_urgency(self):
        today = date.today()
        for name, next_due in [
            ('Current shot', today + timedelta(days=200)),
            ('Overdue shot', today - timedelta(days=10)),
            ('No due shot', None),
            ('Due soon shot', today + timedelta(days=10)),
        ]:
            VaccinationRecord.objects.create(
                pet_id=self.pet,
                vac_name=name,
                vac_dose='1 ml',
                vac_route=VaccinationRoute.SUBCUTANEOUS,
                vac_date_given=today - timedelta(days=400),
                vac_next_due=next_due,
            )

        response = self.client.get(self._url(self.pet.pet_qr_code))

        self.assertEqual(response.status_code, 200)
        vaccinations = response.data['vaccinations']
        self.assertEqual(len(vaccinations), 4)
        self.assertEqual(
            [item['status'] for item in vaccinations],
            ['OVERDUE', 'DUE_SOON', 'CURRENT', 'NO_DUE_DATE'],
        )
        self.assertEqual(set(vaccinations[0].keys()), {'name', 'date_given', 'next_due', 'status'})


class QRPublicUrlTest(TestCase):

    def setUp(self):
        self.user = User.objects.create(
            usr_email='owner-qr@example.com',
            usr_password_hash='hashed',
            usr_role=UserRole.OWNER,
            usr_first_name='Jane',
            usr_last_name='Doe',
        )
        self.owner_profile = OwnerProfile.objects.create(usr_id=self.user)
        self.breed = Breed.objects.create(brd_name='Beagle')

    @patch('pets.services.pet_service.generate_qr_code')
    @patch('pets.services.pet_service.QRStorageService.save', return_value=SUPABASE_MOCK_URL)
    def test_qr_png_encodes_public_profile_url(self, mock_save, mock_generate):
        pet = PetService.create(
            owner_profile=self.owner_profile,
            validated_data={'brd_id': self.breed.brd_id, 'pet_name': 'Rex', 'pet_sex': Sex.MALE},
            user_id=str(self.user.usr_id),
        )

        mock_generate.assert_called_once()
        encoded_value = mock_generate.call_args.args[0]
        self.assertEqual(encoded_value, f'{settings.FRONTEND_URL}/pets/{pet.pet_id}/public')
        self.assertEqual(pet.pet_qr_code, str(pet.pet_id))
