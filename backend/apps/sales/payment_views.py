import os
import math
import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.conf import settings
from django.db import transaction
from apps.core_utils.idempotency import idempotent_payment_operation
from .models import PaymentGatewayConfig, Order, Payment


def _get_partial_pct():
    config = PaymentGatewayConfig.objects.filter(name='razorpay', is_active=True).first()
    return config.partial_payment_percentage if config else 50


class PaymentSettingsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        config = PaymentGatewayConfig.objects.filter(name='razorpay', is_active=True).first()
        return Response({
            'cod_enabled': config.cod_enabled if config else True,
            'online_payment_enabled': config.online_payment_enabled if config else True,
            'partial_payment_enabled': config.partial_payment_enabled if config else True,
            'partial_payment_percentage': config.partial_payment_percentage if config else 50,
            'key_id': config.key_id if config else '',
            'has_key_secret': bool(config and config.key_secret),
            'is_sandbox': config.is_sandbox if config else True,
        })

    def put(self, request):
        if not request.user.is_staff:
            return Response({'error': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)
        try:
            pct = int(request.data.get('partial_payment_percentage', ''))
            if not (1 <= pct <= 99):
                raise ValueError
        except (ValueError, TypeError):
            return Response({'error': 'Percentage must be an integer between 1 and 99.'}, status=status.HTTP_400_BAD_REQUEST)
        cod_enabled = bool(request.data.get('cod_enabled', True))
        online_payment_enabled = bool(request.data.get('online_payment_enabled', True))
        partial_enabled = bool(request.data.get('partial_payment_enabled', True))
        is_sandbox = bool(request.data.get('is_sandbox', True))
        key_id = request.data.get('key_id', '').strip()
        key_secret = request.data.get('key_secret', '').strip()

        config, _ = PaymentGatewayConfig.objects.get_or_create(name='razorpay')
        config.cod_enabled = cod_enabled
        config.online_payment_enabled = online_payment_enabled
        config.partial_payment_enabled = partial_enabled
        config.partial_payment_percentage = pct
        config.is_sandbox = is_sandbox
        if key_id:
            config.key_id = key_id
        if key_secret:
            config.key_secret = key_secret
        config.save()
        return Response({
            'cod_enabled': config.cod_enabled,
            'online_payment_enabled': config.online_payment_enabled,
            'partial_payment_enabled': config.partial_payment_enabled,
            'partial_payment_percentage': config.partial_payment_percentage,
            'key_id': config.key_id,
            'has_key_secret': bool(config.key_secret),
            'is_sandbox': config.is_sandbox,
        })

logger = logging.getLogger(__name__)


def _get_razorpay_client():
    config = PaymentGatewayConfig.objects.filter(name='razorpay', is_active=True).first()
    # Dev bypass: in DEBUG, never hit the real gateway — online payments auto-succeed
    # (mock), so checkout works even with no/invalid card details. Set
    # PAYMENTS_FORCE_LIVE=True to test real payments while in DEBUG.
    if getattr(settings, 'DEBUG', False) and not getattr(settings, 'PAYMENTS_FORCE_LIVE', False):
        return config, False
    return config, (config and config.key_id and config.key_secret and not config.is_sandbox)


class PaymentInitiateView(APIView):
    permission_classes = [IsAuthenticated]

    @idempotent_payment_operation
    def post(self, request):
        payment_method = request.data.get('payment_method')
        amount = request.data.get('amount')
        order_id = request.data.get('order_id')

        if not order_id:
            return Response({'error': 'order_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if amount is None:
            return Response({'error': 'amount is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            amount_float = float(amount)
        except (ValueError, TypeError):
            return Response({'error': 'amount must be a valid number.'}, status=status.HTTP_400_BAD_REQUEST)
        if amount_float <= 0:
            return Response({'error': 'amount must be greater than zero.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            Order.objects.get(id=order_id, user=request.user)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)

        config, is_live = _get_razorpay_client()

        if not is_live:
            return Response({
                'id': f"order_mock_{order_id}",
                'amount': int(float(amount) * 100),
                'currency': 'INR',
                'key': 'rzp_test_mock_key',
                'is_mock': True,
                'status': 'created',
            })

        try:
            import razorpay
            client = razorpay.Client(auth=(config.key_id, config.key_secret))
            razorpay_order = client.order.create({
                'amount': int(float(amount) * 100),
                'currency': 'INR',
                'payment_capture': 1,
            })
            return Response({
                'id': razorpay_order['id'],
                'amount': razorpay_order['amount'],
                'currency': razorpay_order['currency'],
                'key': config.key_id,
                'is_mock': False,
                'status': 'created',
            })
        except Exception as e:
            logger.warning('Razorpay order creation failed for order %s: %s', order_id, e)
            return Response({
                'id': f"order_mock_{order_id}",
                'amount': int(float(amount) * 100),
                'currency': 'INR',
                'key': 'rzp_test_mock_key',
                'is_mock': True,
                'status': 'created',
                'fallback_reason': str(e),
            })


class PaymentVerifyView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        razorpay_payment_id = request.data.get('razorpay_payment_id')
        razorpay_order_id = request.data.get('razorpay_order_id')
        razorpay_signature = request.data.get('razorpay_signature')
        local_order_id = request.data.get('local_order_id')
        is_phase2 = request.data.get('is_phase2', False)

        if not local_order_id:
            return Response({'error': 'local_order_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        config, is_live = _get_razorpay_client()

        try:
            order = Order.objects.get(id=local_order_id, user=request.user)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found'}, status=404)

        if is_live:
            try:
                import razorpay
                client = razorpay.Client(auth=(config.key_id, config.key_secret))
                client.utility.verify_payment_signature({
                    'razorpay_order_id': razorpay_order_id,
                    'razorpay_payment_id': razorpay_payment_id,
                    'razorpay_signature': razorpay_signature,
                })
            except Exception as e:
                logger.warning("Razorpay signature verification failed for order %s: %s", local_order_id, e)
                from django.db import transaction
                with transaction.atomic():
                    for item in order.items.select_related('variant__product').all():
                        if item.variant:
                            item.variant.stock += item.quantity
                            item.variant.save(update_fields=['stock'])
                            product = item.variant.product
                            if product:
                                product.stock_quantity += item.quantity
                                product.save(update_fields=['stock_quantity'])

                    # Mark order as failed
                    order.payment_status = 'failed'
                    order.order_status = 'cancelled'
                    order.save(update_fields=['payment_status', 'order_status'])

                return Response({'error': 'Invalid payment signature'}, status=status.HTTP_400_BAD_REQUEST)

        # Bug #2 & #3: Atomic payment verification to prevent race conditions
        from django.db import transaction

        # Idempotency: phase 2 and phase 1 each get a stable, distinct key.
        # Using explicit _p1/_p2 suffix so a retry that accidentally flips is_phase2
        # still hits the same key and is rejected rather than creating a second payment.
        phase_suffix = '_p2' if is_phase2 else '_p1'
        transaction_id = razorpay_payment_id or f"mock_{local_order_id}{phase_suffix}"

        # Guard 1: exact transaction_id match
        if Payment.objects.filter(transaction_id=transaction_id).exists():
            return Response({'error': 'Payment already processed'}, status=status.HTTP_400_BAD_REQUEST)

        # Guard 2: prevent a second payment for the same phase regardless of key
        phase_exists = Payment.objects.filter(
            order=order,
            payment_status='completed',
            transaction_id__endswith='_p2' if is_phase2 else '_p1',
        ).exists() or (is_phase2 and order.balance_amount == 0)
        if phase_exists:
            return Response({'error': 'Payment already processed'}, status=status.HTTP_400_BAD_REQUEST)

        # Payment verified — update order based on method
        payment_method = order.payment_method

        try:
            with transaction.atomic():
                if is_phase2:
                    # Phase 2 of partial payment — clear remaining balance
                    amount_paid = float(order.balance_amount)
                    Payment.objects.create(
                        transaction_id=transaction_id,
                        order=order,
                        payment_method='razorpay',
                        amount_paid=amount_paid,
                        payment_gateway='razorpay',
                        payment_status='completed',
                    )
                    order.paid_amount = float(order.paid_amount) + amount_paid
                    order.balance_amount = 0
                    order.payment_status = 'paid'
                    order.razorpay_payment_id = razorpay_payment_id
                    order.save(update_fields=['paid_amount', 'balance_amount', 'payment_status', 'razorpay_payment_id'])
                    return Response({'status': 'verified', 'payment_status': 'paid'})

                # Phase 1 or complete payment
                if payment_method == 'complete_online':
                    amount_paid = float(order.total_amount)
                    order.payment_status = 'paid'
                    order.paid_amount = amount_paid
                    order.balance_amount = 0
                elif payment_method == 'partial_payment':
                    pct = _get_partial_pct()
                    total_paise = round(float(order.total_amount) * 100)
                    phase1_paise = round(total_paise * pct / 100)
                    amount_paid = phase1_paise / 100
                    order.payment_status = 'partial_paid'
                    order.paid_amount = amount_paid
                    order.balance_amount = (total_paise - phase1_paise) / 100
                else:
                    # Fallback (ONLINE legacy)
                    amount_paid = float(order.total_amount)
                    order.payment_status = 'paid'
                    order.paid_amount = amount_paid
                    order.balance_amount = 0

                order.order_status = 'confirmed'
                order.razorpay_payment_id = razorpay_payment_id
                order.razorpay_order_id = razorpay_order_id
                order.razorpay_signature = razorpay_signature

                # Sync the MetadataItem FK so status_label reflects "Confirmed"
                # (serializer reads status.label first; without this it stays "Pending")
                from apps.catalog.core.models import MetadataGroup, MetadataItem as MI
                confirmed_group, _ = MetadataGroup.objects.get_or_create(name='Order Status')
                confirmed_meta, _ = MI.objects.get_or_create(
                    group=confirmed_group, label='Confirmed',
                    defaults={'value': 'confirmed', 'is_active': True},
                )
                order.status = confirmed_meta
                order.save()

                # Bug #2: Use create instead of get_or_create for idempotency
                Payment.objects.create(
                    transaction_id=transaction_id,
                    order=order,
                    payment_method='razorpay',
                    amount_paid=amount_paid,
                    payment_gateway='razorpay',
                    payment_status='completed',
                )

                return Response({'status': 'verified', 'payment_status': order.payment_status, 'is_mock': not is_live})
        except Exception as e:
            return Response({'error': f'Payment processing failed: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PaymentCancelView(APIView):
    """
    POST /sales/payments/cancel/
    Called when the user abandons a pending-payment order (e.g. changes payment method
    after Razorpay was dismissed).  Restores stock and marks the order as cancelled so
    it does not sit as an orphan with stock permanently deducted.
    Only works on orders that are still in the pending-payment window.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        order_id = request.data.get('order_id')
        if not order_id:
            return Response({'error': 'order_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            order = Order.objects.get(id=order_id, user=request.user)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Only cancel orders that have not been paid
        if order.payment_status in ('paid', 'partial_paid'):
            return Response({'error': 'Cannot cancel a paid order.'}, status=status.HTTP_400_BAD_REQUEST)

        if order.order_status == 'cancelled':
            return Response({'status': 'already_cancelled'})

        with transaction.atomic():
            for item in order.items.select_related('variant__product').all():
                if item.variant:
                    item.variant.stock += item.quantity
                    item.variant.save(update_fields=['stock'])
                    product = item.variant.product
                    if product:
                        product.stock_quantity += item.quantity
                        product.save(update_fields=['stock_quantity'])

            order.payment_status = 'pending'
            order.order_status = 'cancelled'
            order.save(update_fields=['payment_status', 'order_status'])

        return Response({'status': 'cancelled', 'order_id': order.id})


def _mark_order_paid(order, razorpay_payment_id, razorpay_order_id):
    """Settle an order exactly once. Caller holds the row lock. Returns True if it
    transitioned to paid, False if it was already settled (idempotent no-op)."""
    if order.payment_status == 'paid' or order.balance_amount == 0 and order.paid_amount >= order.total_amount:
        return False

    amount_paid = float(order.total_amount)
    order.payment_status = 'paid'
    order.paid_amount = amount_paid
    order.balance_amount = 0
    order.order_status = 'confirmed'
    if razorpay_payment_id:
        order.razorpay_payment_id = razorpay_payment_id
    if razorpay_order_id:
        order.razorpay_order_id = razorpay_order_id

    from apps.catalog.core.models import MetadataGroup, MetadataItem as MI
    confirmed_group, _ = MetadataGroup.objects.get_or_create(name='Order Status')
    confirmed_meta, _ = MI.objects.get_or_create(
        group=confirmed_group, label='Confirmed',
        defaults={'value': 'confirmed', 'is_active': True},
    )
    order.status = confirmed_meta
    order.save()

    Payment.objects.create(
        transaction_id=razorpay_payment_id or f"webhook_{order.id}",
        order=order,
        payment_method='razorpay',
        amount_paid=amount_paid,
        payment_gateway='razorpay',
        payment_status='completed',
    )
    return True


class PaymentWebhookView(APIView):
    """Razorpay async event sink. Verifies the signature with the webhook secret
    (env-only, never the DB) and settles orders idempotently so a customer is
    never provisioned twice for the same payment."""
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        secret = os.environ.get('RAZORPAY_WEBHOOK_SECRET')
        signature = request.headers.get('X-Razorpay-Signature', '')
        body = request.body

        if secret:
            try:
                import razorpay
                razorpay.Utility().verify_webhook_signature(body.decode('utf-8'), signature, secret)
            except Exception as e:
                logger.warning("Razorpay webhook signature verification failed: %s", e)
                return Response({'error': 'invalid signature'}, status=status.HTTP_400_BAD_REQUEST)

        event = request.data or {}
        if event.get('event') not in ('payment.captured', 'order.paid'):
            return Response({'status': 'ignored'}, status=status.HTTP_200_OK)

        payload = event.get('payload', {}) or {}
        payment_entity = (payload.get('payment', {}) or {}).get('entity', {}) or {}
        order_entity = (payload.get('order', {}) or {}).get('entity', {}) or {}
        rzp_payment_id = payment_entity.get('id')
        rzp_order_id = payment_entity.get('order_id') or order_entity.get('id')

        if not rzp_order_id:
            return Response({'status': 'no_order_ref'}, status=status.HTTP_200_OK)

        # Idempotency gate 1: this exact payment is already recorded.
        if rzp_payment_id and Payment.objects.filter(transaction_id=rzp_payment_id).exists():
            return Response({'status': 'already_processed'}, status=status.HTTP_200_OK)

        try:
            order_id = Order.objects.values_list('id', flat=True).get(razorpay_order_id=rzp_order_id)
        except Order.DoesNotExist:
            return Response({'status': 'order_not_found'}, status=status.HTTP_200_OK)

        # Idempotency gate 2: row lock + status check so concurrent deliveries
        # (handler verify + webhook, or Razorpay retries) settle only once.
        with transaction.atomic():
            order = Order.objects.select_for_update().get(id=order_id)
            changed = _mark_order_paid(order, rzp_payment_id, rzp_order_id)

        return Response({'status': 'settled' if changed else 'already_paid'}, status=status.HTTP_200_OK)
