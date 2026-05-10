async function loadBuyerOrders(statusFilter = '') {
    const container = document.getElementById('ordersList');
    if (!container) return;
    container.innerHTML = skeletonRow(4);

    try {
        let orders = await getList('orders');
        if (statusFilter) {
            orders = orders.filter(o => o.status?.toLowerCase() === statusFilter);
        }

        if (!orders.length) {
            container.innerHTML = emptyState('📦', 'No orders found',
                statusFilter ? `No ${statusFilter} orders yet.` : 'You haven\'t placed any orders yet.',
                `<a href="/products/" class="btn btn-primary btn-sm" style="margin-top:0.75rem">Start Shopping</a>`);
            return;
        }

        container.innerHTML = orders.map(o => `
            <a href="/orders/${o.order_id}/" class="card" style="display:block;padding:1.25rem 1.5rem;text-decoration:none;transition:all 0.2s">
                <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:1rem;margin-bottom:0.75rem">
                    <div>
                        <div style="display:flex;align-items:center;gap:0.75rem;flex-wrap:wrap">
                            <span style="font-family:'DM Mono',monospace;font-weight:700;color:#A78BFA">Order #${o.order_id}</span>
                            ${statusBadge(o.status)}
                        </div>
                        <div style="font-size:0.8rem;color:var(--text-2);margin-top:0.25rem">${formatDate(o.order_date)}</div>
                    </div>
                    <div style="font-family:var(--font-display);font-size:1.25rem;font-weight:800;color:#A78BFA">${formatCurrency(o.total_amount)}</div>
                </div>
                ${o.items?.length ? `
                <div style="font-size:0.8rem;color:var(--text-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                    ${o.items.map(i => `${i.quantity}× ${i.product_name}`).join(' • ')}
                </div>` : ''}
                <div style="font-size:0.78rem;color:#A78BFA;margin-top:0.75rem">View Details →</div>
            </a>
        `).join('');
    } catch (err) {
        container.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
    }
}