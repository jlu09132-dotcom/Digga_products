async function loadOrders(statusFilter = '') {
    const tbody = document.getElementById('ordersList');
    if (tbody) tbody.innerHTML = `
        <tr><td colspan="7" style="text-align:center;padding:2rem">
            <div style="display:inline-flex;flex-direction:column;gap:0.5rem;align-items:center">
                ${skeletonRow(1)}
                <span style="font-size:0.8rem;color:var(--text-2)">Loading orders…</span>
            </div>
        </td></tr>`;

    try {
        let orders = await getList('admin/orders');

        if (statusFilter) {
            orders = orders.filter(o => o.status?.toLowerCase() === statusFilter);
        }

        if (!orders.length) {
            tbody.innerHTML = `
                <tr><td colspan="7">
                    <div class="empty-state" style="padding:3rem">
                        <div class="empty-icon">🛒</div>
                        <div class="empty-title">No orders found</div>
                        <div class="empty-desc">${statusFilter ? `No ${statusFilter} orders.` : 'No orders have been placed yet.'}</div>
                    </div>
                </td></tr>`;
            return;
        }

        tbody.innerHTML = orders.map(o => {
            const itemsSummary = o.items
                ? o.items.map(i => `${i.quantity}× ${i.product_name}`).join(', ')
                : '—';
            return `
            <tr>
                <td>
                    <span style="font-family:monospace;font-weight:700;color:#A78BFA">#${o.order_id}</span>
                </td>
                <td>
                    <div style="font-weight:600;font-size:0.875rem">${o.buyer_name || o.buyer?.name || '—'}</div>
                </td>
                <td>
                    <div style="font-size:0.875rem;color:var(--text-2)">${o.supplier_name || o.supplier?.name || '—'}</div>
                </td>
                <td>
                    <div style="font-size:0.8rem;color:var(--text-2);max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${itemsSummary}</div>
                </td>
                <td>
                    <span style="font-weight:700;color:#A78BFA">${formatCurrency(o.total_amount)}</span>
                </td>
                <td>${statusBadge(o.status)}</td>
                <td>
                    <span style="font-size:0.8rem;color:var(--text-2)">${formatDate(o.order_date)}</span>
                </td>
            </tr>`;
        }).join('');

    } catch (err) {
        if (tbody) tbody.innerHTML = `
            <tr><td colspan="7">
                <div class="alert alert-error" style="margin:1rem">${err.message}</div>
            </td></tr>`;
    }
}