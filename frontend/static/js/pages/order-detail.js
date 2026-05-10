const STATUS_ORDER = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];

async function loadOrderDetail() {
    const parts   = window.location.pathname.split('/').filter(Boolean);
    const orderId = parts[parts.length - 1];
    const container = document.getElementById('orderDetailContainer');

    try {
        const order = await getItem('orders', orderId);
        renderOrderDetail(order, container);
    } catch (err) {
        if (container) container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">⚠️</div>
                <div class="empty-title">Order not found</div>
                <div class="empty-desc">${err.message}</div>
                <a href="/orders/" class="btn btn-secondary" style="margin-top:1rem">← Back to Orders</a>
            </div>`;
    }
}

function renderOrderDetail(order, container) {
    const currentIdx = STATUS_ORDER.indexOf(order.status?.toLowerCase());
    const isCancelled = order.status?.toLowerCase() === 'cancelled';

    const steps = STATUS_ORDER.map((s, i) => {
        let cls = '';
        if (isCancelled) cls = '';
        else if (i < currentIdx) cls = 'done';
        else if (i === currentIdx) cls = 'current';
        return `
        <div class="status-step ${cls}">
            <div class="step-dot">${i < currentIdx && !isCancelled ? '✓' : i + 1}</div>
            <div class="step-label">${s.charAt(0).toUpperCase() + s.slice(1)}</div>
        </div>`;
    }).join('');

    const items = (order.items || []).map(item => `
        <tr>
            <td style="font-weight:500">${item.product_name || '—'}</td>
            <td style="color:var(--text-2)">${item.quantity}</td>
            <td>${formatCurrency(item.unit_price || item.price || 0)}</td>
            <td style="font-weight:600;color:#A78BFA">${formatCurrency(item.total || (item.quantity * (item.unit_price || 0)))}</td>
        </tr>`).join('');

    container.innerHTML = `
        <div class="card" style="padding:2rem;display:flex;flex-direction:column;gap:1.75rem">
            <!-- Header -->
            <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:1rem">
                <div>
                    <h2 style="font-family:var(--font-display);font-size:1.5rem;font-weight:800">Order #${order.order_id}</h2>
                    <div style="color:var(--text-2);font-size:0.875rem;margin-top:0.25rem">Placed on ${formatDate(order.order_date)}</div>
                </div>
                ${statusBadge(order.status)}
            </div>

            <!-- Status tracker -->
            ${!isCancelled ? `
            <div>
                <div class="section-title-sm" style="margin-bottom:1rem">Order Progress</div>
                <div class="status-steps">${steps}</div>
            </div>` : `
            <div class="alert alert-error">This order has been cancelled.</div>`}

            <!-- Items -->
            <div>
                <div class="section-title-sm" style="margin-bottom:0.75rem">Order Items</div>
                <div class="table-wrap">
                    <table class="table">
                        <thead><tr><th>Product</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
                        <tbody>${items || '<tr><td colspan="4" style="text-align:center;color:var(--text-2)">No items</td></tr>'}</tbody>
                    </table>
                </div>
            </div>

            <!-- Summary + shipping -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem">
                <div>
                    <div class="section-title-sm" style="margin-bottom:0.5rem">Shipping Address</div>
                    <div style="color:var(--text-2);font-size:0.875rem;line-height:1.6">${order.shipping_address || '—'}</div>
                </div>
                <div>
                    <div class="section-title-sm" style="margin-bottom:0.5rem">Payment</div>
                    <div style="color:var(--text-2);font-size:0.875rem">${order.payment_method?.toUpperCase() || 'COD'}</div>
                    <div style="font-family:var(--font-display);font-size:1.5rem;font-weight:800;color:#A78BFA;margin-top:0.5rem">${formatCurrency(order.total_amount)}</div>
                </div>
            </div>
        </div>`;
}