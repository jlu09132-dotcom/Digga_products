from django.contrib import admin
from .models import (
    Buyer, Supplier, AdminUser,
    Category, Product, ProductImage,
    Cart, Wishlist,
    Order, OrderItem, Payment,
    Review, Notification,
)

# ─────────────────────────── Users ───────────────────────────────────────

@admin.register(Buyer)
class BuyerAdmin(admin.ModelAdmin):
    list_display  = ('buyer_id', 'name', 'email', 'phone', 'is_active', 'created_at')
    search_fields = ('name', 'email', 'phone')
    list_filter   = ('is_active',)
    ordering      = ('-created_at',)


@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display  = (
        'supplier_id', 'shop_name', 'name', 'email',
        'verification_status', 'kyc_verified', 'balance', 'is_active',
    )
    list_filter   = ('verification_status', 'kyc_verified', 'is_active')
    search_fields = ('shop_name', 'email', 'name')
    ordering      = ('-created_at',)
    readonly_fields = ('balance',)


@admin.register(AdminUser)
class AdminUserAdmin(admin.ModelAdmin):
    list_display  = ('admin_id', 'name', 'email', 'is_active', 'created_at')
    search_fields = ('name', 'email')


# ─────────────────────────── Catalogue ───────────────────────────────────

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display       = ('id', 'name', 'slug', 'parent')
    prepopulated_fields = {'slug': ('name',)}
    search_fields      = ('name',)


class ProductImageInline(admin.TabularInline):
    model  = ProductImage
    extra  = 1
    fields = ('image', 'is_primary', 'order')


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display  = (
        'product_id', 'name', 'supplier', 'category',
        'price', 'stock', 'is_available', 'is_active', 'created_at',
    )
    list_filter   = ('is_available', 'is_active', 'category')
    search_fields = ('name', 'supplier__shop_name')
    ordering      = ('-created_at',)
    inlines       = [ProductImageInline]
    readonly_fields = ('slug', 'created_at', 'updated_at')


# ─────────────────────────── Cart / Wishlist ──────────────────────────────

@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display  = ('id', 'buyer', 'product', 'quantity', 'added_at')
    search_fields = ('buyer__name', 'product__name')


@admin.register(Wishlist)
class WishlistAdmin(admin.ModelAdmin):
    list_display  = ('id', 'buyer', 'product', 'added_at')
    search_fields = ('buyer__name', 'product__name')


# ─────────────────────────── Orders ──────────────────────────────────────

class OrderItemInline(admin.TabularInline):
    model        = OrderItem
    extra        = 0
    readonly_fields = ('product_name', 'price', 'total')
    fields       = ('product', 'product_name', 'quantity', 'price', 'total')


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display   = (
        'order_id', 'buyer', 'supplier',
        'total_amount', 'status', 'order_date',
    )
    list_filter    = ('status', 'order_date')
    search_fields  = ('buyer__name', 'supplier__shop_name')
    ordering       = ('-order_date',)
    readonly_fields = ('order_date', 'total_amount')
    inlines        = [OrderItemInline]


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display  = ('payment_id', 'order', 'amount', 'method', 'status', 'paid_at')
    list_filter   = ('method', 'status')
    readonly_fields = ('paid_at',)


# ─────────────────────────── Reviews / Notifications ─────────────────────

@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display  = ('review_id', 'buyer', 'product', 'rating', 'created_at')
    list_filter   = ('rating',)
    search_fields = ('buyer__name', 'product__name')


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display  = ('id', 'user_type', 'user_id', 'message', 'is_read', 'created_at')
    list_filter   = ('user_type', 'is_read')
    ordering      = ('-created_at',)