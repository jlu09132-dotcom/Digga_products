async function loadEarnings() {
    const summaryEl = document.getElementById('earningsSummary');
    const historyEl = document.getElementById('earningsHistory');

    if (summaryEl) summaryEl.innerHTML = skeletonStatCards(3);

    try {
        const [earningsRes, ordersRes] = await Promise.allSettled([
            apiRequest('supplier/earnings/'),
            getList('supplier/orders'),
        ]);

        const earnings = earningsRes.status === 'fulfilled' ? earningsRes.value : { balance: 0, total_earned: 0, pending_amount: 0 };
        const orders   = ordersRes.status   === 'fulfilled' ? ordersRes.value   : [];

        if (summaryEl) {
            summaryEl.innerHTML = `
            <div class="stat-card">
                <div class="stat-icon" style="background:rgba(124,58,237,0.1);color:#A78BFA">💰</div>
                <div class="stat-value gradient-text">${formatCurrency(earnings.balance)}</div>
                <div class="stat-label">Available Balance</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background:rgba(16,185,129,0.1);color:#34D399">📈</div>
                <div class="stat-value gradient-text-green">${formatCurrency(earnings.total_earned)}</div>
                <div class="stat-label">Total Earned</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background:rgba(245,158,11,0.1);color:#FCD34D">⏳</div>
                <div class="stat-value gradient-text-gold">${formatCurrency(earnings.pending_amount)}</div>
                <div class="stat-label">Pending Amount</div>
            </div>`;
        }

        const delivered = orders.filter(o => o.status === 'delivered');
        if (historyEl) {
            if (!delivered.length) {
                historyEl.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:2rem;color:var(--text-2)">No payment history yet</td></tr>`;
            } else {
                historyEl.innerHTML = delivered.map((o, i) => `
                <tr>
                    <td><span style="font-family:monospace;color:#A78BFA">#${o.order_id}</span></td>
                    <td>${formatDate(o.order_date)}</td>
                    <td style="font-weight:600">${formatCurrency(o.total_amount)}</td>
                    <td>${statusBadge('delivered')}</td>
                </tr>`).join('');
            }
        }
    } catch (err) {
        showToast('Failed to load earnings: ' + err.message, 'error');
    }
}