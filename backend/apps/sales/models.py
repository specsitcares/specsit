from django.db import models
from django.contrib.auth.models import User
from decimal import Decimal
# pyrefly: ignore [missing-import]
from apps.catalog.models import Variant, Lens, Prescription
# pyrefly: ignore [missing-import]
from apps.catalog.core.models import MetadataItem

class PaymentGatewayConfig(models.Model):
    GATEWAY_CHOICES = [
        ('razorpay', 'Razorpay'),
        ('stripe', 'Stripe (Future)'),
    ]
    name = models.CharField(max_length=50, choices=GATEWAY_CHOICES, default='razorpay', unique=True)
    key_id = models.CharField(max_length=255, blank=True, help_text="Razorpay Key ID")
    key_secret = models.CharField(max_length=255, blank=True, help_text="Razorpay Key Secret")
    is_sandbox = models.BooleanField(default=True, help_text="Toggle between Test and Live mode")
    is_active = models.BooleanField(default=True)
    cod_enabled = models.BooleanField(  
        default=True,
        help_text="Show the Cash on Delivery option to customers at checkout"
    )
    online_payment_enabled = models.BooleanField(
        default=True,
        help_text="Show the full online payment option to customers at checkout"
    )
    partial_payment_enabled = models.BooleanField(
        default=True,
        help_text="Show the partial payment option to customers at checkout"
    )
    partial_payment_percentage = models.IntegerField(
        default=50,
        help_text="Percentage of order total charged upfront for partial payments (1–99)"
    )

    class Meta:
        verbose_name_plural = "Payment Gateway Settings"

    def __str__(self):
        return f"{self.get_name_display()} Configuration"

class Coupon(models.Model):
    code = models.CharField(max_length=50, unique=True)
    discount_percentage = models.IntegerField(default=0)
    min_cart_value = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    valid_from = models.DateTimeField(null=True, blank=True)
    valid_until = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    is_bogo = models.BooleanField(default=False)
    brands = models.ManyToManyField(
        'catalog.Brand',
        blank=True,
        related_name='coupons',
        help_text='Brands this coupon applies to. Leave empty to apply to all brands.'
    )
    categories = models.ManyToManyField(
        'catalog.Category',
        blank=True,
        related_name='coupons',
        help_text='Child categories (subcategories) this coupon applies to. Leave empty to apply to all categories.'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self): return self.code

ORDER_STATUS_CHOICES = [
    ('order_received', 'Order Received'),
    ('order_accepted', 'Order Accepted'),
    ('preparing_glasses', 'Preparing Glasses'),
    ('quality_check', 'Quality Check'),
    ('ready_to_dispatch', 'Ready to Dispatch'),
    ('in_transit', 'In Transit / Out for Delivery'),
    ('delivered', 'Delivered'),
]

class Order(models.Model):
    PAYMENT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('partial_paid', 'Partial Paid'),
        ('paid', 'Paid'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ]
    PAYMENT_METHOD_CHOICES = [
        ('complete_cod', 'Complete COD'),
        ('complete_online', 'Complete Online'),
        ('partial_payment', 'Partial Payment'),
        #  values kept for backward compat
        ('COD', 'Cash on Delivery'),
        ('ONLINE', 'Full Online Payment'),
        ('PARTIAL', 'Partial (Online + COD)'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders', null=True, blank=True)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    paid_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    balance_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)

    payment_method = models.CharField(max_length=50, choices=PAYMENT_METHOD_CHOICES, default='complete_cod')
    order_status = models.CharField(max_length=30, choices=ORDER_STATUS_CHOICES, default='pending')
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='pending')

    # Razorpay Specifics
    razorpay_order_id = models.CharField(max_length=255, blank=True, null=True)
    razorpay_payment_id = models.CharField(max_length=255, blank=True, null=True)
    razorpay_signature = models.CharField(max_length=255, blank=True, null=True)

    #  MetadataItem status (kept for backward compat)
    status = models.ForeignKey(MetadataItem, on_delete=models.SET_NULL, null=True, blank=True, related_name='order_status')

    coupon = models.ForeignKey(Coupon, on_delete=models.SET_NULL, null=True, blank=True)

    shipping_address = models.ForeignKey('accounts.Address', on_delete=models.SET_NULL, null=True, blank=True, related_name='shipping_orders')
    billing_address = models.ForeignKey('accounts.Address', on_delete=models.SET_NULL, null=True, blank=True, related_name='billing_orders')

    # Inline address fields (for orders without saved address FK)
    shipping_address_line = models.TextField(blank=True)
    shipping_city = models.CharField(max_length=100, blank=True)
    shipping_state = models.CharField(max_length=100, blank=True)
    shipping_postal_code = models.CharField(max_length=20, blank=True)

    order_date = models.DateTimeField(auto_now_add=True, null=True)
    delivery_date = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Pricing breakdown
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    shipping_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)

    # Idempotency tracking
    creation_idempotency_key = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        unique=True,
        db_index=True,
        help_text="Idempotency key used to create this order"
    )

    def __str__(self): return f"Order #{self.id}"

