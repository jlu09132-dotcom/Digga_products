from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    # Auth
    BuyerCreateView, SupplierCreateView, CustomLoginView,
    # Public
    CategoryListView,
    BuyerProductListView, BuyerProductDetailView,
    # Buyer
    CartViewSet, WishlistViewSet,
    CheckoutView,
    BuyerOrderListView, BuyerOrderDetailView,
    BuyerProfileView,
    BuyerReviewCreateView,
    # Supplier
    SupplierProductViewSet,
    SupplierOrderListView, SupplierOrderUpdateView,
    SupplierShopView, SupplierEarningsView, SupplierProfileView,
    # Admin
    AdminSupplierListView, AdminSupplierVerifyView,
    AdminProductListView, AdminProductModerateView,
    AdminOrderListView,
    AdminUserListView, AdminDashboardStatsView,
)

# ── Router ──────────────────────────────────────────────────────────────────
# cart/count/ is registered as a ViewSet @action(detail=False), so the router
# places it BEFORE cart/<pk>/. This prevents the str-typed <pk> from eating
# the literal "count" segment before Django reaches the dedicated view.

router = DefaultRouter()
router.register(r'cart',              CartViewSet,            basename='cart')
router.register(r'wishlist',          WishlistViewSet,        basename='wishlist')
router.register(r'supplier/products', SupplierProductViewSet, basename='supplier-products')

urlpatterns = [
    # ── Router (cart, wishlist, supplier/products + their @actions) ──
    path('', include(router.urls)),

    # ── Auth ─────────────────────────────────────────────────────────
    path('login/',     CustomLoginView.as_view(),    name='login'),
    path('buyers/',    BuyerCreateView.as_view(),    name='buyer-register'),
    path('suppliers/', SupplierCreateView.as_view(), name='supplier-register'),

    # ── Public ───────────────────────────────────────────────────────
    path('categories/',          CategoryListView.as_view(),       name='categories'),
    path('products/',            BuyerProductListView.as_view(),   name='products'),
    path('products/<int:pk>/',   BuyerProductDetailView.as_view(), name='product-detail'),

    # ── Buyer: Checkout ───────────────────────────────────────────────
    path('checkout/', CheckoutView.as_view(), name='checkout'),

    # ── Buyer: Orders ─────────────────────────────────────────────────
    path('orders/',           BuyerOrderListView.as_view(),   name='buyer-orders'),
    path('orders/<int:pk>/',  BuyerOrderDetailView.as_view(), name='buyer-order-detail'),

    # ── Buyer: Profile & Reviews ──────────────────────────────────────
    path('buyer/profile/', BuyerProfileView.as_view(),      name='buyer-profile'),
    path('reviews/',       BuyerReviewCreateView.as_view(), name='reviews'),

    # ── Supplier: Orders ──────────────────────────────────────────────
    path('supplier/orders/',          SupplierOrderListView.as_view(),   name='supplier-orders'),
    path('supplier/orders/<int:pk>/', SupplierOrderUpdateView.as_view(), name='supplier-order-update'),

    # ── Supplier: Shop, Earnings, Profile ────────────────────────────
    path('supplier/shop/',     SupplierShopView.as_view(),     name='supplier-shop'),
    path('supplier/earnings/', SupplierEarningsView.as_view(), name='supplier-earnings'),
    path('supplier/profile/',  SupplierProfileView.as_view(),  name='supplier-profile'),

    # ── Admin ─────────────────────────────────────────────────────────
    path('admin/stats/',                      AdminDashboardStatsView.as_view(),  name='admin-stats'),
    path('admin/users/',                      AdminUserListView.as_view(),        name='admin-users'),
    path('admin/suppliers/',                  AdminSupplierListView.as_view(),    name='admin-suppliers'),
    path('admin/suppliers/<int:pk>/verify/',  AdminSupplierVerifyView.as_view(),  name='admin-supplier-verify'),
    path('admin/orders/',                     AdminOrderListView.as_view(),       name='admin-orders'),
    path('admin/products/',                   AdminProductListView.as_view(),     name='admin-products'),
    path('admin/products/<int:pk>/moderate/', AdminProductModerateView.as_view(), name='admin-product-moderate'),
]