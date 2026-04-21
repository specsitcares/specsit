import math
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.conf import settings
from .models import PaymentGatewayConfig, Order, Payment


def _get_razorpay_client():
    config = PaymentGatewayConfig.objects.filter(name='razorpay', is_active=True).first()
    return config, (config and config.key_id and config.key_secret and not config.is_sandbox)


class PaymentInitiateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        payment_method = request.data.get('payment_method')
        amount = request.data.get('amount')
        order_id = request.data.get('order_id')

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
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class PaymentVerifyView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        razorpay_payment_id = request.data.get('razorpay_payment_id')
        razorpay_order_id = request.data.get('razorpay_order_id')
        razorpay_signature = request.data.get('razorpay_signature')
        local_order_id = request.data.get('local_order_id')
        is_phase2 = request.data.get('is_phase2', False)

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
            except Exception:
                order.payment_status = 'failed'
                order.save(update_fields=['payment_status'])
                return Response({'error': 'Invalid payment signature'}, status=status.HTTP_400_BAD_REQUEST)

        # Payment verified — update order based on method
        payment_method = order.payment_method
        transaction_id = razorpay_payment_id or f"mock_{local_order_id}"

        if is_phase2:
            # Phase 2 of partial payment — clear remaining balance
            amount_paid = float(order.balance_amount)
            Payment.objects.get_or_create(
                transaction_id=transaction_id,
                defaults={
                    'order': order,
                    'payment_method': 'razorpay',
                    'amount_paid': amount_paid,
                    'payment_gateway': 'razorpay',
                    'payment_status': 'completed',
                }
            )
            order.paid_amount = float(order.paid_amount) + amount_paid
            order.balance_amount = 0
            order.payment_status = 'paid'
            order.razorpay_payment_id = razorpay_payment_id
            order.save(update_fields=['paid_amount', 'balance_amount', 'payment_status', 'razorpay_payment_id'])
            return Response({'status': 'verified', 'payment_status': 'paid'})

        if payment_method == 'complete_online':
            amount_paid = float(order.total_amount)
            order.payment_status = 'paid'
            order.paid_amount = amount_paid
            order.balance_amount = 0
        elif payment_method == 'partial_payment':
            phase1 = math.ceil(float(order.total_amount) / 2)
            amount_paid = phase1
            order.payment_status = 'partial_paid'
            order.paid_amount = amount_paid
            order.balance_amount = float(order.total_amount) - amount_paid
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
        order.save()

        Payment.objects.get_or_create(
            transaction_id=transaction_id,
            defaults={
                'order': order,
                'payment_method': 'razorpay',
                'amount_paid': amount_paid,
                'payment_gateway': 'razorpay',
                'payment_status': 'completed',
            }
        )

        return Response({'status': 'verified', 'payment_status': order.payment_status, 'is_mock': not is_live})
