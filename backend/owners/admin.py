from django.contrib import admin

from owners.models import OwnerProfile


@admin.register(OwnerProfile)
class OwnerProfileAdmin(admin.ModelAdmin):
    list_display = ('usr_id', 'own_address', 'own_created_at')
    search_fields = ('usr_id__usr_first_name', 'usr_id__usr_last_name', 'usr_id__usr_email')
