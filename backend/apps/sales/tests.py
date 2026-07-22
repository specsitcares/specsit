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
