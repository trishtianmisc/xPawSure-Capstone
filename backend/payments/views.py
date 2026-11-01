import json
import logging
from datetime import datetime

from django.conf import settings
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from ai_screenings.models import AiScreening
from appointments.models import VetSlot
from core.permissions import HasRole
from owners.models import OwnerProfile
from pets.models import Pet
from payments.models import Payment
from payments.providers.paymongo import PayMongoProvider
from payments.providers.xendit import XenditProvider
from payments.serializers import (
    CreateCheckoutSerializer,
    MockConfirmSerializer,
    PaymentSerializer,
)
from payments.services import PaymentError, PaymentService
from users.models import StaffProfile, UserRole

logger = logging.getLogger(__name__)


def _error(exc: PaymentError) -> Response:
    return Response(exc.as_dict(), status=exc.status_code)


def _parse_date(value):
    if not value:
        return None, None
    try:
        return datetime.strptime(value, '%Y-%m-%d').date(), None
    except ValueError:
        return None, f"Invalid date '{value}'; expected YYYY-MM-DD."


class PaymentCheckoutView(APIView):
    """Create the payment that must succeed before an appointment exists."""

    permission_classes = [HasRole(
        UserRole.RECEPTIONIST, UserRole.CLINIC_ADMIN, UserRole.OWNER,
    )]

    def post(self, request):
        serializer = CreateCheckoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data
        is_owner = getattr(request.user, 'usr_role', None) == UserRole.OWNER

        if is_owner:
            owner = OwnerProfile.objects.filter(usr_id=request.user).first()
            if owner is None:
                return Response(
                    {'detail': 'Owner profile not found.', 'code': 'OWNER_NOT_FOUND'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            pet = Pet.objects.filter(
                pet_id=validated['pet_id'],
                own_id=owner,
                pet_is_active=True,
                pet_deleted_at__isnull=True,
            ).first()
            if pet is None:
                return Response(
                    {'detail': 'Pet not found.', 'code': 'PET_NOT_FOUND'},
                    status=status.HTTP_404_NOT_FOUND,
                )
            staff = None
        else:
            staff = StaffProfile.objects.filter(usr_id=request.user).first()
            if staff is None:
                return Response(
                    {'detail': 'Staff profile not found.', 'code': 'STAFF_NOT_FOUND'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            pet = Pet.objects.filter(
                pet_id=validated['pet_id'], pet_is_active=True,
            ).first()
            if pet is None:
                return Response(
                    {'detail': 'Pet not found.', 'code': 'PET_NOT_FOUND'},
                    status=status.HTTP_404_NOT_FOUND,
                )
            owner = pet.own_id

        slot = VetSlot.objects.filter(vsl_id=validated['slot_id']).select_related(
            'cln_id',
        ).first()
        if slot is None:
            return Response(
                {'detail': 'Slot not found.', 'code': 'SLOT_NOT_FOUND'},
                status=status.HTTP_404_NOT_FOUND,
            )

        clinic = slot.cln_id
        if not is_owner and clinic.cln_id != staff.cln_id_id:
            return Response(
                {'detail': 'Slot not found.', 'code': 'SLOT_NOT_FOUND'},
                status=status.HTTP_404_NOT_FOUND,
            )

        screening = None
        screening_id = validated.get('screening_id')
        if screening_id:
            screening = AiScreening.objects.filter(
                ais_id=screening_id, pet_id=pet,
            ).first()
            if screening is None:
                return Response(
                    {
                        'detail': 'A skin scan result is required for this pet before booking.',
                        'code': 'SCREENING_NOT_FOUND',
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )

        try:
            payment = PaymentService.create_checkout(
                clinic=clinic,
                owner=owner,
                pet=pet,
                slot=slot,
                apt_type=validated['apt_type'],
                method=validated['method'],
                is_owner=is_owner,
                reason=validated.get('reason', ''),
                screening=screening,
                actor_user_id=request.user.usr_id,
                ip_address=request.META.get('REMOTE_ADDR'),
            )
        except PaymentError as exc:
            return _error(exc)

        return Response(PaymentSerializer(payment).data, status=status.HTTP_201_CREATED)


class PaymentListView(APIView):
    """Clinic-scoped payment history."""

    permission_classes = [HasRole(UserRole.RECEPTIONIST, UserRole.CLINIC_ADMIN)]

    def get(self, request):
        staff = StaffProfile.objects.filter(usr_id=request.user).first()
        if staff is None:
            return Response(
                {'detail': 'Staff profile not found.', 'code': 'STAFF_NOT_FOUND'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return _list_response(request, clinic_id=staff.cln_id_id)


class OwnerPaymentListView(APIView):
    """The caller's own receipts; owners have no clinic-wide visibility."""

    permission_classes = [HasRole(UserRole.OWNER)]

    def get(self, request):
        owner = OwnerProfile.objects.filter(usr_id=request.user).first()
        if owner is None:
            return Response(
                {'detail': 'Owner profile not found.', 'code': 'OWNER_NOT_FOUND'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return _list_response(request, owner_id=owner.own_id)


def _list_response(request, **scope) -> Response:
    """Shared filters, pagination and envelope for both payment lists.

    `scope` is the only difference between them: `clinic_id=` for staff,
    `owner_id=` for an owner reading their own payments.
    """
    date_from, date_from_error = _parse_date(request.query_params.get('date_from'))
    if date_from_error:
        return Response(
            {'detail': date_from_error, 'code': 'VALIDATION_ERROR'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    date_to, date_to_error = _parse_date(request.query_params.get('date_to'))
    if date_to_error:
        return Response(
            {'detail': date_to_error, 'code': 'VALIDATION_ERROR'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        page = max(int(request.query_params.get('page', 1)), 1)
        page_size = min(max(int(request.query_params.get('page_size', 20)), 1), 100)
    except ValueError:
        return Response(
            {'detail': 'page and page_size must be integers.', 'code': 'VALIDATION_ERROR'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    data = PaymentService.list_payments(
        **scope,
        pay_status=request.query_params.get('status'),
        method=request.query_params.get('method'),
        reference=request.query_params.get('reference'),
        appointment_id=request.query_params.get('appointment'),
        date_from=date_from,
        date_to=date_to,
        page=page,
        page_size=page_size,
    )
    serializer = PaymentSerializer(data['results'], many=True)
    return Response({
        'total': data['total'],
        'page': data['page'],
        'page_size': data['page_size'],
        'total_pages': data['total_pages'],
        'results': serializer.data,
    })


class PaymentAccessMixin:
    """Owners see their own payments, staff see their clinic's."""

    @staticmethod
    def _find(request, pay_id):
        payment = Payment.objects.select_related(
            'cln_id', 'own_id__usr_id', 'apt_id',
        ).filter(pay_id=pay_id).first()
        if payment is None:
            return None

        if getattr(request.user, 'usr_role', None) == UserRole.OWNER:
            allowed = payment.own_id.usr_id_id == request.user.usr_id
        else:
            staff = StaffProfile.objects.filter(usr_id=request.user).first()
            allowed = staff is not None and payment.cln_id_id == staff.cln_id_id
        return payment if allowed else None


class PaymentDetailView(PaymentAccessMixin, APIView):
    permission_classes = [HasRole(
        UserRole.RECEPTIONIST, UserRole.CLINIC_ADMIN, UserRole.OWNER,
    )]

    def get(self, request, pay_id):
        payment = self._find(request, pay_id)
        if payment is None:
            return Response(
                {'detail': 'Payment not found.', 'code': 'PAYMENT_NOT_FOUND'},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(PaymentSerializer(payment).data)


class PaymentCancelView(PaymentAccessMixin, APIView):
    permission_classes = [HasRole(
        UserRole.RECEPTIONIST, UserRole.CLINIC_ADMIN, UserRole.OWNER,
    )]

    def post(self, request, pay_id):
        payment = self._find(request, pay_id)
        if payment is None:
            return Response(
                {'detail': 'Payment not found.', 'code': 'PAYMENT_NOT_FOUND'},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            payment = PaymentService.cancel(
                payment=payment,
                actor_user_id=request.user.usr_id,
                ip_address=request.META.get('REMOTE_ADDR'),
            )
        except PaymentError as exc:
            return _error(exc)

        return Response(PaymentSerializer(payment).data)


class PaymentMockStatusView(APIView):
    """Poll a mock checkout by its signed link (no session required)."""

    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request, reference):
        try:
            payment = PaymentService.get_for_mock_link(
                reference, request.query_params.get('token', ''),
            )
        except PaymentError as exc:
            return _error(exc)
        return Response(PaymentSerializer(payment).data)


class PaymentMockConfirmView(APIView):
    """Drive a mock checkout to PAID / FAILED / EXPIRED."""

    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request, reference):
        serializer = MockConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data

        try:
            payment = PaymentService.confirm_mock(
                reference=reference,
                token=validated['token'],
                outcome=validated['outcome'],
                ip_address=request.META.get('REMOTE_ADDR'),
            )
        except PaymentError as exc:
            return _error(exc)

        return Response(PaymentSerializer(payment).data)


class XenditWebhookView(APIView):
    """Xendit callback; the shared ``x-callback-token`` is its only credential."""

    authentication_classes = []
    permission_classes = [AllowAny]

    @staticmethod
    def _session(document):
        """Return the payment-session object from the event envelope.

        Xendit sends ``{event, data: {...session...}}``. A nested ``data.data``
        is tolerated so an envelope change cannot silently drop references.
        """
        data = document.get('data') or {}
        inner = data.get('data')
        return inner if isinstance(inner, dict) else data

    def post(self, request):
        secret = settings.XENDIT_CALLBACK_TOKEN
        if not secret:
            return Response(
                {
                    'detail': 'Webhook token is not configured.',
                    'code': 'WEBHOOK_NOT_CONFIGURED',
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        token = request.META.get('HTTP_X_CALLBACK_TOKEN', '')
        if not XenditProvider().verify_webhook_signature(request.body, token, secret):
            return Response(
                {'detail': 'Invalid callback token.', 'code': 'INVALID_SIGNATURE'},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            document = json.loads(request.body)
        except (ValueError, UnicodeDecodeError):
            return Response(
                {'detail': 'Invalid payload.', 'code': 'INVALID_PAYLOAD'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        event_type = document.get('event') or document.get('type')
        session = self._session(document)
        reference = session.get('reference_id') or document.get('reference_id')

        if not reference or event_type not in PaymentService.PROVIDER_EVENTS:
            # Acknowledge unknown events so Xendit stops retrying, but leave a
            # trace for anyone debugging the endpoint.
            logger.info('Xendit webhook ignored (event=%s)', event_type)
            return Response({'received': True})

        try:
            PaymentService.apply_provider_event(
                reference=reference,
                event_type=event_type,
                payload={'event_id': session.get('id')},
            )
        except PaymentError as exc:
            logger.warning(
                'Xendit webhook could not be applied: %s (%s)',
                exc.detail, exc.code,
            )
            if exc.status_code == status.HTTP_404_NOT_FOUND:
                return Response({'received': True})
            return _error(exc)

        return Response({'received': True})


class PayMongoWebhookView(APIView):
    """PayMongo callback; the signature is the only credential it presents."""

    authentication_classes = []
    permission_classes = [AllowAny]

    @staticmethod
    def _reference(payload):
        """Read ``reference_number`` whichever way the webhook nests it.

        ``/v2/checkout_sessions`` (the API the adapter calls) delivers
        ``{type, resource, data: {id, attributes: {reference_number}}}``, so the
        session sits one level below the event. Older envelopes wrap the
        session under ``attributes`` instead; both are accepted.
        """
        attributes = payload.get('attributes') or {}
        session = payload.get('data') or {}
        session_attributes = session.get('attributes') or {}
        legacy = attributes.get('data') or {}
        legacy_attributes = legacy.get('attributes') or {}
        return (
            session_attributes.get('reference_number')
            or legacy_attributes.get('reference_number')
            or legacy.get('reference_number')
            or session.get('reference_number')
            or attributes.get('reference_number')
        )

    def post(self, request):
        secret = settings.PAYMONGO_WEBHOOK_SECRET
        if not secret:
            return Response(
                {
                    'detail': 'Webhook secret is not configured.',
                    'code': 'WEBHOOK_NOT_CONFIGURED',
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        signature = request.META.get('HTTP_PAYMONGO_SIGNATURE', '')
        if not PayMongoProvider().verify_webhook_signature(
            request.body, signature, secret,
        ):
            return Response(
                {'detail': 'Invalid signature.', 'code': 'INVALID_SIGNATURE'},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            document = json.loads(request.body)
        except (ValueError, UnicodeDecodeError):
            return Response(
                {'detail': 'Invalid payload.', 'code': 'INVALID_PAYLOAD'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        payload = document.get('data') or {}
        event_type = payload.get('type') or (payload.get('attributes') or {}).get('type')
        reference = self._reference(payload)

        if not reference or event_type not in PaymentService.PROVIDER_EVENTS:
            # Unknown or unrelated event: acknowledge it so PayMongo stops
            # retrying, but leave a trace for anyone debugging the endpoint.
            logger.info('PayMongo webhook ignored (type=%s)', event_type)
            return Response({'received': True})

        try:
            PaymentService.apply_provider_event(
                reference=reference,
                event_type=event_type,
                payload={'event_id': payload.get('id')},
            )
        except PaymentError as exc:
            logger.warning(
                'PayMongo webhook could not be applied: %s (%s)',
                exc.detail, exc.code,
            )
            if exc.status_code == status.HTTP_404_NOT_FOUND:
                return Response({'received': True})
            return _error(exc)

        return Response({'received': True})
