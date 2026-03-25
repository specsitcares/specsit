from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from .models import Order, OrderItem, Cart, Wishlist, Coupon, Shipment
from .serializers import (
    OrderSerializer, OrderItemSerializer, CartSerializer, 
    WishlistSerializer, CouponSerializer, ShipmentSerializer
)

class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).select_related('status', 'coupon', 'shipping_address', 'billing_address').prefetch_related('items', 'items__variant', 'items__variant__product')
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class CartViewSet(viewsets.ModelViewSet):
    serializer_class = CartSerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_queryset(self):
        return Cart.objects.filter(user=self.request.user).select_related('variant', 'variant__product')
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class WishlistViewSet(viewsets.ModelViewSet):
    serializer_class = WishlistSerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_queryset(self):
        return Wishlist.objects.filter(user=self.request.user).select_related('variant', 'variant__product')
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class CouponViewSet(viewsets.ModelViewSet):
    queryset = Coupon.objects.all()
    serializer_class = CouponSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

class ShipmentViewSet(viewsets.ModelViewSet):
    queryset = Shipment.objects.select_related('order', 'status').all()
    serializer_class = ShipmentSerializer
    permission_classes = [permissions.IsAuthenticated]
