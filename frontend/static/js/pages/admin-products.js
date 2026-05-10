/* ─── Admin: All Products ─────────────────────────────────────────────── */

async function loadProducts() {
    const container = document.getElementById('productsList');
    if (container) container.innerHTML = skeletonCard(9);

    try {
        /*
         * FIX: must call admin/products (returns ALL products including
         * inactive ones) not the public products/ endpoint (which only
         * returns is_active=true & is_available=true products).
         */
        const products = await getList('admin/products');

        if (!products.length) {
            container.innerHTML = emptyState(
                '📦', 'No products yet',
                'Products created by suppliers will appear here for moderation.'
            );
            return;
        }

        container.innerHTML = products.map(p => {
            const img    = p.images?.[0]?.image || '';
            const active = p.is_active !== false;
            return `
            <div class="card admin-product-card" style="overflow:hidden">
                <div style="height:140px;background:var(--surface);position:relative;overflow:hidden">
                    ${img
                        ? `<img src="${img}" alt="${p.name}"
                               style="width:100%;height:100%;object-fit:cover"
                               onerror="this.parentElement.innerHTML='<div class=product-img-placeholder style=height:100%>📦</div>'">`
                        : `<div class="product-img-placeholder" style="height:100%">📦</div>`
                    }
                    <div class="badge ${active ? 'badge-success' : 'badge-error'}"
                         style="position:absolute;top:0.625rem;right:0.625rem">
                        ${active ? 'Active' : 'Inactive'}
                    </div>
                </div>
                <div style="padding:1rem">
                    <div style="font-weight:700;font-size:0.9rem;margin-bottom:0.2rem"
                         class="truncate-1">${p.name}</div>
                    <div style="font-size:0.78rem;color:var(--text-2);margin-bottom:0.625rem">
                        by ${p.supplier_name || 'Supplier'}
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.875rem">
                        <span style="font-family:var(--font-display);font-weight:800;color:#A78BFA">
                            ${formatCurrency(p.price)}
                        </span>
                        <span style="font-size:0.75rem;color:var(--text-3)">Stock: ${p.stock}</span>
                    </div>
                    <button
                        onclick="toggleProductActive(${p.product_id}, ${!active})"
                        class="btn btn-sm btn-full ${active ? 'btn-danger' : 'btn-success'}"
                    >
                        ${active ? '🚫 Deactivate' : '✅ Activate'}
                    </button>
                </div>
            </div>`;
        }).join('');

    } catch (err) {
        if (container) {
            container.innerHTML = `<div class="alert alert-error" style="grid-column:1/-1">${err.message}</div>`;
        }
    }
}

async function toggleProductActive(id, newActive) {
    try {
        const res = await fetchWithAuth(`/api/admin/products/${id}/moderate/`, {
            method: 'PATCH',
            body:   JSON.stringify({ is_active: newActive }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || data.detail || 'Moderation failed');
        showToast(`Product ${newActive ? 'activated' : 'deactivated'}`, 'success');
        loadProducts();
    } catch (err) {
        showToast(err.message, 'error');
    }
}