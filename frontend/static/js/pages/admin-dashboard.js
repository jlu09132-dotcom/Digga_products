async function loadAdminDashboard() {
    const statsEl   = document.getElementById('adminStats');
    const pendingEl = document.getElementById('pendingSuppliers');
    const recentEl  = document.getElementById('recentOrders');

    if (statsEl) statsEl.innerHTML = skeletonStatCards(6);

    try {
        const [statsRes, suppliersRes, ordersRes] = await Promise.allSettled([
            apiRequest('admin/stats/'),
            getList('admin/suppliers/'),
            getList('admin/orders'),
        ]);

        const stats     = statsRes.status     === 'fulfilled' ? statsRes.value     : {};
        const suppliers = suppliersRes.status === 'fulfilled' ? suppliersRes.value : [];
        const orders    = ordersRes.status    === 'fulfilled' ? ordersRes.value    : [];

        if (statsEl) {
            const cards = [
                { label: 'Total Buyers',    value: stats.total_buyers     || 0, icon: '👤', color: '#818CF8' },
                { label: 'Total Suppliers', value: stats.total_suppliers  || 0, icon: '🏭', color: '#34D399' },
                { label: 'Pending Verif.', value: stats.pending_suppliers || 0, icon: '⏳', color: '#FCD34D' },
                { label: 'Total Products',  value: stats.total_products   || 0, icon: '📦', color: '#A78BFA' },
                { label: 'Total Orders',    value: stats.total_orders     || 0, icon: '🛒', color: '#7DD3FC' },
                { label: 'Total Revenue',   value: formatCurrency(stats.total_revenue || 0), icon: '💰', color: '#34D399' },
            ];
            statsEl.innerHTML = cards.map(c => `
                <div class="stat-card">
                    <div class="stat-icon" style="background:rgba(255,255,255,0.04);font-size:1.25rem">${c.icon}</div>
                    <div class="stat-value" style="color:${c.color};font-size:1.625rem">${c.value}</div>
                    <div class="stat-label">${c.label}</div>
                </div>`).join('');
        }

        const pending = suppliers.filter(s => s.verification_status === 'pending');
        if (pendingEl) {
            if (!pending.length) {
                pendingEl.innerHTML = `
                    <div style="padding:1.5rem;text-align:center;background:var(--card);border:1px solid var(--border);border-radius:var(--radius-xl)">
                        <div style="font-size:1.5rem;margin-bottom:0.5rem">✅</div>
                        <div style="color:var(--text-2);font-size:0.875rem">No pending verifications</div>
                    </div>`;
            } else {
                pendingEl.innerHTML = pending.map(s => `
                    <div class="card" style="padding:1rem 1.25rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.75rem">
                        <div>
                            <div style="font-weight:700;font-size:0.9rem">${s.shop_name || 'Unnamed Shop'}</div>
                            <div style="font-size:0.78rem;color:var(--text-2)">${s.name} &nbsp;·&nbsp; ${s.email}</div>
                        </div>
                        <div style="display:flex;gap:0.5rem">
                            <button onclick="verifySupplier(${s.supplier_id})" class="btn btn-success btn-sm">Approve</button>
                            <button onclick="rejectSupplier(${s.supplier_id})" class="btn btn-danger btn-sm">Reject</button>
                        </div>
                    </div>`).join('');
            }
        }

        const recent = orders.slice(0, 6);
        if (recentEl) {
            if (!recent.length) {
                recentEl.innerHTML = `<div style="padding:1.5rem;text-align:center;background:var(--card);border:1px solid var(--border);border-radius:var(--radius-xl);color:var(--text-2);font-size:0.875rem">No orders yet</div>`;
            } else {
                recentEl.innerHTML = recent.map(o => `
                    <div class="card" style="padding:0.875rem 1.125rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.5rem">
                        <div>
                            <span style="font-family:monospace;font-size:0.85rem;color:#A78BFA;font-weight:700">#${o.order_id}</span>
                            <span style="font-size:0.78rem;color:var(--text-2);margin-left:0.5rem">${o.buyer_name || 'Buyer'}</span>
                        </div>
                        <div style="display:flex;align-items:center;gap:0.625rem">
                            ${statusBadge(o.status)}
                            <span style="font-weight:700;color:#A78BFA;font-size:0.9rem">${formatCurrency(o.total_amount)}</span>
                        </div>
                    </div>`).join('');
            }
        }

    } catch (err) {
        showToast('Dashboard error: ' + err.message, 'error');
    }
}

window.verifySupplier = async (id) => {
    try {
        const res = await fetchWithAuth(`/api/admin/suppliers/${id}/verify/`, {
            method: 'PATCH',
            body: JSON.stringify({ verification_status: 'verified', kyc_verified: true }),
        });
        if (!res.ok) throw new Error('Verification failed');
        showToast('Supplier approved!', 'success');
        loadAdminDashboard();
    } catch (err) { showToast(err.message, 'error'); }
};

window.rejectSupplier = async (id) => {
    const ok = await confirmAction('Reject this supplier application?');
    if (!ok) return;
    try {
        const res = await fetchWithAuth(`/api/admin/suppliers/${id}/verify/`, {
            method: 'PATCH',
            body: JSON.stringify({ verification_status: 'rejected' }),
        });
        if (!res.ok) throw new Error('Rejection failed');
        showToast('Supplier rejected', 'info');
        loadAdminDashboard();
    } catch (err) { showToast(err.message, 'error'); }
};