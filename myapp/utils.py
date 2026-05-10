import random
import string
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status


def generate_tracking_number(length: int = 12) -> str:
    """Generate a random alphanumeric tracking number."""
    chars = string.ascii_uppercase + string.digits
    return ''.join(random.choices(chars, k=length))


def calculate_commission(amount: float, commission_rate: float = 0.05) -> float:
    """Calculate platform commission on a given amount."""
    return round(float(amount) * commission_rate, 2)


def custom_exception_handler(exc, context):
    """
    Custom DRF exception handler that normalises all error responses
    to a consistent JSON shape: { "error": "..." }
    """
    response = exception_handler(exc, context)

    if response is not None:
        # Flatten DRF's default error format into a single 'error' string
        data = response.data
        if isinstance(data, dict):
            if 'detail' in data:
                response.data = {'error': str(data['detail'])}
            elif 'non_field_errors' in data:
                response.data = {'error': str(data['non_field_errors'][0])}
            else:
                # Collect all field errors
                messages = []
                for field, errors in data.items():
                    if isinstance(errors, list):
                        messages.append(f'{field}: {", ".join(str(e) for e in errors)}')
                    else:
                        messages.append(f'{field}: {errors}')
                response.data = {'error': ' | '.join(messages)}
        elif isinstance(data, list):
            response.data = {'error': str(data[0])}

    return response