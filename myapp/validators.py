import re
import os
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _


# ─────────────────────────── Phone ───────────────────────────────────────

def validate_phone_number(value):
    """
    Accepts Indian mobile numbers (10 digits) and international numbers
    with optional country code prefix (e.g. +91XXXXXXXXXX).
    """
    cleaned = re.sub(r'[\s\-\(\)]', '', str(value))
    if not re.match(r'^\+?[0-9]{9,15}$', cleaned):
        raise ValidationError(
            _('Enter a valid phone number (9–15 digits, optional + prefix).')
        )


def validate_indian_mobile(value):
    """
    Strict Indian mobile number: starts with 6–9, exactly 10 digits.
    Accepts optional +91 or 0 prefix.
    """
    cleaned = re.sub(r'[\s\-\(\)]', '', str(value))
    cleaned = re.sub(r'^(\+91|91|0)', '', cleaned)
    if not re.match(r'^[6-9]\d{9}$', cleaned):
        raise ValidationError(
            _('Enter a valid 10-digit Indian mobile number.')
        )


# ─────────────────────────── GSTIN ───────────────────────────────────────

def validate_gstin(value):
    """
    Validates Indian Goods and Services Tax Identification Number (GSTIN).
    Format: 2-digit state code + PAN (10 chars) + entity number + Z + checksum.
    Example: 27AAPFU0939F1ZV
    """
    pattern = r'^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$'
    if not re.match(pattern, str(value).upper()):
        raise ValidationError(
            _('Invalid GSTIN format. Expected: 22AAAAA0000A1Z5')
        )

    # State code must be 01–37
    state_code = int(value[:2])
    if not (1 <= state_code <= 37):
        raise ValidationError(_('Invalid GSTIN state code (must be 01–37).'))


# ─────────────────────────── PAN ─────────────────────────────────────────

def validate_pan(value):
    """
    Validates Indian Permanent Account Number (PAN).
    Format: AAAAA0000A (5 letters, 4 digits, 1 letter).
    """
    if not re.match(r'^[A-Z]{5}[0-9]{4}[A-Z]{1}$', str(value).upper()):
        raise ValidationError(
            _('Invalid PAN format. Expected: ABCDE1234F')
        )


# ─────────────────────────── Pincode ─────────────────────────────────────

def validate_indian_pincode(value):
    """
    Validates Indian 6-digit postal PIN code.
    First digit cannot be 0.
    """
    if not re.match(r'^[1-9][0-9]{5}$', str(value)):
        raise ValidationError(
            _('Enter a valid 6-digit Indian PIN code.')
        )


# ─────────────────────────── Price / Amount ──────────────────────────────

def validate_positive_price(value):
    """Price must be greater than zero."""
    try:
        val = float(value)
    except (TypeError, ValueError):
        raise ValidationError(_('Enter a valid price.'))
    if val <= 0:
        raise ValidationError(_('Price must be greater than ₹0.'))


def validate_non_negative(value):
    """Value must be zero or greater (e.g. stock, balance)."""
    try:
        val = float(value)
    except (TypeError, ValueError):
        raise ValidationError(_('Enter a valid number.'))
    if val < 0:
        raise ValidationError(_('Value cannot be negative.'))


# ─────────────────────────── Rating ──────────────────────────────────────

def validate_rating(value):
    """Rating must be an integer between 1 and 5."""
    try:
        val = int(value)
    except (TypeError, ValueError):
        raise ValidationError(_('Rating must be a whole number.'))
    if not (1 <= val <= 5):
        raise ValidationError(_('Rating must be between 1 and 5.'))


# ─────────────────────────── Password ────────────────────────────────────

def validate_strong_password(value):
    """
    Enforces a minimum password policy:
    - At least 8 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one digit
    """
    pwd = str(value)
    if len(pwd) < 8:
        raise ValidationError(_('Password must be at least 8 characters long.'))
    if not re.search(r'[A-Z]', pwd):
        raise ValidationError(_('Password must contain at least one uppercase letter.'))
    if not re.search(r'[a-z]', pwd):
        raise ValidationError(_('Password must contain at least one lowercase letter.'))
    if not re.search(r'\d', pwd):
        raise ValidationError(_('Password must contain at least one digit.'))


# ─────────────────────────── Image Upload ────────────────────────────────

ALLOWED_IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp', '.gif'}
MAX_IMAGE_SIZE_MB = 5


def validate_image_extension(file):
    """Restrict uploads to common web image formats."""
    ext = os.path.splitext(file.name)[1].lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise ValidationError(
            _('Unsupported image format. Allowed: %(formats)s'),
            params={'formats': ', '.join(ALLOWED_IMAGE_EXTENSIONS)},
        )


