from audit_log.models import AuditAction, AuditLog


class AuditService:

    @staticmethod
    def log(
        *,
        user_id: str,
        action: AuditAction,
        module: str,
        table_name: str,
        record_id: str,
        description: str | None = None,
        old_values: dict | None = None,
        new_values: dict | None = None,
        ip_address: str | None = None,
        device: str | None = None,
    ) -> AuditLog:
        return AuditLog.objects.create(
            usr_id=user_id,
            adl_action=action,
            adl_module=module,
            adl_table_name=table_name,
            adl_record_id=record_id,
            adl_description=description,
            adl_old_values=old_values,
            adl_new_values=new_values,
            adl_ip_address=ip_address,
            adl_device=device,
        )
