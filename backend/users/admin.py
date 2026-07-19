from django.contrib import admin

from users.models import User


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ['usr_email', 'usr_role', 'usr_is_active', 'usr_must_change_password', 'usr_last_login']
    list_filter = ['usr_role', 'usr_is_active']
    search_fields = ['usr_email', 'usr_first_name', 'usr_last_name']
    ordering = ['usr_email']