class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    variant = models.ForeignKey(Variant, on_delete=models.CASCADE, null=True, blank=True)
    lens = models.ForeignKey(Lens, on_delete=models.SET_NULL, null=True, blank=True)
    prescription = models.ForeignKey(Prescription, on_delete=models.SET_NULL, null=True, blank=True, related_name='order_items')
    patient_name = models.CharField(max_length=100, blank=True, null=True)
    quantity = models.IntegerField(default=1)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    item_total = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    price_at_purchase = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    lens_prescription_text = models.TextField(null=True, blank=True)
    lens_pd = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=30, choices=ORDER_STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True, null=True)
    def __str__(self): return f"Item for Order #{self.order.id}"

class Cart(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='cart_items')
    variant = models.ForeignKey(Variant, on_delete=models.CASCADE)
    quantity = models.IntegerField(default=1)
    added_at = models.DateTimeField(auto_now_add=True)

class Wishlist(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='wishlist_items')
    variant = models.ForeignKey(Variant, on_delete=models.CASCADE)
    added_at = models.DateTimeField(auto_now_add=True)

class Shipment(models.Model):
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='shipment')
    carrier = models.CharField(max_length=100)
    method = models.CharField(max_length=100)
    status = models.ForeignKey(MetadataItem, on_delete=models.SET_NULL, null=True, blank=True, related_name='shipment_status')
    tracking_id = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    def __str__(self): return f"Shipment for Order #{self.order.id}"

class OrderTracking(models.Model):
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='tracking')
    tracking_number = models.CharField(max_length=100, unique=True, null=True, blank=True)
    courier_company = models.CharField(max_length=100, null=True, blank=True)
    current_status = models.CharField(max_length=50, default='pending')
    shipped_date = models.DateTimeField(null=True, blank=True)
    estimated_delivery_date = models.DateField(null=True, blank=True)
    actual_delivery_date = models.DateTimeField(null=True, blank=True)
    delivery_agent_name = models.CharField(max_length=100, blank=True)
    delivery_agent_phone = models.CharField(max_length=20, blank=True)
    qc_image = models.ImageField(upload_to='qc/', null=True, blank=True)
    delivery_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    delivery_rate_charged = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    last_updated = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    def __str__(self): return f"Tracking for Order #{self.order.id}"

class OrderItemTracking(models.Model):
    order_item = models.OneToOneField(OrderItem, on_delete=models.CASCADE, related_name='tracking')
    tracking_number = models.CharField(max_length=100, unique=True, null=True, blank=True)
    courier_company = models.CharField(max_length=100, null=True, blank=True)
    current_status = models.CharField(max_length=50, default='pending')
    shipped_date = models.DateTimeField(null=True, blank=True)
    estimated_delivery_date = models.DateField(null=True, blank=True)
    actual_delivery_date = models.DateTimeField(null=True, blank=True)
    delivery_agent_name = models.CharField(max_length=100, blank=True)
    delivery_agent_phone = models.CharField(max_length=20, blank=True)
    qc_image = models.ImageField(upload_to='qc/', null=True, blank=True)
    last_updated = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    def __str__(self): return f"Tracking for OrderItem #{self.order_item.id}"


