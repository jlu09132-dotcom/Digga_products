async function loadSuppliers(statusFilter = '') {
    const container = document.getElementById('suppliersList');
    if (container) container.innerHTML = skeletonRow(5);

    try {
        let suppliers = await getList('admin/suppliers/');

        if (statusFilter) {
            suppliers = suppliers.filter(s => s.verification_status?.toLowerCase() === statusFilter);
        }

        if (!suppliers.length) {
            container.innerHTML = emptyState(
                '🏭',
                'No suppliers found',
                statusFilter ? `No ${statusFilter} suppliers.` : 'No suppliers have registered yet.'
            );
            return;
        }

        container.innerHTML = suppliers.map(s => {
            const status = s.verification_status || 'pending';
            const badgeCls = status === 'verified' ? 'badge-verified' : status === 'rejected' ? 'badge-rejected' : 'badge-warning';
            const isVerified = status === 'verified';

            return `
            <div class="card" style="padding:1.25rem 1.5rem">
                <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:1rem">
                    <div style="display:flex;gap:1rem;align-items:flex-start">
                        <div class="user-avatar" style="width:48px;height:48px;font-size:1.1rem;flex-shrink:0">
                            ${(s.shop_name || s.name || 'S').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()}
                        </div>
                        <div>
                            <div style="font-weight:700;font-size:1rem">${s.shop_name || 'Unnamed Shop'}</div>
                            <div style="font-size:0.825rem;color:var(--text-2);margin-top:0.1rem">${s.name}</div>
                            <div style="font-size:0.8rem;color:var(--text-3);margin-top:0.125rem">${s.email}&nbsp;&nbsp;${s.phone || ''}</div>
                            <div style="font-size:0.8rem;color:var(--text-3);margin-top:0.125rem">📍 ${s.address || 'No address'}</div>
                        </div>
                    </div>
                    <div style="text-align:right;display:flex;flex-direction:column;align-items:flex-end;gap:0.5rem">
                        <span class="badge ${badgeCls}">${status}</span>
                        <span style="font-size:0.75rem;color:var(--text-3)">KYC: ${s.kyc_verified ? '✅ Verified' : '⏳ Pending'}</span>
                    </div>
                </div>
                <div style="margin-top:1rem;padding-top:0.875rem;border-top:1px solid var(--border);display:flex;gap:0.625rem;flex-wrap:wrap">
                    ${!isVerified ? `
                    <button onclick="verifySupplier(${s.supplier_id})" class="btn btn-success btn-sm">✅ Approve</button>` : ''}
                    ${status !== 'rejected' ? `
                    <button onclick="rejectSupplier(${s.supplier_id})" class="btn btn-danger btn-sm">❌ Reject</button>` : ''}
                    ${s.kyc_document ? `
                    <a href="${s.kyc_document}" target="_blank" class="btn btn-secondary btn-sm">📄 View KYC</a>` : ''}
                </div>
            </div>`;
        }).join('');

    } catch (err) {
        container.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
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
        const activeTab = document.querySelector('#supplierTabs .tab-btn.active');
        loadSuppliers(activeTab?.dataset.status || '');
    } catch (err) { showToast(err.message, 'error'); }
};

window.rejectSupplier = async (id) => {
    const ok = await confirmAction('Reject this supplier? They will be notified.');
    if (!ok) return;
    try {
        const res = await fetchWithAuth(`/api/admin/suppliers/${id}/verify/`, {
            method: 'PATCH',
            body: JSON.stringify({ verification_status: 'rejected' }),
        });
        if (!res.ok) throw new Error('Rejection failed');
        showToast('Supplier rejected', 'info');
        const activeTab = document.querySelector('#supplierTabs .tab-btn.active');
        loadSuppliers(activeTab?.dataset.status || '');
    } catch (err) { showToast(err.message, 'error'); }
};