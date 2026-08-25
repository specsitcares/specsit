import builtins
from unittest.mock import patch

from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.sales.models import Order, PaymentGatewayConfig


class PaymentInitiateViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(username='tester', password='secret123')
        self.client.force_authenticate(self.user)
        self.order = Order.objects.create(user=self.user, total_amount=100, paid_amount=0, balance_amount=100)
        PaymentGatewayConfig.objects.create(
            name='razorpay',
            key_id='rzp_test_123',
            key_secret='secret',
            is_sandbox=False,
            is_active=True,
        )

    def test_initiate_falls_back_to_mock_when_razorpay_package_missing(self):
        original_import = builtins.__import__

        def fake_import(name, globals=None, locals=None, fromlist=(), level=0):
            if name == 'razorpay':
                raise ModuleNotFoundError('No module named razorpay')
            return original_import(name, globals, locals, fromlist, level)

        with patch('builtins.__import__', side_effect=fake_import):
            response = self.client.post('/api/sales/payments/initiate/', {
                'order_id': self.order.id,
                'amount': 100,
                'payment_method': 'complete_online',
            }, format='json')

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['is_mock'])
        self.assertEqual(response.data['status'], 'created')


class OrderWritePermissionTests(TestCase):
    """A customer owns their order row, so the queryset lets them write to it.
    These pin down that they cannot change what the order MEANS."""

    def setUp(self):
        self.client = APIClient()
        User = get_user_model()
        self.customer = User.objects.create_user(username='cust', password='pw-8sk2mfhd')
        self.other = User.objects.create_user(username='other', password='pw-8sk2mfhd')
        self.staff = User.objects.create_user(username='boss', password='pw-8sk2mfhd', is_staff=True)
        self.order = Order.objects.create(
            user=self.customer, total_amount=5000, paid_amount=0, balance_amount=5000,
            payment_status='pending', order_status='pending', payment_method='cod',
        )

    def test_customer_cannot_mark_own_order_paid(self):
        self.client.force_authenticate(self.customer)
        res = self.client.patch(f'/api/sales/orders/{self.order.id}/',
                                {'payment_status': 'paid', 'paid_amount': '0.00'}, format='json')
        self.assertEqual(res.status_code, 403)
        self.order.refresh_from_db()
        self.assertEqual(self.order.payment_status, 'pending')

    def test_customer_cannot_delete_own_order(self):
        self.client.force_authenticate(self.customer)
        res = self.client.delete(f'/api/sales/orders/{self.order.id}/')
        self.assertEqual(res.status_code, 403)
        self.assertTrue(Order.objects.filter(pk=self.order.pk).exists())

    def test_other_customer_cannot_read_the_order(self):
        self.client.force_authenticate(self.other)
        res = self.client.get(f'/api/sales/orders/{self.order.id}/')
        self.assertEqual(res.status_code, 404)

    def test_anonymous_cannot_list_orders(self):
        res = self.client.get('/api/sales/orders/')
        self.assertIn(res.status_code, (401, 403))

    def test_staff_can_still_update_status(self):
        # NB: must be a value from ORDER_STATUS_CHOICES. The codebase also writes
        # 'pending' / 'confirmed' / 'cancelled' directly to the model, which are
        # NOT in that list — Django only enforces choices at the serializer layer,
        # so those paths work while an API write of the same value is rejected.
        self.client.force_authenticate(self.staff)
        res = self.client.patch(f'/api/sales/orders/{self.order.id}/',
                                {'order_status': 'ready_to_dispatch'}, format='json')
        self.assertEqual(res.status_code, 200)
        self.order.refresh_from_db()
        self.assertEqual(self.order.order_status, 'ready_to_dispatch')

    def test_staff_can_still_update_total_amount(self):
        self.client.force_authenticate(self.staff)
        res = self.client.patch(f'/api/sales/orders/{self.order.id}/',
                                {'total_amount': '4500.00'}, format='json')
        self.assertEqual(res.status_code, 200)
        self.order.refresh_from_db()
        self.assertEqual(str(self.order.total_amount), '4500.00')

    def test_customer_cannot_change_total_amount(self):
        self.client.force_authenticate(self.customer)
        res = self.client.patch(f'/api/sales/orders/{self.order.id}/',
                                {'total_amount': '1.00'}, format='json')
        self.assertEqual(res.status_code, 403)
        self.order.refresh_from_db()
        self.assertEqual(str(self.order.total_amount), '5000.00')


class CouponWritePermissionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.customer = get_user_model().objects.create_user(username='c2', password='pw-8sk2mfhd')

    def test_customer_cannot_create_a_coupon(self):
        self.client.force_authenticate(self.customer)
        res = self.client.post('/api/sales/coupons/', {
            'code': 'FREESTUFF', 'discount_percentage': 100, 'is_active': True,
        }, format='json')
        self.assertEqual(res.status_code, 403)


