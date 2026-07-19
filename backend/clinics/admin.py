from django.contrib import admin

from clinics.models import Clinic


@admin.register(Clinic)
class ClinicAdmin(admin.ModelAdmin):
    list_display = ['cln_name', 'cln_email', 'cln_phone', 'cln_status', 'cln_created_at']
    list_filter = ['cln_status']
    search_fields = ['cln_name', 'cln_email']
    ordering = ['-cln_created_at']
