from django.db.models.signals import post_save
from django.dispatch           import receiver

from .models   import Order, Payment
from .services import create_notification


@receiver(post_save, sender=Order)
def order_notifications(sender, instance, created, **kwargs):
    """
    Fire notifications on order create and on every status change.
    Guards against missing supplier/buyer to prevent crashes during
    atomic checkout if a related object is temporarily unavailable.
    """
    try:
        buyer_id    = instance.buyer.buyer_id
        supplier_id = instance.supplier.supplier_id
    except Exception:
        return

    if created:
        create_notification(
            'supplier', supplier_id,
            f'New order #{instance.order_id} received from {instance.buyer.name}.'
        )
        create_notification(
            'buyer', buyer_id,
            f'Your order #{instance.order_id} has been placed. We will confirm it shortly.'
        )
    else:
        label = instance.get_status_display()
        create_notification(
            'buyer', buyer_id,
            f'Order #{instance.order_id} status updated to: {label}.'
        )
        create_notification(
            'supplier', supplier_id,
            f'Order #{instance.order_id} is now: {label}.'
        )


@receiver(post_save, sender=Payment)
def payment_notifications(sender, instance, created, **kwargs):
    """Notify both parties when payment is confirmed successful."""
    if not created and instance.status == 'success':
        try:
            buyer_id    = instance.order.buyer.buyer_id
            supplier_id = instance.order.supplier.supplier_id
            order_id    = instance.order.order_id
        except Exception:
            return

        create_notification('buyer',    buyer_id,    f'Payment confirmed for order #{order_id}.')
        create_notification('supplier', supplier_id, f'Payment received for order #{order_id}.')