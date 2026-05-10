from .models import Order, Notification


def create_notification(user_type: str, user_id: int, message: str) -> Notification:
    """Create and return a notification record."""
    return Notification.objects.create(
        user_type=user_type,
        user_id=user_id,
        message=message,
    )


def update_order_status(order_id: int, new_status: str) -> bool:
    """
    Update order status and fire notifications.
    Returns True on success, False if order not found.
    """
    try:
        order        = Order.objects.select_related('buyer', 'supplier').get(order_id=order_id)
        order.status = new_status
        order.save(update_fields=['status'])
        return True
    except Order.DoesNotExist:
        return False


def credit_supplier_balance(order_id: int, commission_rate: float = 0.05) -> bool:
    """
    Credit supplier balance after order delivery (minus platform commission).
    Returns True on success.
    """
    try:
        order    = Order.objects.select_related('supplier').get(order_id=order_id, status='delivered')
        payout   = float(order.total_amount) * (1 - commission_rate)
        supplier = order.supplier
        supplier.balance = float(supplier.balance) + payout
        supplier.save(update_fields=['balance'])
        return True
    except Order.DoesNotExist:
        return False