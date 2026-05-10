from rest_framework import serializers
from django.contrib.auth.hashers import make_password
from .models import (
    Buyer, Supplier, AdminUser, Category, Product, ProductImage,
    Cart, Wishlist, Order, OrderItem, Payment, Review, Notification,
)


# ─────────────────────────── Helpers ─────────────────────────────────────

def _hash_password(validated_data: dict) -> dict:
    """Pop raw password, hash it, put it back — only when non-empty."""
    pwd = validated_data.pop('password', None)
    if pwd:
        validated_data['password'] = make_password(pwd)
    return validated_data


# ─────────────────────────── Auth ────────────────────────────────────────

class LoginSerializer(serializers.Serializer):
    email    = serializers.EmailField()
    password = serializers.CharField()


# ─────────────────────────── Buyer ───────────────────────────────────────

class BuyerSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True, required=False, allow_blank=True, min_length=6,
        style={'input_type': 'password'},
    )

    class Meta:
        model  = Buyer
        fields = [
            'buyer_id', 'name', 'email', 'phone',
            'address', 'password', 'is_active', 'created_at',
        ]
        read_only_fields = ['buyer_id', 'is_active', 'created_at']

    def validate(self, data):
        if self.instance is None and not data.get('password'):
            raise serializers.ValidationError({'password': 'Password is required on registration.'})
        return data

    def create(self, validated_data):
        return super().create(_hash_password(validated_data))

    def update(self, instance, validated_data):
        return super().update(instance, _hash_password(validated_data))


# ─────────────────────────── Supplier ────────────────────────────────────

class SupplierSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True, required=False, allow_blank=True, min_length=6,
        style={'input_type': 'password'},
    )

    class Meta:
        model  = Supplier
        fields = [
            'supplier_id', 'shop_name', 'name', 'email',
            'phone', 'address', 'password',
            'shop_logo', 'kyc_document',
            'kyc_verified', 'verification_status',
            'balance', 'is_active', 'created_at',
        ]
        read_only_fields = [
            'supplier_id', 'kyc_verified', 'verification_status',
            'balance', 'created_at',
        ]

    def validate(self, data):
        if self.instance is None and not data.get('password'):
            raise serializers.ValidationError({'password': 'Password is required on registration.'})
        return data

    def create(self, validated_data):
        return super().create(_hash_password(validated_data))

    def update(self, instance, validated_data):
        return super().update(instance, _hash_password(validated_data))


# ─────────────────────────── Admin User ──────────────────────────────────

class AdminUserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True, required=False, allow_blank=True,
        style={'input_type': 'password'},
    )

    class Meta:
        model  = AdminUser
        fields = ['admin_id', 'name', 'email', 'phone', 'address', 'password', 'created_at']
        read_only_fields = ['admin_id', 'created_at']

    def create(self, validated_data):
        return super().create(_hash_password(validated_data))

    def update(self, instance, validated_data):
        return super().update(instance, _hash_password(validated_data))


# ─────────────────────────── Category ────────────────────────────────────

class CategorySerializer(serializers.ModelSerializer):
    # Expose pk as category_id so the JS can use c.category_id
    category_id = serializers.IntegerField(source='id', read_only=True)

    class Meta:
        model  = Category
        fields = ['category_id', 'name', 'slug', 'parent', 'image']


# ─────────────────────────── Product ─────────────────────────────────────

class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model  = ProductImage
        fields = ['id', 'image', 'is_primary', 'order']


class ProductSerializer(serializers.ModelSerializer):
    images        = ProductImageSerializer(many=True, read_only=True)
    supplier      = serializers.PrimaryKeyRelatedField(read_only=True)
    supplier_name = serializers.SerializerMethodField()
    category_name = serializers.SerializerMethodField()
    slug          = serializers.SlugField(read_only=True)

    # write-only: single image upload via FormData
    image = serializers.ImageField(write_only=True, required=False, allow_null=True)

    # category is writable (FK pk)
    category = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), required=False, allow_null=True
    )

    class Meta:
        model  = Product
        fields = [
            'product_id', 'supplier', 'supplier_name',
            'category', 'category_name',
            'name', 'slug', 'description',
            'price', 'stock',
            'is_available', 'is_active',
            'images', 'image',
            'created_at',
        ]
        read_only_fields = ['product_id', 'slug', 'created_at']

    def get_supplier_name(self, obj):
        try:
            return obj.supplier.shop_name or obj.supplier.name
        except Exception:
            return ''

    def get_category_name(self, obj):
        try:
            return obj.category.name if obj.category_id else ''
        except Exception:
            return ''

    def validate_price(self, value):
        if value <= 0:
            raise serializers.ValidationError('Price must be greater than zero.')
        return value

    def validate_stock(self, value):
        if value < 0:
            raise serializers.ValidationError('Stock cannot be negative.')
        return value

    def create(self, validated_data):
        image   = validated_data.pop('image', None)
        product = super().create(validated_data)
        if image:
            ProductImage.objects.create(product=product, image=image, is_primary=True, order=0)
        return product

    def update(self, instance, validated_data):
        image   = validated_data.pop('image', None)
        product = super().update(instance, validated_data)
        if image:
            # Replace primary image
            ProductImage.objects.filter(product=product, is_primary=True).delete()
            ProductImage.objects.create(product=product, image=image, is_primary=True, order=0)
        return product


