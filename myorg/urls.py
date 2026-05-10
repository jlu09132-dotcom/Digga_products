from django.contrib       import admin
from django.urls          import path, include
from django.conf          import settings
from django.conf.urls.static import static
from django.views.generic import TemplateView
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    # Django's built-in admin moved to /django-admin/ so our
    # frontend portal can own the entire /admin/ URL namespace.
    path('django-admin/', admin.site.urls),

    # ── REST API ────────────────────────────────────────────────────
    path('api/',               include('myapp.urls')),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # ── Public ──────────────────────────────────────────────────────
    path('',          TemplateView.as_view(template_name='index.html'),    name='home'),
    path('login/',    TemplateView.as_view(template_name='login.html'),    name='login'),
    path('register/', TemplateView.as_view(template_name='register.html'), name='register'),

    # ── Buyer ────────────────────────────────────────────────────────
    path('buyer/dashboard/', TemplateView.as_view(template_name='buyer/dashboard.html'),     name='buyer_dashboard'),
    path('buyer/profile/',   TemplateView.as_view(template_name='buyer/profile.html'),       name='buyer_profile'),
    path('products/',        TemplateView.as_view(template_name='buyer/products.html'),      name='products'),
    path('products/<int:pk>/', TemplateView.as_view(template_name='buyer/product_detail.html'), name='product_detail'),
    path('cart/',            TemplateView.as_view(template_name='buyer/cart.html'),          name='cart'),
    path('checkout/',        TemplateView.as_view(template_name='buyer/checkout.html'),      name='checkout'),
    path('wishlist/',        TemplateView.as_view(template_name='buyer/wishlist.html'),      name='wishlist'),
    path('orders/',          TemplateView.as_view(template_name='buyer/orders.html'),        name='orders'),
    path('orders/<int:pk>/', TemplateView.as_view(template_name='buyer/order_detail.html'), name='order_detail'),

    # ── Supplier ─────────────────────────────────────────────────────
    path('supplier/dashboard/', TemplateView.as_view(template_name='supplier/dashboard.html'), name='supplier_dashboard'),
    path('supplier/products/',  TemplateView.as_view(template_name='supplier/products.html'),  name='supplier_products'),
    path('supplier/orders/',    TemplateView.as_view(template_name='supplier/orders.html'),    name='supplier_orders'),
    path('supplier/earnings/',  TemplateView.as_view(template_name='supplier/earnings.html'),  name='supplier_earnings'),
    path('supplier/shop/',      TemplateView.as_view(template_name='supplier/shop.html'),      name='supplier_shop'),
    path('supplier/profile/',   TemplateView.as_view(template_name='supplier/profile.html'),   name='supplier_profile'),

    # ── Admin portal (NOT Django's admin — that lives at /django-admin/) ──
    path('admin/dashboard/', TemplateView.as_view(template_name='admin/dashboard.html'), name='admin_dashboard'),
    path('admin/users/',     TemplateView.as_view(template_name='admin/users.html'),     name='admin_users'),
    path('admin/suppliers/', TemplateView.as_view(template_name='admin/suppliers.html'), name='admin_suppliers'),
    path('admin/products/',  TemplateView.as_view(template_name='admin/products.html'),  name='admin_products'),
    path('admin/orders/',    TemplateView.as_view(template_name='admin/orders.html'),    name='admin_orders'),
    path('admin/reports/',   TemplateView.as_view(template_name='admin/reports.html'),   name='admin_reports'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL,  document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATICFILES_DIRS[0])