def validate_image_size(file):
    """Reject images larger than MAX_IMAGE_SIZE_MB."""
    limit = MAX_IMAGE_SIZE_MB * 1024 * 1024
    if file.size > limit:
        raise ValidationError(
            _('Image file too large. Maximum allowed size is %(max)s MB.'),
            params={'max': MAX_IMAGE_SIZE_MB},
        )


def validate_image_file(file):
    """Convenience validator combining extension and size checks."""
    validate_image_extension(file)
    validate_image_size(file)


# ─────────────────────────── KYC Document ────────────────────────────────

ALLOWED_DOC_EXTENSIONS = {'.pdf', '.jpg', '.jpeg', '.png'}
MAX_DOC_SIZE_MB = 10


def validate_kyc_document(file):
    """Validates KYC document: extension and size."""
    ext = os.path.splitext(file.name)[1].lower()
    if ext not in ALLOWED_DOC_EXTENSIONS:
        raise ValidationError(
            _('KYC document must be a PDF or image (jpg/png).')
        )
    if file.size > MAX_DOC_SIZE_MB * 1024 * 1024:
        raise ValidationError(
            _('KYC document must be smaller than %(max)s MB.'),
            params={'max': MAX_DOC_SIZE_MB},
        )


# ─────────────────────────── Slug ────────────────────────────────────────

def validate_slug_format(value):
    """
    Slug may only contain lowercase letters, digits, and hyphens.
    Must not start or end with a hyphen.
    """
    if not re.match(r'^[a-z0-9]+(?:-[a-z0-9]+)*$', str(value)):
        raise ValidationError(
            _('Slug may only contain lowercase letters, digits, and hyphens, '
              'and must not start or end with a hyphen.')
        )


# ─────────────────────────── Quantity ────────────────────────────────────

def validate_quantity(value):
    """Cart / order quantity must be a positive integer."""
    try:
        val = int(value)
    except (TypeError, ValueError):
        raise ValidationError(_('Quantity must be a whole number.'))
    if val < 1:
        raise ValidationError(_('Quantity must be at least 1.'))
    if val > 10000:
        raise ValidationError(_('Quantity cannot exceed 10,000 per item.'))


# ─────────────────────────── Order Status ────────────────────────────────

VALID_ORDER_STATUSES = {'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'}

# Allowed transitions: current_status -> set of next allowed statuses
ORDER_STATUS_TRANSITIONS = {
    'pending':    {'confirmed', 'cancelled'},
    'confirmed':  {'processing', 'cancelled'},
    'processing': {'shipped', 'cancelled'},
    'shipped':    {'delivered'},
    'delivered':  {'refunded'},
    'cancelled':  set(),
    'refunded':   set(),
}


def validate_order_status(value):
    """Value must be one of the defined order statuses."""
    if value not in VALID_ORDER_STATUSES:
        raise ValidationError(
            _('Invalid order status. Choose from: %(statuses)s'),
            params={'statuses': ', '.join(sorted(VALID_ORDER_STATUSES))},
        )


def validate_order_status_transition(current_status, new_status):
    """
    Raises ValidationError if the transition from current_status to
    new_status is not allowed by the business rules.

    Usage in a view:
        validate_order_status_transition(order.status, request.data['status'])
    """
    allowed = ORDER_STATUS_TRANSITIONS.get(current_status, set())
    if new_status not in allowed:
        raise ValidationError(
            _('Cannot transition order from "%(current)s" to "%(new)s". '
              'Allowed next statuses: %(allowed)s'),
            params={
                'current': current_status,
                'new':     new_status,
                'allowed': ', '.join(sorted(allowed)) or 'none',
            },
        )


# ─────────────────────────── Payment ─────────────────────────────────────

VALID_PAYMENT_METHODS = {'card', 'upi', 'netbanking', 'cod'}


def validate_payment_method(value):
    """Value must be one of the supported payment methods."""
    if value not in VALID_PAYMENT_METHODS:
        raise ValidationError(
            _('Invalid payment method. Choose from: %(methods)s'),
            params={'methods': ', '.join(sorted(VALID_PAYMENT_METHODS))},
        )


# ─────────────────────────── Email ───────────────────────────────────────

def validate_no_disposable_email(value):
    """
    Blocks a short list of well-known disposable e-mail domains.
    Extend DISPOSABLE_DOMAINS as needed.
    """
    DISPOSABLE_DOMAINS = {
        'mailinator.com', 'guerrillamail.com', 'tempmail.com',
        'throwaway.email', 'yopmail.com', 'sharklasers.com',
        'trashmail.com', 'maildrop.cc', 'dispostable.com',
    }
    domain = str(value).split('@')[-1].lower()
    if domain in DISPOSABLE_DOMAINS:
        raise ValidationError(
            _('Disposable email addresses are not allowed.')
        )