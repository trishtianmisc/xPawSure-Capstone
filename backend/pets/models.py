import uuid

from django.db import models


class Sex(models.TextChoices):
    MALE = 'MALE'
    FEMALE = 'FEMALE'


class Breed(models.Model):
    brd_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, db_column='BRD_ID')
    brd_name = models.CharField(max_length=100, unique=True, db_column='BRD_NAME')
    brd_description = models.TextField(null=True, blank=True, db_column='BRD_DESCRIPTION')
    brd_created_at = models.DateTimeField(auto_now_add=True, db_column='BRD_CREATED_AT')
    brd_updated_at = models.DateTimeField(auto_now=True, db_column='BRD_UPDATED_AT')

    class Meta:
        managed = True
        db_table = 'BREED'

    def __str__(self):
        return self.brd_name


class Pet(models.Model):
    pet_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, db_column='PET_ID')
    own_id = models.ForeignKey('owners.OwnerProfile', on_delete=models.CASCADE, db_column='OWN_ID', related_name='pets')
    brd_id = models.ForeignKey(Breed, on_delete=models.SET_NULL, null=True, db_column='BRD_ID', related_name='pets')
    pet_name = models.CharField(max_length=100, db_column='PET_NAME')
    pet_sex = models.CharField(max_length=10, choices=Sex.choices, db_column='PET_SEX')
    pet_birth_date = models.DateField(null=True, blank=True, db_column='PET_BIRTH_DATE')
    pet_weight = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, db_column='PET_WEIGHT')
    pet_color = models.CharField(max_length=100, null=True, blank=True, db_column='PET_COLOR')
    pet_microchip_no = models.CharField(max_length=100, null=True, blank=True, unique=True, db_column='PET_MICROCHIP_NO')
    pet_profile_image = models.TextField(null=True, blank=True, db_column='PET_PROFILE_IMAGE')
    pet_qr_code = models.CharField(max_length=255, null=True, blank=True, db_column='PET_QR_CODE')
    pet_qr_code_url = models.TextField(null=True, blank=True, db_column='PET_QR_CODE_URL')
    pet_is_active = models.BooleanField(default=True, db_column='PET_IS_ACTIVE')
    pet_created_at = models.DateTimeField(auto_now_add=True, db_column='PET_CREATED_AT')
    pet_updated_at = models.DateTimeField(auto_now=True, db_column='PET_UPDATED_AT')
    pet_deleted_at = models.DateTimeField(null=True, blank=True, db_index=True, db_column='PET_DELETED_AT')

    class Meta:
        managed = True
        db_table = 'PET'

    def __str__(self):
        return self.pet_name
