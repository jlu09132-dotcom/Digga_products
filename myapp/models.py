from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.contrib.auth.hashers import make_password, check_password as django_check_password
from django.utils.text import slugify


# ─────────────────────────── Abstract Base User ───────────────────────────

class BaseUser(models.Model):
    email      = models.EmailField(unique=True, db_index=True)
    name       = models.CharField(max_length=100)
    phone      = models.CharField(max_length=15, blank=True, default='')
    address    = models.TextField(blank=True, default='')
    password   = models.CharField(max_length=256)
    is_active  = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True

    # ── Django / DRF duck-typing requirements ─────────────────────
    @property
    def is_authenticated(self):
        return True

    @property
    def is_anonymous(self):
        return False

    @property
    def pk(self):
        """
        Required by DRF internals that call request.user.pk.
        Each concrete model overrides this via its AutoField primary key.
        """
        raise NotImplementedError

    def set_password(self, raw_password):
        self.password = make_password(raw_password)

    def check_password(self, raw_password):
        return django_check_password(raw_password, self.password)

    def __str__(self):
        return f'{self.name} <{self.email}>'


# ─────────────────────────── Buyer ───────────────────────────────────────

class Buyer(BaseUser):
    buyer_id = models.AutoField(primary_key=True)

    class Meta:
        db_table = 'buyers'

    @property
    def pk(self):
        return self.buyer_id


# ─────────────────────────── Supplier ────────────────────────────────────

class Supplier(BaseUser):
    VERIFICATION_CHOICES = [
        ('pending',  'Pending'),
        ('verified', 'Verified'),
        ('rejected', 'Rejected'),
    ]

    supplier_id         = models.AutoField(primary_key=True)
    shop_name           = models.CharField(max_length=200)
    shop_logo           = models.ImageField(upload_to='shop_logos/', blank=True, null=True)
    kyc_document        = models.FileField(upload_to='kyc_docs/',   blank=True, null=True)
    kyc_verified        = models.BooleanField(default=False)
    verification_status = models.CharField(
        max_length=20, choices=VERIFICATION_CHOICES, default='pending', db_index=True
    )
    balance = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    class Meta:
        db_table = 'suppliers'

    @property
    def pk(self):
        return self.supplier_id


# ─────────────────────────── Admin ───────────────────────────────────────

class AdminUser(BaseUser):
    admin_id = models.AutoField(primary_key=True)

    class Meta:
        db_table = 'admins'

    @property
    def pk(self):
        return self.admin_id


# ─────────────────────────── Category ────────────────────────────────────

class Category(models.Model):
    name   = models.CharField(max_length=100)
    slug   = models.SlugField(unique=True, blank=True)
    parent = models.ForeignKey(
        'self', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='children'
    )
    image  = models.ImageField(upload_to='categories/', blank=True, null=True)

    class Meta:
        db_table            = 'categories'
        verbose_name_plural = 'categories'
        ordering            = ['name']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.name)
            slug, n = base, 1
            while Category.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f'{base}-{n}'
                n   += 1
            self.slug = slug
        super().save(*args, **kwargs)


# ─────────────────────────── Product ─────────────────────────────────────

class Product(models.Model):
    product_id   = models.AutoField(primary_key=True)
    supplier     = models.ForeignKey(
        Supplier, on_delete=models.CASCADE, related_name='products', db_index=True
    )
    category     = models.ForeignKey(
        Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='products'
    )
    name         = models.CharField(max_length=255)
    slug         = models.SlugField(unique=True, blank=True, max_length=300)
    description  = models.TextField()
    price        = models.DecimalField(
        max_digits=12, decimal_places=2, validators=[MinValueValidator(0)]
    )
    stock        = models.PositiveIntegerField(default=0)
    is_available = models.BooleanField(default=True, db_index=True)
    is_active    = models.BooleanField(default=True, db_index=True)
    created_at   = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'products'
        indexes  = [
            models.Index(fields=['is_active', 'is_available', '-created_at']),
        ]
        ordering = ['-created_at']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.name)
            slug, n = base, 1
            while Product.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f'{base}-{n}'
                n   += 1
            self.slug = slug
        super().save(*args, **kwargs)


class ProductImage(models.Model):
    product    = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='images')
    image      = models.ImageField(upload_to='product_images/')
    is_primary = models.BooleanField(default=False)
    order      = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'product_images'
        ordering = ['order', 'id']

    def __str__(self):
        return f'Image for {self.product.name}'


# ─────────────────────────── Cart ────────────────────────────────────────

