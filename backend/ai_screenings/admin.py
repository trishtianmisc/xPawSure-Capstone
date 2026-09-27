from django.contrib import admin

from ai_screenings.models import AiScreening, Disease


@admin.register(Disease)
class DiseaseAdmin(admin.ModelAdmin):
    list_display = ('dis_code', 'dis_name', 'dis_severity', 'dis_created_at')
    search_fields = ('dis_code', 'dis_name')


@admin.register(AiScreening)
class AiScreeningAdmin(admin.ModelAdmin):
    list_display = ('ais_id', 'pet_id', 'dis_id', 'ais_confidence', 'ais_status', 'ais_source', 'ais_created_at')
    list_filter = ('ais_status', 'ais_source')
    search_fields = ('ais_id', 'pet_id__pet_name')
    readonly_fields = [f.name for f in AiScreening._meta.fields]
