from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions     import InvalidToken

from .models import Buyer, Supplier, AdminUser


class CustomJWTAuthentication(JWTAuthentication):
    """
    Extends SimpleJWT to resolve access tokens against our three custom
    user tables (Buyer, Supplier, AdminUser) rather than Django's built-in User.

    Token claims expected:
        role    : 'buyer' | 'supplier' | 'admin'
        user_id : integer primary key in the matching table
    """

    def get_user(self, validated_token):
        role    = validated_token.get('role')
        user_id = validated_token.get('user_id')

        if not role or not user_id:
            raise InvalidToken('Token is missing required role or user_id claims.')

        MODEL_MAP = {
            'buyer':    (Buyer,     'buyer_id'),
            'supplier': (Supplier,  'supplier_id'),
            'admin':    (AdminUser, 'admin_id'),
        }

        if role not in MODEL_MAP:
            raise InvalidToken(f'Unrecognised role: "{role}".')

        Model, pk_field = MODEL_MAP[role]

        try:
            user = Model.objects.get(**{pk_field: user_id})
        except Model.DoesNotExist:
            raise InvalidToken(f'{role.capitalize()} #{user_id} not found.')

        if not user.is_active:
            raise InvalidToken(f'{role.capitalize()} #{user_id} is inactive.')

        # Attach role as an attribute so permission classes can read it
        user.role = role
        return user