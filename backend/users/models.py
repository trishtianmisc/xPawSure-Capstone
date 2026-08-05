import uuid

from django.contrib.auth.hashers import check_password, make_password
from django.db import models


class UserRole(models.TextChoices):
    SUPER_ADMIN = 'SUPER_ADMIN'
    CLINIC_ADMIN = 'CLINIC_ADMIN'
    VETERINARIAN = 'VETERINARIAN'
    RECEPTIONIST = 'RECEPTIONIST'
    OWNER = 'OWNER'


class User(models.Model):
    usr_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, db_column='USR_ID')
    usr_email = models.EmailField(max_length=255, unique=True, db_column='USR_EMAIL')
    usr_password_hash = models.CharField(max_length=255, db_column='USR_PASSWORD_HASH')
    usr_role = models.CharField(max_length=20, choices=UserRole.choices, db_index=True, db_column='USR_ROLE')
    usr_first_name = models.CharField(max_length=100, db_column='USR_FIRST_NAME')
    usr_last_name = models.CharField(max_length=100, db_column='USR_LAST_NAME')
    usr_phone = models.CharField(max_length=20, null=True, blank=True, db_column='USR_PHONE')
    usr_is_active = models.BooleanField(default=True, db_index=True, db_column='USR_IS_ACTIVE')
    usr_email_verified = models.BooleanField(default=False, db_column='USR_EMAIL_VERIFIED')
    usr_must_change_password = models.BooleanField(default=False, db_column='USR_MUST_CHANGE_PASSWORD')
    usr_token_version = models.IntegerField(default=0, db_column='USR_TOKEN_VERSION')
    usr_last_login = models.DateTimeField(null=True, blank=True, db_column='USR_LAST_LOGIN')
    usr_created_at = models.DateTimeField(auto_now_add=True, db_column='USR_CREATED_AT')
    usr_updated_at = models.DateTimeField(auto_now=True, db_column='USR_UPDATED_AT')
    usr_deleted_at = models.DateTimeField(null=True, blank=True, db_index=True, db_column='USR_DELETED_AT')

    class Meta:
        managed = True
        db_table = 'USER'

    def __str__(self):
        return self.usr_email

    @property
    def is_authenticated(self):
        return True

    def set_password(self, raw_password: str) -> None:
        self.usr_password_hash = make_password(raw_password)

    def check_password(self, raw_password: str) -> bool:
        return check_password(raw_password, self.usr_password_hash)


class StaffPosition(models.TextChoices):
    CLINIC_ADMIN = 'CLINIC_ADMIN'
    VETERINARIAN = 'VETERINARIAN'
    RECEPTIONIST = 'RECEPTIONIST'


class StaffProfile(models.Model):
    stf_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, db_column='STF_ID')
    usr_id = models.OneToOneField(User, on_delete=models.CASCADE, db_column='USR_ID')
    cln_id = models.ForeignKey('clinics.Clinic', on_delete=models.CASCADE, db_column='CLN_ID')
    stf_license_number = models.CharField(max_length=100, null=True, blank=True, db_column='STF_LICENSE_NUMBER')
    stf_license_expiration_date = models.DateField(null=True, blank=True, db_column='STF_LICENSE_EXPIRATION_DATE')
    stf_position = models.CharField(max_length=20, choices=StaffPosition.choices, db_column='STF_POSITION')
    stf_created_at = models.DateTimeField(auto_now_add=True, db_column='STF_CREATED_AT')
    stf_updated_at = models.DateTimeField(auto_now=True, db_column='STF_UPDATED_AT')

    class Meta:
        managed = True
        db_table = 'STAFF_PROFILE'

    def __str__(self):
        return f'{self.usr_id.usr_first_name} {self.usr_id.usr_last_name} ({self.stf_position})'


class RevokedToken(models.Model):
    rvt_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, db_column='RVT_ID')
    usr_id = models.UUIDField(db_index=True, db_column='USR_ID')
    rvt_jti = models.CharField(max_length=255, unique=True, db_column='RVT_JTI')
    rvt_created_at = models.DateTimeField(auto_now_add=True, db_column='RVT_CREATED_AT')

    class Meta:
        managed = True
        db_table = 'REVOKED_TOKEN'

    def __str__(self):
        return f'Revoked token {self.rvt_jti} for user {self.usr_id}'
