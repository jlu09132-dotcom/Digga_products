from collections import defaultdict

from django.db            import transaction
from django.db.models     import Q, Sum
from django.shortcuts     import get_object_or_404

from rest_framework                  import generics, status, viewsets, permissions
from rest_framework.decorators       import action
from rest_framework.parsers          import MultiPartParser, FormParser, JSONParser
from rest_framework.response         import Response
from rest_framework.views            import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import (
    Buyer, Supplier, AdminUser, Category, Product, ProductImage,
    Cart, Wishlist, Order, OrderItem, Payment, Review, Notification,
)
from .serializers import (
    BuyerSerializer, SupplierSerializer, AdminUserSerializer,
    CategorySerializer, ProductSerializer,
    CartSerializer, WishlistSerializer,
    OrderSerializer, OrderStatusSerializer,
    PaymentSerializer, ReviewSerializer, NotificationSerializer,
    LoginSerializer,
)
from .permissions import IsBuyer, IsSupplier, IsAdmin
from .pagination   import CustomPagination


# ═══════════════════════════════════════════════════════════════════════════
#  TOKEN HELPER
# ═══════════════════════════════════════════════════════════════════════════

def _make_tokens(role: str, user_id: int, email: str, name: str) -> dict:
    refresh = RefreshToken()
    refresh['role']    = role
    refresh['user_id'] = user_id
    refresh['email']   = email
    refresh['name']    = name
    return {
        'access':  str(refresh.access_token),
        'refresh': str(refresh),
    }


# ═══════════════════════════════════════════════════════════════════════════
#  REGISTRATION
# ═══════════════════════════════════════════════════════════════════════════

class BuyerCreateView(generics.CreateAPIView):
    queryset           = Buyer.objects.all()
    serializer_class   = BuyerSerializer
    permission_classes = [permissions.AllowAny]


class SupplierCreateView(generics.CreateAPIView):
    queryset           = Supplier.objects.all()
    serializer_class   = SupplierSerializer
    permission_classes = [permissions.AllowAny]


# ═══════════════════════════════════════════════════════════════════════════
#  LOGIN
# ═══════════════════════════════════════════════════════════════════════════

class CustomLoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {'error': 'Email and password are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        email    = serializer.validated_data['email'].strip().lower()
        password = serializer.validated_data['password']

        lookups = [
            ('buyer',    Buyer,     'buyer_id',    lambda u: u.name),
            ('supplier', Supplier,  'supplier_id', lambda u: u.shop_name),
            ('admin',    AdminUser, 'admin_id',    lambda u: u.name),
        ]

        for role, Model, id_field, name_fn in lookups:
            try:
                user = Model.objects.get(email=email)
            except Model.DoesNotExist:
                continue

            if not user.check_password(password):
                return Response(
                    {'error': 'Invalid email or password.'},
                    status=status.HTTP_401_UNAUTHORIZED,
                )

            if not user.is_active:
                return Response(
                    {'error': 'Your account has been deactivated. Contact support.'},
                    status=status.HTTP_403_FORBIDDEN,
                )

            user_id = getattr(user, id_field)
            name    = name_fn(user)
            tokens  = _make_tokens(role, user_id, user.email, name)

            return Response({
                **tokens,
                'role':  role,
                'id':    user_id,
                'name':  name,
                'email': user.email,
            }, status=status.HTTP_200_OK)

        return Response(
            {'error': 'Invalid email or password.'},
            status=status.HTTP_401_UNAUTHORIZED,
        )


# ═══════════════════════════════════════════════════════════════════════════
#  CATEGORIES  (public)
# ═══════════════════════════════════════════════════════════════════════════

class CategoryListView(generics.ListAPIView):
    queryset           = Category.objects.all().order_by('name')
    serializer_class   = CategorySerializer
    permission_classes = [permissions.AllowAny]
    pagination_class   = None


# ═══════════════════════════════════════════════════════════════════════════
#  BUYER — PRODUCTS  (public read)
#
#  KEY FIX: list() and retrieve() both pass context={'request': request}
#  to the serializer so ProductImageSerializer returns absolute media URLs
#  instead of relative paths that silently 404 in the browser.
# ═══════════════════════════════════════════════════════════════════════════

class BuyerProductListView(generics.ListAPIView):
    serializer_class   = ProductSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class   = CustomPagination

    def get_queryset(self):
        qs = (
            Product.objects
            .filter(is_active=True, is_available=True)
            .select_related('supplier', 'category')
            .prefetch_related('images')
        )

