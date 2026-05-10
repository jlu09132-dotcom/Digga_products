from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsBuyer(BasePermission):
    """Allow access only to authenticated buyers."""
    message = 'This action requires a buyer account.'

    def has_permission(self, request, view):
        return (
            request.user is not None
            and request.user.is_authenticated
            and getattr(request.user, 'role', '') == 'buyer'
        )


class IsSupplier(BasePermission):
    """Allow access only to authenticated suppliers."""
    message = 'This action requires a supplier account.'

    def has_permission(self, request, view):
        return (
            request.user is not None
            and request.user.is_authenticated
            and getattr(request.user, 'role', '') == 'supplier'
        )


class IsAdmin(BasePermission):
    """Allow access only to authenticated admins."""
    message = 'This action requires an admin account.'

    def has_permission(self, request, view):
        return (
            request.user is not None
            and request.user.is_authenticated
            and getattr(request.user, 'role', '') == 'admin'
        )


class IsOwnerOrReadOnly(BasePermission):
    """
    Object-level permission.
    Read is always allowed; writes require ownership.
    """
    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        if hasattr(obj, 'buyer') and obj.buyer == request.user:
            return True
        if hasattr(obj, 'supplier') and obj.supplier == request.user:
            return True
        if hasattr(obj, 'product') and obj.product.supplier == request.user:
            return True
        return False


class IsSupplierOwner(BasePermission):
    """Allow supplier to manage only their own products/orders."""
    def has_object_permission(self, request, view, obj):
        if hasattr(obj, 'supplier'):
            return obj.supplier == request.user
        return False