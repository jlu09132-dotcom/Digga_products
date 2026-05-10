async function loadBuyerDashboard() {
    const name = getUserName();
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

    const welcomeEl = document.getElementById('welcomeMsg');
    if (welcomeEl) welcomeEl.textContent = `${greeting}, ${name} 👋`;

    try {
        const [orders, cart, wishlist] = await Promise.allSettled([
            getList('orders'),
            getList('cart'),
            getList('wishlist'),
        ]);

        const orderData   = orders.status   === 'fulfilled' ? orders.value   : [];
        const cartData    = cart.status     === 'fulfilled' ? cart.value     : [];
        const wishData    = wishlist.status === 'fulfilled' ? wishlist.value : [];

        // Stats
        const cartEl = document.getElementById('cartCountStat');
        const wishEl = document.getElementById('wishlistStat');
        const ordEl  = document.getElementById('ordersStat');
        if (cartEl) cartEl.textContent = cartData.length;
        if (wishEl) wishEl.textContent = wishData.length;
        if (ordEl)  ordEl.textContent  = orderData.length;

        // Recent orders
        renderRecentOrders(orderData.slice(0, 5));

    } catch (err) {
        showToast('Failed to load dashboard data', 'error');
    }
}

function renderRecentOrders(orders) {
    const container = document.getElementById('recentOrders');
    if (!container) return;

    if (!orders.length) {
        container.innerHTML = emptyState('📦', 'No orders yet', 'Start shopping to see your orders here.',
            `<a href="/products/" class="btn btn-primary btn-sm" style="margin-top:0.75rem">Browse Products</a>`);
        return;
    }

    container.innerHTML = orders.map(o => `
        <a href="/orders/${o.order_id}/" class="card" style="display:flex;align-items:center;justify-content:space-between;padding:1rem 1.25rem;gap:1rem;text-decoration:none">
            <div style="display:flex;align-items:center;gap:0.875rem">
                <div style="width:40px;height:40px;background:rgba(124,58,237,0.1);border-radius:var(--radius);display:flex;align-items:center;justify-content:center;font-size:1.1rem;flex-shrink:0">📦</div>
                <div>
                    <div style="font-weight:600;font-size:0.9rem">Order #${o.order_id}</div>
                    <div style="font-size:0.78rem;color:var(--text-2)">${formatDate(o.order_date)}</div>
                </div>
            </div>
            <div style="display:flex;align-items:center;gap:1rem">
                ${statusBadge(o.status)}
                <div style="font-weight:700;color:#A78BFA">${formatCurrency(o.total_amount)}</div>
            </div>
        </a>
    `).join('');
}