class Payment(models.Model):
    PAYMENT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ]
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='payments')
    payment_method = models.CharField(max_length=50)
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2)
    transaction_id = models.CharField(max_length=255, null=True, blank=True, unique=True)
    payment_gateway = models.CharField(max_length=50, null=True, blank=True)
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='pending')
    failure_reason = models.TextField(null=True, blank=True)
    payment_date = models.DateTimeField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    def __str__(self): return f"Payment #{self.id} for Order #{self.order.id}"

class LiveSession(models.Model):
    session_id = models.CharField(max_length=255, unique=True)
    current_page = models.CharField(max_length=255, default='Home Page')
    last_activity = models.DateTimeField(auto_now=True)
    def __str__(self): return f"Session {self.session_id} on {self.current_page}"

class SiteVisit(models.Model):
    """One row per page view — powers Traffic & Clicks analytics tab."""
    DEVICE_CHOICES = [('mobile', 'Mobile'), ('tablet', 'Tablet'), ('desktop', 'Desktop')]
    session_id   = models.CharField(max_length=64, db_index=True)
    user         = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='site_visits')
    page         = models.CharField(max_length=500)
    device_type  = models.CharField(max_length=10, choices=DEVICE_CHOICES, default='desktop')
    visited_at   = models.DateTimeField(auto_now_add=True, db_index=True)
    duration_sec = models.PositiveIntegerField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['session_id', 'visited_at']),
            models.Index(fields=['visited_at', 'device_type']),
        ]

    def __str__(self): return f"{self.session_id} → {self.page}"

class ReturnRequest(models.Model):
    REASON_CHOICES = [
        ('defective', 'Defective'),
        ('wrong_item', 'Wrong Item'),
        ('size_issue', 'Size Issue'),
        ('not_as_described', 'Not as Described'),
        ('other', 'Other'),
    ]
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('picked_up', 'Picked Up'),
        ('received', 'Received'),
        ('refunded', 'Refunded'),
        ('replaced', 'Replaced'),
    ]
    TYPE_CHOICES = [
        ('refund', 'Refund'),
        ('replacement', 'Replacement'),
    ]
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='return_requests')
    reason = models.CharField(max_length=30, choices=REASON_CHOICES)
    request_type = models.CharField(max_length=15, choices=TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    description = models.TextField(blank=True)
    refund_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    refund_date = models.DateField(null=True, blank=True)
    replacement_sku = models.CharField(max_length=100, blank=True)
    replacement_tracking_id = models.CharField(max_length=100, blank=True)
    admin_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    def __str__(self): return f"Return #{self.id} for Order #{self.order_id}"

class WarrantyClaim(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('in_service', 'In Service'),
        ('completed', 'Completed'),
        ('rejected', 'Rejected'),
    ]
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='warranty_claims')
    issue_description = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    claimed_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    admin_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    def __str__(self): return f"Warranty #{self.id} for Order #{self.order_id}"


class PincodeDeliveryRate(models.Model):
    pincode = models.CharField(max_length=10, unique=True, db_index=True)
    location = models.CharField(max_length=150)
    state = models.CharField(max_length=100, blank=True)
    district = models.CharField(max_length=100, blank=True)
    distance_km = models.PositiveIntegerField(null=True, blank=True)
    bolt_delivery = models.BooleanField(null=True, blank=True)
    cost = models.DecimalField(max_digits=8, decimal_places=2)

    class Meta:
        ordering = ['distance_km', 'pincode']

    def __str__(self): return f"{self.pincode} – {self.location} (₹{self.cost})"