# ─────────────────────────── Cart ────────────────────────────────────────

class CartSerializer(serializers.ModelSerializer):
    product_details = ProductSerializer(source='product', read_only=True)
    subtotal        = serializers.SerializerMethodField()

    class Meta:
        model  = Cart
        fields = ['id', 'buyer', 'product', 'product_details', 'quantity', 'subtotal', 'added_at']
        read_only_fields = ['id', 'buyer', 'added_at']

    def get_subtotal(self, obj):
        return round(float(obj.quantity) * float(obj.product.price), 2)


# ─────────────────────────── Wishlist ────────────────────────────────────

class WishlistSerializer(serializers.ModelSerializer):
    product_details = ProductSerializer(source='product', read_only=True)

    class Meta:
        model  = Wishlist
        fields = ['id', 'buyer', 'product', 'product_details', 'added_at']
        read_only_fields = ['id', 'buyer', 'added_at']


# ─────────────────────────── Order ───────────────────────────────────────

class OrderItemSerializer(serializers.ModelSerializer):
    # unit_price mirrors the stored `price` field for frontend compatibility
    unit_price = serializers.DecimalField(
        source='price', max_digits=12, decimal_places=2, read_only=True
    )

    class Meta:
        model  = OrderItem
        fields = ['id', 'product', 'product_name', 'quantity', 'price', 'unit_price', 'total']


class OrderSerializer(serializers.ModelSerializer):
    items          = OrderItemSerializer(many=True, read_only=True)
    buyer_name     = serializers.SerializerMethodField()
    supplier_name  = serializers.SerializerMethodField()
    payment_method = serializers.SerializerMethodField()

    class Meta:
        model  = Order
        fields = [
            'order_id', 'buyer', 'buyer_name',
            'supplier', 'supplier_name',
            'order_date', 'total_amount', 'status',
            'shipping_address', 'tracking_number',
            'payment_method', 'items',
        ]
        read_only_fields = ['order_id', 'order_date', 'total_amount', 'buyer', 'supplier']

    def get_buyer_name(self, obj):
        try:
            return obj.buyer.name
        except Exception:
            return ''

    def get_supplier_name(self, obj):
        try:
            return obj.supplier.shop_name
        except Exception:
            return ''

    def get_payment_method(self, obj):
        try:
            return obj.payment.method
        except Exception:
            return 'cod'


class OrderStatusSerializer(serializers.ModelSerializer):
    """Minimal serializer — only allows updating `status`."""

    class Meta:
        model  = Order
        fields = ['status']


# ─────────────────────────── Payment ─────────────────────────────────────

class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Payment
        fields = ['payment_id', 'order', 'amount', 'method', 'status', 'transaction_id', 'paid_at']
        read_only_fields = ['payment_id', 'paid_at']


# ─────────────────────────── Review ──────────────────────────────────────

class ReviewSerializer(serializers.ModelSerializer):
    buyer_name = serializers.SerializerMethodField()

    class Meta:
        model  = Review
        fields = ['review_id', 'buyer', 'buyer_name', 'product', 'rating', 'comment', 'created_at']
        read_only_fields = ['review_id', 'buyer', 'created_at']

    def get_buyer_name(self, obj):
        try:
            return obj.buyer.name
        except Exception:
            return ''

    def validate_rating(self, value):
        if not (1 <= value <= 5):
            raise serializers.ValidationError('Rating must be between 1 and 5.')
        return value


# ─────────────────────────── Notification ────────────────────────────────

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Notification
        fields = ['id', 'user_type', 'user_id', 'message', 'is_read', 'created_at']
        read_only_fields = ['id', 'created_at']