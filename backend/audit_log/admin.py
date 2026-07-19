from django.contrib import admin

from audit_log.models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ['adl_action', 'adl_module', 'adl_table_name', 'adl_created_at']
    list_filter = ['adl_action', 'adl_module']
    search_fields = ['adl_description']
    readonly_fields = [
        'adl_id', 'usr_id', 'adl_action', 'adl_module', 'adl_table_name',
        'adl_record_id', 'adl_description', 'adl_old_values', 'adl_new_values',
        'adl_ip_address', 'adl_device', 'adl_created_at',
    ]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
