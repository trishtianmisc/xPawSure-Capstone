import uuid

from django.contrib.auth.hashers import make_password
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
    usr_role = models.CharField(max_length=20, choices=UserRole.choices, db_column='USR_ROLE')
    usr_first_name = models.CharField(max_length=100, db_column='USR_FIRST_NAME')
    usr_last_name = models.CharField(max_length=100, db_column='USR_LAST_NAME')
    usr_phone = models.CharField(max_length=20, null=True, blank=True, db_column='USR_PHONE')
    usr_is_active = models.BooleanField(default=True, db_column='USR_IS_ACTIVE')
    usr_email_verified = models.BooleanField(default=False, db_column='USR_EMAIL_VERIFIED')
    usr_must_change_password = models.BooleanField(default=False, db_column='USR_MUST_CHANGE_PASSWORD')
    usr_last_login = models.DateTimeField(null=True, blank=True, db_column='USR_LAST_LOGIN')
    usr_created_at = models.DateTimeField(auto_now_add=True, db_column='USR_CREATED_AT')
    usr_updated_at = models.DateTimeField(auto_now=True, db_column='USR_UPDATED_AT')
    usr_deleted_at = models.DateTimeField(null=True, blank=True, db_column='USR_DELETED_AT')

    class Meta:
        managed = True
        db_table = 'USER'

    def __str__(self):
        return self.usr_email

    def set_password(self, raw_password: str) -> None:
        self.usr_password_hash = make_password(raw_password)
