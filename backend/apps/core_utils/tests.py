"""
Tests for the idempotency module.
"""
from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from apps.core.models import IdempotencyRecord
from apps.core.idempotency import (
    generate_idempotency_key,
    get_or_create_idempotency_record,
    store_idempotency_result,
    retrieve_idempotency_result,
)
import uuid


class IdempotencyKeyGenerationTests(TestCase):
    """Test idempotency key generation."""
    
    def test_generate_key_with_resource(self):
        """Test key generation with resource ID."""
        key = generate_idempotency_key(
            user_id=123,
            operation='create_order',
            resource_id=456
        )
        self.assertEqual(key, '123:create_order:456')
    
    def test_generate_key_without_resource(self):
        """Test key generation without resource ID."""
        key = generate_idempotency_key(
            user_id=123,
            operation='create_order'
        )
        self.assertEqual(key, '123:create_order')
    
    def test_key_consistency(self):
        """Test that same inputs produce same key."""
        key1 = generate_idempotency_key(123, 'op', 456)
        key2 = generate_idempotency_key(123, 'op', 456)
        self.assertEqual(key1, key2)


class IdempotencyRecordTests(TestCase):
    """Test IdempotencyRecord model and utilities."""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
    
    def test_record_creation(self):
        """Test creating an idempotency record."""
        record = IdempotencyRecord.objects.create(
            idempotency_key='test-key-123',
            operation='test_op',
            user=self.user,
        )
        self.assertEqual(record.idempotency_key, 'test-key-123')
        self.assertEqual(record.operation, 'test_op')
        self.assertEqual(record.user, self.user)
        self.assertFalse(record.is_success)
    
    def test_get_or_create_idempotency_record_new(self):
        """Test creating a new idempotency record."""
        record, created = get_or_create_idempotency_record(
            idempotency_key='new-key-123',
            operation='create_order',
            user_id=self.user.id,
        )
        self.assertTrue(created)
        self.assertEqual(record.idempotency_key, 'new-key-123')
        self.assertIsNotNone(record.id)
    
    def test_get_or_create_idempotency_record_existing(self):
        """Test retrieving an existing idempotency record."""
        # Create initial record
        record1, created1 = get_or_create_idempotency_record(
            idempotency_key='existing-key',
            operation='create_order',
            user_id=self.user.id,
        )
        self.assertTrue(created1)
        
        # Get the same record
        record2, created2 = get_or_create_idempotency_record(
            idempotency_key='existing-key',
            operation='create_order',
            user_id=self.user.id,
        )
        self.assertFalse(created2)
        self.assertEqual(record1.id, record2.id)
    
    def test_store_and_retrieve_result(self):
        """Test storing and retrieving results."""
        record, _ = get_or_create_idempotency_record(
            idempotency_key='result-key',
            operation='create_order',
            user_id=self.user.id,
        )
        
        test_data = {'order_id': 123, 'amount': 500}
        store_idempotency_result(
            record=record,
            status_code=201,
            response_data=test_data,
            is_success=True,
        )
        
        # Retrieve and verify
        status_code, response_data = retrieve_idempotency_result(record)
        self.assertEqual(status_code, 201)
        self.assertEqual(response_data, test_data)
    
    def test_idempotency_record_unique_key(self):
        """Test that idempotency key is unique."""
        IdempotencyRecord.objects.create(
            idempotency_key='unique-key',
            operation='test_op',
            user=self.user,
        )
        
        with self.assertRaises(Exception):
            IdempotencyRecord.objects.create(
                idempotency_key='unique-key',
                operation='different_op',
                user=self.user,
            )


class IdempotentEndpointTests(APITestCase):
    """Test idempotent endpoint decorator."""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)
    
    def test_missing_idempotency_key(self):
        """Test endpoint without Idempotency-Key header."""
        # This would need an actual endpoint to test properly
        # For now, just verify the decorator logic would catch it
        pass
    
    def test_duplicate_request_returns_cached_result(self):
        """Test that duplicate requests return cached results."""
        # This would need an actual endpoint to test properly
        pass


class IdempotencyCleanupTests(TestCase):
    """Test cleanup of expired records."""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
    
    def test_stale_record_detection(self):
        """Test detection of stale records."""
        from django.utils import timezone
        from datetime import timedelta
        
        # Create record that's 2 days old
        record = IdempotencyRecord.objects.create(
            idempotency_key='stale-key',
            operation='create_order',
            user=self.user,
        )
        # Set created_at to 2 days ago
        IdempotencyRecord.objects.filter(id=record.id).update(
            created_at=timezone.now() - timedelta(days=2)
        )
        
        # Try to get it with max_age of 1 day
        retrieved, created = get_or_create_idempotency_record(
            idempotency_key='stale-key',
            operation='create_order',
            user_id=self.user.id,
            max_age_seconds=86400,  # 1 day
        )
        
        # Should be treated as new due to staleness
        self.assertTrue(created)
        self.assertNotEqual(record.id, retrieved.id)


class IdempotencyIntegrationTests(TestCase):
    """Integration tests for idempotency system."""
    
    def test_payment_operation_workflow(self):
        """Test a complete payment operation workflow."""
        from apps.core.idempotency import generate_idempotency_key
        
        user = User.objects.create_user(
            username='payuser',
            email='pay@example.com',
            password='testpass123'
        )
        
        # Generate key for payment
        key = generate_idempotency_key(
            user_id=user.id,
            operation='payment_razorpay',
            resource_id=999,
        )
        
        # First operation
        record1, created1 = get_or_create_idempotency_record(
            idempotency_key=key,
            operation='payment_razorpay',
            user_id=user.id,
        )
        self.assertTrue(created1)
        
        # Store result
        store_idempotency_result(
            record=record1,
            status_code=200,
            response_data={'payment_id': 'pay_123'},
            is_success=True,
        )
        
        # Retry with same key
        record2, created2 = get_or_create_idempotency_record(
            idempotency_key=key,
            operation='payment_razorpay',
            user_id=user.id,
        )
        self.assertFalse(created2)
        self.assertEqual(record1.id, record2.id)
        
        # Retrieve cached result
        status_code, data = retrieve_idempotency_result(record2)
        self.assertEqual(status_code, 200)
        self.assertEqual(data['payment_id'], 'pay_123')