class Cart(models.Model):
    buyer    = models.ForeignKey(Buyer, on_delete=models.CASCADE, related_name='cart')
    product  = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    added_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table        = 'cart'
        unique_together = ('buyer', 'product')

    def __str__(self):
        return f'{self.buyer.name} — {self.product.name} ×{self.quantity}'


# ─────────────────────────── Wishlist ────────────────────────────────────

class Wishlist(models.Model):
    buyer    = models.ForeignKey(Buyer, on_delete=models.CASCADE, related_name='wishlist')
    product  = models.ForeignKey(Product, on_delete=models.CASCADE)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table        = 'wishlist'
        unique_together = ('buyer', 'product')

    def __str__(self):
        return f'{self.buyer.name} ♥ {self.product.name}'


# ─────────────────────────── Order ───────────────────────────────────────

class Order(models.Model):
    STATUS_CHOICES = [
        ('pending',    'Pending'),
        ('confirmed',  'Confirmed'),
        ('processing', 'Processing'),
        ('shipped',    'Shipped'),
        ('delivered',  'Delivered'),
        ('cancelled',  'Cancelled'),
        ('refunded',   'Refunded'),
    ]

    order_id         = models.AutoField(primary_key=True)
    buyer            = models.ForeignKey(Buyer,    on_delete=models.PROTECT, related_name='orders')
    supplier         = models.ForeignKey(Supplier, on_delete=models.PROTECT, related_name='orders')
    order_date       = models.DateTimeField(auto_now_add=True)
    total_amount     = models.DecimalField(max_digits=14, decimal_places=2)
    status           = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default='pending', db_index=True
    )
    shipping_address = models.TextField()
    tracking_number  = models.CharField(max_length=100, blank=True, default='')

    class Meta:
        db_table = 'orders'
        ordering = ['-order_date']
        indexes  = [
            models.Index(fields=['buyer',    '-order_date']),
            models.Index(fields=['supplier', '-order_date']),
        ]

    def __str__(self):
        return f'Order #{self.order_id} — {self.buyer.name}'


class OrderItem(models.Model):
    order        = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product      = models.ForeignKey(Product, on_delete=models.PROTECT)
    # ── Snapshot fields: frozen at purchase time ──
    product_name = models.CharField(max_length=255, default='')
    quantity     = models.PositiveIntegerField()
    price        = models.DecimalField(max_digits=12, decimal_places=2)  # unit price
    total        = models.DecimalField(max_digits=14, decimal_places=2)  # price × qty

    class Meta:
        db_table = 'order_items'

    def __str__(self):
        return f'{self.quantity}× {self.product_name} (Order #{self.order_id})'


# ─────────────────────────── Payment ─────────────────────────────────────

class Payment(models.Model):
    METHODS = [
        ('card',       'Card'),
        ('upi',        'UPI'),
        ('netbanking', 'Net Banking'),
        ('cod',        'Cash on Delivery'),
    ]
    STATUSES = [
        ('pending',  'Pending'),
        ('success',  'Success'),
        ('failed',   'Failed'),
        ('refunded', 'Refunded'),
    ]

    payment_id     = models.AutoField(primary_key=True)
    order          = models.OneToOneField(
        Order, on_delete=models.CASCADE, related_name='payment'
    )
    amount         = models.DecimalField(max_digits=14, decimal_places=2)
    method         = models.CharField(max_length=20, choices=METHODS, default='cod')
    status         = models.CharField(max_length=20, choices=STATUSES, default='pending')
    transaction_id = models.CharField(max_length=100, blank=True, default='')
    paid_at        = models.DateTimeField(blank=True, null=True)

    class Meta:
        db_table = 'payments'

    def __str__(self):
        return f'Payment #{self.payment_id} [{self.method}] {self.status}'


# ─────────────────────────── Review ──────────────────────────────────────

class Review(models.Model):
    review_id  = models.AutoField(primary_key=True)
    buyer      = models.ForeignKey(Buyer,   on_delete=models.CASCADE, related_name='reviews')
    product    = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='reviews')
    rating     = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    comment    = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table        = 'reviews'
        unique_together = ('buyer', 'product')

    def __str__(self):
        return f'{self.buyer.name} → {self.product.name} ({self.rating}★)'


# ─────────────────────────── Notification ────────────────────────────────

class Notification(models.Model):
    USER_TYPES = [
        ('buyer',    'Buyer'),
        ('supplier', 'Supplier'),
        ('admin',    'Admin'),
    ]

    user_type  = models.CharField(max_length=20, choices=USER_TYPES)
    user_id    = models.PositiveIntegerField(db_index=True)
    message    = models.CharField(max_length=512)
    is_read    = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']

    def __str__(self):
        return f'[{self.user_type}#{self.user_id}] {self.message[:60]}'