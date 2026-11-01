from django.urls import path

from payments.views import (
    OwnerPaymentListView,
    PayMongoWebhookView,
    XenditWebhookView,
    PaymentCancelView,
    PaymentCheckoutView,
    PaymentDetailView,
    PaymentListView,
    PaymentMockConfirmView,
    PaymentMockStatusView,
)

urlpatterns = [
    path('payments/checkout/', PaymentCheckoutView.as_view(), name='payment-checkout'),
    path('payments/', PaymentListView.as_view(), name='payment-list'),
    path('owner/payments/', OwnerPaymentListView.as_view(), name='owner-payment-list'),
    # Mock routes are declared before the generic <uuid:pay_id> routes so the
    # literal 'mock' segment can never be read as a payment id.
    path(
        'payments/mock/<str:reference>/',
        PaymentMockStatusView.as_view(),
        name='payment-mock-status',
    ),
    path(
        'payments/mock/<str:reference>/confirm/',
        PaymentMockConfirmView.as_view(),
        name='payment-mock-confirm',
    ),
    path(
        'payments/webhooks/paymongo/',
        PayMongoWebhookView.as_view(),
        name='payment-paymongo-webhook',
    ),
    path(
        'payments/webhooks/xendit/',
        XenditWebhookView.as_view(),
        name='payment-xendit-webhook',
    ),
    path('payments/<uuid:pay_id>/', PaymentDetailView.as_view(), name='payment-detail'),
    path(
        'payments/<uuid:pay_id>/cancel/',
        PaymentCancelView.as_view(),
        name='payment-cancel',
    ),
]