class WebhookConfigTests(TestCase):
    def test_webhook_refuses_when_secret_unset(self):
        import os
        old = os.environ.pop('RAZORPAY_WEBHOOK_SECRET', None)
        try:
            res = APIClient().post('/api/sales/payments/webhook/',
                                   {'event': 'payment.captured'}, format='json')
            self.assertEqual(res.status_code, 503)
        finally:
            if old is not None:
                os.environ['RAZORPAY_WEBHOOK_SECRET'] = old


# Cost of the order list for this fixture (2 orders, one of them a replacement).
# Pinned so the exchange_info prefetches cannot be quietly moved back out of the
# shared set: without them this climbs, while the correctness assertions above
# still pass. Raise it deliberately if the list legitimately grows.
EXCHANGE_LIST_QUERIES = 25


class ExchangeInfoOnListTests(TestCase):
    """exchange_info must render on the LIST, not just the detail view.

    OrderViewSet uses one serializer for both actions and `exchange_info` is in
    Meta.fields, so the list renders it too. That is why source_returns__* and
    replaces_order__items__* belong in the shared prefetch set rather than a
    detail-only branch — the live database has no replacement orders, so a
    regression here would be invisible until the first real exchange.
    """

    @classmethod
    def setUpTestData(cls):
        from apps.catalog.models import Category, FrameProduct, FrameVariant
        from apps.sales.models import OrderItem, ReturnRequest

        cls.user = get_user_model().objects.create_user(
            username='exchange-cx', password='pw-9x2mfk4q',
        )
        category = Category.objects.create(name='Exchange Category')
        product = FrameProduct.objects.create(
            title='Exchange Frame', category=category, is_active=True,
        )
        variant = FrameVariant.objects.create(
            product=product, sku='EXCH-1', variant_name='Original',
            color='Matte Black', stock=5, selling_price=2000, is_listed=True,
        )

        cls.original = Order.objects.create(
            user=cls.user, total_amount=2000, order_status='delivered',
        )
        original_item = OrderItem.objects.create(
            order=cls.original, variant=variant, quantity=1, price_at_purchase=2000,
        )
        cls.replacement = Order.objects.create(
            user=cls.user, total_amount=2000, order_status='confirmed',
            is_replacement=True, replaces_order=cls.original,
        )
        # source_returns is the reverse of ReturnRequest.replacement_order, so this
        # exercises get_exchange_info's PRIMARY path. (Omitting replacement_order
        # would silently fall through to the replaces_order.items fallback and the
        # source_returns prefetches would never be touched.)
        ReturnRequest.objects.create(
            order=cls.original, order_item=original_item,
            replacement_order=cls.replacement,
            request_type='replacement', status='replaced',
        )

    def test_exchange_info_renders_on_the_list(self):
        client = APIClient()
        client.force_authenticate(user=self.user)
        response = client.get('/api/sales/orders/', {'page_size': 50})
        self.assertEqual(response.status_code, 200)

        rows = {row['id']: row for row in response.data['results']}
        self.assertIn(self.replacement.id, rows, 'replacement order missing from list')

        info = rows[self.replacement.id]['exchange_info']
        self.assertIsNotNone(info, 'exchange_info is null on the LIST — the '
                                   'source_returns / replaces_order prefetches have '
                                   'been moved out of the shared set.')
        self.assertEqual(info['source_order_id'], self.original.id)
        self.assertEqual(info['original_sku'], 'EXCH-1')

        # A non-replacement order still reports None, as before.
        self.assertIsNone(rows[self.original.id]['exchange_info'])

    def test_exchange_info_costs_no_extra_queries(self):
        """The correctness test above passes with or without the prefetches — a
        missing prefetch is an N+1, not a wrong answer. Only a query count catches
        it, so pin one. Raise the number deliberately if the list legitimately grows."""
        client = APIClient()
        client.force_authenticate(user=self.user)
        client.get('/api/sales/orders/', {'page_size': 50})  # warm SiteSettings cache
        with self.assertNumQueries(EXCHANGE_LIST_QUERIES):
            client.get('/api/sales/orders/', {'page_size': 50})

    def test_list_and_detail_agree_on_exchange_info(self):
        client = APIClient()
        client.force_authenticate(user=self.user)
        listed = {r['id']: r for r in client.get('/api/sales/orders/', {'page_size': 50}).data['results']}
        detail = client.get(f'/api/sales/orders/{self.replacement.id}/').data
        self.assertEqual(listed[self.replacement.id]['exchange_info'], detail['exchange_info'])
