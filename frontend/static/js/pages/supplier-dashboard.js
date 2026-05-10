async function loadSupplierDashboard() {
    try {
        const [shopRes, productsRes, ordersRes] = await Promise.allSettled([
            apiRequest('supplier/shop/'),
            getList('supplier/products'),
            getList('supplier/orders'),
        ]);

        const shop     = shopRes.status     === 'fulfilled' ? shopRes.value     : {};
        const products = productsRes.status === 'fulfilled' ? productsRes.value : [];
        const orders   = ordersRes.status   === 'fulfilled' ? ordersRes.value   : [];

        const nameEl = document.getElementById('supplierName');
        if (nameEl) nameEl.textContent = shop.shop_name || getUserName();

        const pending   = orders.filter(o => o.status === 'pending').length;
        const delivered = orders.filter(o => o.status === 'delivered');
        const revenue   = delivered.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);

        const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        set('productCount',    products.length);
        set('orderCount',      orders.length);
        set('pendingOrderCount', pending);
        set('totalRevenue',    formatCurrency(revenue));

        renderRecentOrders(orders.slice(0, 5));

    } catch (err) {
        showToast('Dashboard error: ' + err.message, 'error');
    }
}

function renderRecentOrders(orders) {
    const container = document.getElementById('recentOrders');
    if (!container) return;

    if (!orders.length) {
        container.innerHTML = emptyState('🛒', 'No orders yet', 'Orders from buyers will appear here.');
        return;
    }

    container.innerHTML = orders.map(o => `
        <div class="card" style="padding:1rem 1.25rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.75rem">
            <div>
                <div style="font-weight:600;font-size:0.9rem">Order #${o.order_id}</div>
                <div style="font-size:0.78rem;color:var(--text-2)">${o.buyer_name || 'Buyer'} · ${formatDate(o.order_date)}</div>
            </div>
            <div style="display:flex;align-items:center;gap:0.75rem">
                ${statusBadge(o.status)}
                <span style="font-weight:700;color:#A78BFA">${formatCurrency(o.total_amount)}</span>
            </div>
        </div>`).join('');
}