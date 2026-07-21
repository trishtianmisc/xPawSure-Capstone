import uuid

from django.db import models


class OwnerProfile(models.Model):
    own_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, db_column='OWN_ID')
    usr_id = models.OneToOneField('users.User', on_delete=models.CASCADE, db_column='USR_ID', related_name='owner_profile')
    own_address = models.TextField(null=True, blank=True, db_column='OWN_ADDRESS')
    own_profile_image = models.TextField(null=True, blank=True, db_column='OWN_PROFILE_IMAGE')
    own_created_at = models.DateTimeField(auto_now_add=True, db_column='OWN_CREATED_AT')
    own_updated_at = models.DateTimeField(auto_now=True, db_column='OWN_UPDATED_AT')

    class Meta:
        managed = True
        db_table = 'OWNER_PROFILE'

    def __str__(self):
        return f'{self.usr_id.usr_first_name} {self.usr_id.usr_last_name}'
