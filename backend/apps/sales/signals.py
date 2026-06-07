from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Order, Cart, ReturnRequest, LiveSession
from .analytics_events import announce_change

@receiver(post_save, sender=Order)
def order_saved_handler(sender, instance, created, **kwargs):
    event_type = 'order_created' if created else 'order_updated'
    announce_change(event_type, {
        'id': instance.id,
        'total_amount': float(instance.total_amount),
        'order_status': instance.order_status,
        'payment_status': instance.payment_status,
    })

@receiver(post_save, sender=Cart)
def cart_saved_handler(sender, instance, created, **kwargs):
    event_type = 'cart_created' if created else 'cart_updated'
    announce_change(event_type, {
        'id': instance.id,
        'quantity': instance.quantity,
    })

@receiver(post_delete, sender=Cart)
def cart_deleted_handler(sender, instance, **kwargs):
    announce_change('cart_deleted', {
        'id': instance.id,
    })

@receiver(post_save, sender=ReturnRequest)
def return_saved_handler(sender, instance, created, **kwargs):
    event_type = 'return_created' if created else 'return_updated'
    announce_change(event_type, {
        'id': instance.id,
        'reason': instance.reason,
        'status': instance.status if hasattr(instance, 'status') else None,
    })

@receiver(post_save, sender=LiveSession)
def live_session_saved_handler(sender, instance, created, **kwargs):
    event_type = 'live_activity'
    announce_change(event_type, {
        'session_id': instance.session_id,
        'current_page': instance.current_page,
    })
