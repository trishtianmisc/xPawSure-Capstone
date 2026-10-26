from django.contrib import admin

from payments.models import Payment, PaymentEvent


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = (
        'pay_reference', 'cln_id', 'pay_amount', 'pay_method',
        'pay_status', 'pay_provider', 'pay_created_at',
    )
    list_filter = ('pay_status', 'pay_method', 'pay_provider')
    search_fields = ('pay_reference', 'pay_id')
    readonly_fields = [f.name for f in Payment._meta.fields]


@admin.register(PaymentEvent)
class PaymentEventAdmin(admin.ModelAdmin):
    list_display = ('evt_type', 'pay_id', 'evt_created_at')
    search_fields = ('pay_id__pay_reference', 'evt_type')
    readonly_fields = [f.name for f in PaymentEvent._meta.fields]
