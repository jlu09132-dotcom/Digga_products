async function loadSupplierOrders(statusFilter = '') {
    const container = document.getElementById('supplierOrdersList');
    if (container) container.innerHTML = skeletonRow(4);

    try {
        let orders = await getList('supplier/orders');
        if (statusFilter) {
            orders = orders.filter(o => o.status?.toLowerCase() === statusFilter);
        }

        if (!orders.length) {
            container.innerHTML = emptyState('📦', 'No orders', statusFilter ? `No ${statusFilter} orders.` : 'You have no incoming orders yet.');
            return;
        }

        container.innerHTML = orders.map(order => `
        <div class="card" style="padding:1.25rem 1.5rem">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:1rem;margin-bottom:0.875rem">
                <div>
                    <div style="display:flex;align-items:center;gap:0.75rem;flex-wrap:wrap">
                        <span style="font-family:monospace;font-weight:700;color:#A78BFA">Order #${order.order_id}</span>
                        ${statusBadge(order.status)}
                    </div>
                    <div style="font-size:0.8rem;color:var(--text-2);margin-top:0.25rem">
                        Buyer: <strong style="color:var(--text-1)">${order.buyer_name || 'Customer'}</strong>
                        &nbsp;·&nbsp; ${formatDate(order.order_date)}
                    </div>
                </div>
                <div style="font-family:var(--font-display);font-size:1.25rem;font-weight:800;color:#A78BFA">${formatCurrency(order.total_amount)}</div>
            </div>

            ${order.items?.length ? `
            <div style="font-size:0.82rem;color:var(--text-2);margin-bottom:0.875rem;padding:0.625rem 0.875rem;background:rgba(255,255,255,0.025);border-radius:var(--radius);border:1px solid var(--border)">
                ${order.items.map(i => `${i.quantity}× ${i.product_name}`).join(' &nbsp;·&nbsp; ')}
            </div>` : ''}

            <div style="display:flex;align-items:center;gap:0.75rem;flex-wrap:wrap">
                <label style="font-size:0.8rem;font-weight:600;color:var(--text-2)">Update Status:</label>
                <select id="status-${order.order_id}" onchange="updateOrderStatus(${order.order_id}, this.value)" class="input" style="width:auto;min-width:150px">
                    ${['pending','confirmed','processing','shipped','delivered','cancelled'].map(s =>
                        `<option value="${s}" ${order.status === s ? 'selected' : ''}>${s.charAt(0).toUpperCase() + s.slice(1)}</option>`
                    ).join('')}
                </select>
                ${order.shipping_address ? `<span style="font-size:0.78rem;color:var(--text-2)">📍 ${order.shipping_address.slice(0,50)}…</span>` : ''}
            </div>
        </div>`).join('');
    } catch (err) {
        container.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
    }
}

async function updateOrderStatus(orderId, newStatus) {
    const select = document.getElementById(`status-${orderId}`);
    if (select) select.disabled = true;
    try {
        await apiRequest(`supplier/orders/${orderId}/`, 'PATCH', { status: newStatus });
        showToast(`Order #${orderId} updated to ${newStatus}`, 'success');
    } catch (err) {
        showToast('Failed to update order: ' + err.message, 'error');
    } finally {
        if (select) select.disabled = false;
    }
}