        search = self.request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(
                Q(name__icontains=search)
                | Q(description__icontains=search)
                | Q(supplier__shop_name__icontains=search)
            )

        category = self.request.query_params.get('category', '').strip()
        if category:
            try:
                qs = qs.filter(category_id=int(category))
            except (ValueError, TypeError):
                pass

        min_price = self.request.query_params.get('min_price', '').strip()
        if min_price:
            try:
                qs = qs.filter(price__gte=float(min_price))
            except (ValueError, TypeError):
                pass

        max_price = self.request.query_params.get('max_price', '').strip()
        if max_price:
            try:
                qs = qs.filter(price__lte=float(max_price))
            except (ValueError, TypeError):
                pass

        ordering = self.request.query_params.get('ordering', '').strip()
        order_map = {
            'price_asc':  'price',
            'price_desc': '-price',
            'newest':     '-created_at',
        }
        qs = qs.order_by(order_map.get(ordering, '-created_at'))
        return qs

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page     = self.paginate_queryset(queryset)
        ctx      = {'request': request}

        if page is not None:
            serializer = self.get_serializer(page, many=True, context=ctx)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True, context=ctx)
        return Response(serializer.data)


class BuyerProductDetailView(generics.RetrieveAPIView):
    serializer_class   = ProductSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return (
            Product.objects
            .filter(is_active=True, is_available=True)
            .select_related('supplier', 'category')
            .prefetch_related('images')
        )

    def retrieve(self, request, *args, **kwargs):
        instance   = self.get_object()
        serializer = self.get_serializer(
            instance, context={'request': request}
        )
        return Response(serializer.data)


# ═══════════════════════════════════════════════════════════════════════════
#  BUYER — CART
#
#  cart/count/ is a @action(detail=False) so the router places its URL
#  BEFORE cart/<pk>/, preventing the str pk from matching the word "count".
# ═══════════════════════════════════════════════════════════════════════════

