async function loadReports() {
    const statsEl       = document.getElementById('reportStats');
    const revenueEl     = document.getElementById('revenueChart');
    const statusEl      = document.getElementById('statusChart');
    const topProductsEl = document.getElementById('topProductsTable');

    if (statsEl) statsEl.innerHTML = skeletonStatCards(4);

    try {
        const [statsRes, ordersRes, productsRes] = await Promise.allSettled([
            apiRequest('admin/stats/'),
            getList('admin/orders'),
            getList('products'),
        ]);

        const stats    = statsRes.status    === 'fulfilled' ? statsRes.value    : {};
        const orders   = ordersRes.status   === 'fulfilled' ? ordersRes.value   : [];
        const products = productsRes.status === 'fulfilled' ? productsRes.value : [];

        if (statsEl) {
            const cards = [
                { label: 'Total Revenue',   value: formatCurrency(stats.total_revenue || 0), icon: '💰', color: '#34D399' },
                { label: 'Total Orders',    value: stats.total_orders    || 0,                 icon: '📦', color: '#A78BFA' },
                { label: 'Active Products', value: products.filter(p => p.is_active !== false).length, icon: '🏷️', color: '#7DD3FC' },
                { label: 'Active Sellers',  value: stats.total_suppliers || 0,                 icon: '🏭', color: '#FCD34D' },
            ];
            statsEl.innerHTML = cards.map(c => `
                <div class="stat-card">
                    <div class="stat-icon" style="font-size:1.25rem;background:rgba(255,255,255,0.04)">${c.icon}</div>
                    <div class="stat-value" style="color:${c.color}">${c.value}</div>
                    <div class="stat-label">${c.label}</div>
                </div>`).join('');
        }

        buildRevenueChart(orders, revenueEl);
        buildStatusChart(orders, statusEl);
        buildTopProducts(orders, products, topProductsEl);

    } catch (err) {
        showToast('Failed to load reports: ' + err.message, 'error');
    }
}

function buildRevenueChart(orders, container) {
    if (!container || !orders.length) {
        if (container) container.innerHTML = `<div style="width:100%;text-align:center;color:var(--text-3);font-size:0.875rem;align-self:center">No data</div>`;
        return;
    }

    const monthlyMap = {};
    orders.forEach(o => {
        const d   = new Date(o.order_date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthlyMap[key] = (monthlyMap[key] || 0) + parseFloat(o.total_amount || 0);
    });

    const sorted = Object.entries(monthlyMap).sort(([a], [b]) => a.localeCompare(b)).slice(-8);
    if (!sorted.length) return;

    const maxVal = Math.max(...sorted.map(([, v]) => v)) || 1;

    container.innerHTML = `
        <div style="display:flex;align-items:flex-end;gap:6px;height:100%;width:100%;padding-top:1rem">
            ${sorted.map(([month, val]) => {
                const pct   = Math.round((val / maxVal) * 100);
                const label = month.slice(5);
                return `
                <div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex:1;min-width:0">
                    <div style="font-size:0.65rem;color:var(--text-3);text-align:center">
                        ${formatCurrency(val).replace('₹', '₹')}
                    </div>
                    <div style="width:100%;background:linear-gradient(180deg,#8B5CF6,#6D28D9);border-radius:4px 4px 0 0;height:${Math.max(pct, 4)}%;transition:height 0.4s ease;position:relative" title="${formatCurrency(val)}"></div>
                    <div style="font-size:0.65rem;color:var(--text-3);white-space:nowrap">${label}</div>
                </div>`;
            }).join('')}
        </div>`;
}

function buildStatusChart(orders, container) {
    if (!container || !orders.length) {
        if (container) container.innerHTML = `<div style="color:var(--text-3);font-size:0.875rem">No data</div>`;
        return;
    }

    const statusMap = {};
    orders.forEach(o => {
        const s = o.status || 'unknown';
        statusMap[s] = (statusMap[s] || 0) + 1;
    });

    const colors = {
        pending:    '#FCD34D',
        confirmed:  '#93C5FD',
        processing: '#A78BFA',
        shipped:    '#7DD3FC',
        delivered:  '#34D399',
        cancelled:  '#F87171',
    };

    const total = orders.length;
    const rows  = Object.entries(statusMap).map(([status, count]) => {
        const pct  = Math.round((count / total) * 100);
        const col  = colors[status] || '#94A3B8';
        return `
        <div style="width:100%">
            <div style="display:flex;justify-content:space-between;font-size:0.78rem;margin-bottom:0.25rem">
                <span style="text-transform:capitalize;font-weight:500">${status}</span>
                <span style="color:var(--text-2)">${count} (${pct}%)</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width:${pct}%;background:${col}"></div>
            </div>
        </div>`;
    }).join('');

    container.innerHTML = `<div style="width:100%;display:flex;flex-direction:column;gap:0.75rem">${rows}</div>`;
}

function buildTopProducts(orders, products, tbody) {
    if (!tbody) return;

    const productMap = {};
    orders.forEach(o => {
        (o.items || []).forEach(item => {
            const pid = item.product_id || item.product;
            if (!productMap[pid]) {
                productMap[pid] = {
                    name:     item.product_name,
                    supplier: o.supplier_name || '—',
                    orders:   0,
                    revenue:  0,
                };
            }
            productMap[pid].orders  += 1;
            productMap[pid].revenue += parseFloat(item.total || 0);
        });
    });

    const sorted = Object.values(productMap)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

    if (!sorted.length) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-2);padding:2rem">No sales data yet</td></tr>`;
        return;
    }

    tbody.innerHTML = sorted.map((p, i) => `
        <tr>
            <td>
                <span style="font-size:0.75rem;font-weight:700;color:var(--text-3)">
                    ${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                </span>
            </td>
            <td><span style="font-weight:600;font-size:0.875rem">${p.name}</span></td>
            <td><span style="color:var(--text-2);font-size:0.875rem">${p.supplier}</span></td>
            <td><span style="font-weight:600">${p.orders}</span></td>
            <td><span style="font-weight:700;color:#A78BFA">${formatCurrency(p.revenue)}</span></td>
        </tr>`).join('');
}

function exportReport() {
    showToast('Generating CSV export…', 'info');
    Promise.all([getList('admin/orders'), apiRequest('admin/stats/')])
        .then(([orders, stats]) => {
            const rows = [
                ['Order ID', 'Buyer', 'Supplier', 'Amount', 'Status', 'Date'],
                ...orders.map(o => [
                    o.order_id,
                    o.buyer_name || '',
                    o.supplier_name || '',
                    o.total_amount,
                    o.status,
                    o.order_date ? new Date(o.order_date).toLocaleDateString() : '',
                ]),
            ];
            const csv     = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
            const blob    = new Blob([csv], { type: 'text/csv' });
            const url     = URL.createObjectURL(blob);
            const a       = document.createElement('a');
            a.href        = url;
            a.download    = `digga-orders-${new Date().toISOString().slice(0,10)}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            showToast('Export downloaded!', 'success');
        })
        .catch(err => showToast('Export failed: ' + err.message, 'error'));
}