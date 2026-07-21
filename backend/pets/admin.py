from django.contrib import admin

from pets.models import Breed, Pet


@admin.register(Breed)
class BreedAdmin(admin.ModelAdmin):
    list_display = ('brd_name', 'brd_created_at')
    search_fields = ('brd_name',)


@admin.register(Pet)
class PetAdmin(admin.ModelAdmin):
    list_display = ('pet_name', 'own_id', 'brd_id', 'pet_sex', 'pet_is_active', 'pet_created_at')
    search_fields = ('pet_name', 'own_id__usr_id__usr_first_name', 'own_id__usr_id__usr_last_name')