class CartViewSet(viewsets.ModelViewSet):
    serializer_class   = CartSerializer
    permission_classes = [IsBuyer]
    http_method_names  = ['get', 'post', 'patch', 'delete', 'head', 'options']

    def get_queryset(self):
        return (
            Cart.objects
            .filter(buyer=self.request.user)
            .select_related('product__supplier', 'product__category')
            .prefetch_related('product__images')
        )

    @action(detail=False, methods=['get'], url_path='count')
    def count(self, request):
        n = self.get_queryset().count()
        return Response({'count': n})

    def create(self, request, *args, **kwargs):
        product_id = request.data.get('product')
        quantity   = max(1, int(request.data.get('quantity', 1)))

        if not product_id:
            return Response(
                {'error': 'product field is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            product = Product.objects.get(
                pk=product_id, is_available=True, is_active=True
            )
        except Product.DoesNotExist:
            return Response(
                {'error': 'Product not found or unavailable.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if product.stock < quantity:
            return Response(
                {'error': f'Only {product.stock} units in stock.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cart_item, created = Cart.objects.get_or_create(
            buyer=request.user,
            product=product,
            defaults={'quantity': quantity},
        )
        if not created:
            new_qty            = min(cart_item.quantity + quantity, product.stock)
            cart_item.quantity = new_qty
            cart_item.save(update_fields=['quantity', 'updated_at'])

        serializer  = self.get_serializer(cart_item)
        http_status = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response(serializer.data, status=http_status)

    def partial_update(self, request, *args, **kwargs):
        cart_item = self.get_object()
        quantity  = request.data.get('quantity')

        if quantity is None:
            return Response(
                {'error': 'quantity is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        quantity = int(quantity)
        if quantity < 1:
            cart_item.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        if quantity > cart_item.product.stock:
            quantity = cart_item.product.stock

        cart_item.quantity = quantity
        cart_item.save(update_fields=['quantity', 'updated_at'])
        return Response(self.get_serializer(cart_item).data)

    def perform_create(self, serializer):
        serializer.save(buyer=self.request.user)


# ═══════════════════════════════════════════════════════════════════════════
#  BUYER — WISHLIST
# ═══════════════════════════════════════════════════════════════════════════

class WishlistViewSet(viewsets.ModelViewSet):
    serializer_class   = WishlistSerializer
    permission_classes = [IsBuyer]
    http_method_names  = ['get', 'post', 'delete', 'head', 'options']

    def get_queryset(self):
        return (
            Wishlist.objects
            .filter(buyer=self.request.user)
            .select_related('product__supplier', 'product__category')
            .prefetch_related('product__images')
        )

    def create(self, request, *args, **kwargs):
        product_id = request.data.get('product')
        if not product_id:
            return Response(
                {'error': 'product field is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            product = Product.objects.get(pk=product_id, is_active=True)
        except Product.DoesNotExist:
            return Response(
                {'error': 'Product not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        item, created = Wishlist.objects.get_or_create(
            buyer=request.user, product=product
        )
        serializer  = self.get_serializer(item)
        http_status = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response(serializer.data, status=http_status)

    def perform_create(self, serializer):
        serializer.save(buyer=self.request.user)


# ═══════════════════════════════════════════════════════════════════════════
#  BUYER — CHECKOUT
# ═══════════════════════════════════════════════════════════════════════════

class CheckoutView(APIView):
    permission_classes = [IsBuyer]

    @transaction.atomic
    def post(self, request):
        buyer      = request.user
        cart_items = list(
            Cart.objects
            .filter(buyer=buyer)
            .select_related('product__supplier')
        )

        if not cart_items:
            return Response(
                {'error': 'Your cart is empty.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        shipping_address = request.data.get('shipping_address', '').strip()
        payment_method   = request.data.get('payment_method', 'cod')

        if not shipping_address:
            return Response(
                {'error': 'Shipping address is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        for item in cart_items:
            p = item.product
            if not p.is_active or not p.is_available:
                return Response(
                    {'error': f'"{p.name}" is no longer available.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if p.stock < item.quantity:
                return Response(
                    {
                        'error': (
                            f'"{p.name}" has insufficient stock. '
                            f'Available: {p.stock}, '
                            f'Requested: {item.quantity}'
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        groups: dict = defaultdict(list)
        for item in cart_items:
            groups[item.product.supplier_id].append(item)

        created_orders = []

        for supplier_id, items in groups.items():
            supplier = items[0].product.supplier
            total    = sum(item.quantity * item.product.price for item in items)

            order = Order.objects.create(
                buyer            = buyer,
                supplier         = supplier,
                total_amount     = total,
                shipping_address = shipping_address,
                status           = 'pending',
            )

            for item in items:
                p = item.product
                OrderItem.objects.create(
                    order        = order,
                    product      = p,
                    product_name = p.name,
                    quantity     = item.quantity,
                    price        = p.price,
                    total        = item.quantity * p.price,
                )
                p.stock -= item.quantity
                p.save(update_fields=['stock'])

            Payment.objects.create(
                order  = order,
                amount = total,
                method = payment_method,
                status = 'pending',
            )

            created_orders.append(order)

        Cart.objects.filter(buyer=buyer).delete()

        return Response(
            OrderSerializer(created_orders, many=True).data,
            status=status.HTTP_201_CREATED,
        )


# ═══════════════════════════════════════════════════════════════════════════
#  BUYER — ORDERS
# ═══════════════════════════════════════════════════════════════════════════

class BuyerOrderListView(generics.ListAPIView):
    serializer_class   = OrderSerializer
    permission_classes = [IsBuyer]
    pagination_class   = None

    def get_queryset(self):
        qs = (
            Order.objects
            .filter(buyer=self.request.user)
            .select_related('buyer', 'supplier')
            .prefetch_related('items', 'payment')
            .order_by('-order_date')
        )
        s = self.request.query_params.get('status', '').strip()
        if s:
            qs = qs.filter(status=s)
        return qs


class BuyerOrderDetailView(generics.RetrieveAPIView):
    serializer_class   = OrderSerializer
    permission_classes = [IsBuyer]

    def get_queryset(self):
        return (
            Order.objects
            .filter(buyer=self.request.user)
            .select_related('buyer', 'supplier')
            .prefetch_related('items', 'payment')
        )


# ═══════════════════════════════════════════════════════════════════════════
#  BUYER — PROFILE
# ═══════════════════════════════════════════════════════════════════════════

class BuyerProfileView(generics.RetrieveUpdateAPIView):
    serializer_class   = BuyerSerializer
    permission_classes = [IsBuyer]
    http_method_names  = ['get', 'patch', 'head', 'options']

    def get_object(self):
        return self.request.user

    def partial_update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)


# ═══════════════════════════════════════════════════════════════════════════
#  BUYER — REVIEWS
# ═══════════════════════════════════════════════════════════════════════════

class BuyerReviewCreateView(generics.CreateAPIView):
    serializer_class   = ReviewSerializer
    permission_classes = [IsBuyer]

    def perform_create(self, serializer):
        serializer.save(buyer=self.request.user)


# ═══════════════════════════════════════════════════════════════════════════
#  SUPPLIER — PRODUCTS
#
#  KEY FIX: context={'request': request} passed everywhere so image URLs
#  come back as absolute paths in both create and update responses.
# ═══════════════════════════════════════════════════════════════════════════

class SupplierProductViewSet(viewsets.ModelViewSet):
    serializer_class   = ProductSerializer
    permission_classes = [IsSupplier]
    parser_classes     = [MultiPartParser, FormParser, JSONParser]
    pagination_class   = None

    def get_queryset(self):
        return (
            Product.objects
            .filter(supplier=self.request.user)
            .select_related('category')
            .prefetch_related('images')
            .order_by('-created_at')
        )

    def perform_create(self, serializer):
        serializer.save(supplier=self.request.user)

    def perform_update(self, serializer):
        serializer.save(supplier=self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(
            data=request.data,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)

        instance = (
            Product.objects
            .prefetch_related('images')
            .select_related('category', 'supplier')
            .get(pk=serializer.instance.pk)
        )
        return Response(
            self.get_serializer(instance, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        partial    = kwargs.pop('partial', False)
        instance   = self.get_object()
        serializer = self.get_serializer(
            instance,
            data=request.data,
            partial=partial,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        instance.refresh_from_db()
        return Response(
            self.get_serializer(instance, context={'request': request}).data
        )


# ═══════════════════════════════════════════════════════════════════════════
#  SUPPLIER — ORDERS
# ═══════════════════════════════════════════════════════════════════════════

class SupplierOrderListView(generics.ListAPIView):
    serializer_class   = OrderSerializer
    permission_classes = [IsSupplier]
    pagination_class   = None

    def get_queryset(self):
        qs = (
            Order.objects
            .filter(supplier=self.request.user)
            .select_related('buyer', 'supplier')
            .prefetch_related('items', 'payment')
            .order_by('-order_date')
        )
        s = self.request.query_params.get('status', '').strip()
        if s:
            qs = qs.filter(status=s)
        return qs


class SupplierOrderUpdateView(generics.UpdateAPIView):
    serializer_class   = OrderStatusSerializer
    permission_classes = [IsSupplier]
    http_method_names  = ['patch', 'head', 'options']

    def get_queryset(self):
        return Order.objects.filter(supplier=self.request.user)

    def update(self, request, *args, **kwargs):
        order      = self.get_object()
        serializer = self.get_serializer(order, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        full = OrderSerializer(
            Order.objects
            .prefetch_related('items', 'payment')
            .select_related('buyer', 'supplier')
            .get(pk=order.pk)
        )
        return Response(full.data)


# ═══════════════════════════════════════════════════════════════════════════
#  SUPPLIER — SHOP SETTINGS
# ═══════════════════════════════════════════════════════════════════════════

class SupplierShopView(APIView):
    permission_classes = [IsSupplier]
    parser_classes     = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        return Response(
            SupplierSerializer(
                request.user,
                context={'request': request},
            ).data
        )

    def patch(self, request):
        serializer = SupplierSerializer(
            request.user,
            data=request.data,
            partial=True,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


# ═══════════════════════════════════════════════════════════════════════════
#  SUPPLIER — EARNINGS
# ═══════════════════════════════════════════════════════════════════════════

class SupplierEarningsView(APIView):
    permission_classes = [IsSupplier]

    def get(self, request):
        supplier = request.user

        delivered_total = (
            Order.objects
            .filter(supplier=supplier, status='delivered')
            .aggregate(total=Sum('total_amount'))['total'] or 0
        )
        pending_total = (
            Order.objects
            .filter(
                supplier=supplier,
                status__in=['pending', 'confirmed', 'processing', 'shipped'],
            )
            .aggregate(total=Sum('total_amount'))['total'] or 0
        )

        commission_rate = 0.05
        balance         = float(delivered_total) * (1 - commission_rate)

        return Response({
            'balance':        round(balance, 2),
            'total_earned':   float(delivered_total),
            'pending_amount': float(pending_total),
        })


# ═══════════════════════════════════════════════════════════════════════════
#  SUPPLIER — PROFILE
# ═══════════════════════════════════════════════════════════════════════════

class SupplierProfileView(APIView):
    permission_classes = [IsSupplier]
    parser_classes     = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        return Response(
            SupplierSerializer(
                request.user,
                context={'request': request},
            ).data
        )

    def patch(self, request):
        serializer = SupplierSerializer(
            request.user,
            data=request.data,
            partial=True,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


# ═══════════════════════════════════════════════════════════════════════════
#  ADMIN — SUPPLIERS
# ═══════════════════════════════════════════════════════════════════════════

class AdminSupplierListView(generics.ListAPIView):
    serializer_class   = SupplierSerializer
    permission_classes = [IsAdmin]
    pagination_class   = None

    def get_queryset(self):
        qs = Supplier.objects.all().order_by('-created_at')
        s  = self.request.query_params.get('status', '').strip()
        if s:
            qs = qs.filter(verification_status=s)
        return qs


class AdminSupplierVerifyView(APIView):
    permission_classes = [IsAdmin]

    def patch(self, request, pk):
        supplier = get_object_or_404(Supplier, pk=pk)

        v_status = request.data.get('verification_status')
        if v_status is not None:
            if v_status not in ('pending', 'verified', 'rejected'):
                return Response(
                    {'error': 'Invalid verification_status.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            supplier.verification_status = v_status

        kyc = request.data.get('kyc_verified')
        if kyc is not None:
            supplier.kyc_verified = bool(kyc)

        supplier.save(update_fields=['verification_status', 'kyc_verified'])
        return Response(
            SupplierSerializer(
                supplier,
                context={'request': request},
            ).data
        )


# ═══════════════════════════════════════════════════════════════════════════
#  ADMIN — PRODUCTS
#
#  KEY FIX: Returns ALL products including inactive ones for moderation.
#  list() override passes context so image URLs are absolute.
# ═══════════════════════════════════════════════════════════════════════════

class AdminProductListView(generics.ListAPIView):
    serializer_class   = ProductSerializer
    permission_classes = [IsAdmin]
    pagination_class   = None

    def get_queryset(self):
        return (
            Product.objects.all()
            .select_related('supplier', 'category')
            .prefetch_related('images')
            .order_by('-created_at')
        )

    def list(self, request, *args, **kwargs):
        queryset   = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(
            queryset,
            many=True,
            context={'request': request},
        )
        return Response(serializer.data)


class AdminProductModerateView(APIView):
    permission_classes = [IsAdmin]

    def patch(self, request, pk):
        product = get_object_or_404(Product, pk=pk)

        changed = []
        if 'is_active' in request.data:
            product.is_active = bool(request.data['is_active'])
            changed.append('is_active')
        if 'is_available' in request.data:
            product.is_available = bool(request.data['is_available'])
            changed.append('is_available')

        if changed:
            product.save(update_fields=changed)

        return Response(
            ProductSerializer(
                product,
                context={'request': request},
            ).data
        )


# ═══════════════════════════════════════════════════════════════════════════
#  ADMIN — ORDERS
# ═══════════════════════════════════════════════════════════════════════════

class AdminOrderListView(generics.ListAPIView):
    serializer_class   = OrderSerializer
    permission_classes = [IsAdmin]
    pagination_class   = None

    def get_queryset(self):
        qs = (
            Order.objects.all()
            .select_related('buyer', 'supplier')
            .prefetch_related('items', 'payment')
            .order_by('-order_date')
        )
        s = self.request.query_params.get('status', '').strip()
        if s:
            qs = qs.filter(status=s)
        return qs


# ═══════════════════════════════════════════════════════════════════════════
#  ADMIN — USERS
# ═══════════════════════════════════════════════════════════════════════════

class AdminUserListView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        ctx = {'request': request}
        return Response({
            'buyers': BuyerSerializer(
                Buyer.objects.all().order_by('-created_at'),
                many=True,
                context=ctx,
            ).data,
            'suppliers': SupplierSerializer(
                Supplier.objects.all().order_by('-created_at'),
                many=True,
                context=ctx,
            ).data,
            'admins': AdminUserSerializer(
                AdminUser.objects.all().order_by('-created_at'),
                many=True,
                context=ctx,
            ).data,
        })


# ═══════════════════════════════════════════════════════════════════════════
#  ADMIN — DASHBOARD STATS
# ═══════════════════════════════════════════════════════════════════════════

class AdminDashboardStatsView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        total_revenue = (
            Order.objects
            .filter(status='delivered')
            .aggregate(total=Sum('total_amount'))['total'] or 0
        )
        return Response({
            'total_buyers':      Buyer.objects.count(),
            'total_suppliers':   Supplier.objects.count(),
            'pending_suppliers': Supplier.objects.filter(
                verification_status='pending'
            ).count(),
            'total_products':    Product.objects.count(),
            'total_orders':      Order.objects.count(),
            'total_revenue':     float(total_revenue),
        })