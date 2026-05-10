async function loadCart() {
    const itemsEl  = document.getElementById('cartItems');
    const emptyEl  = document.getElementById('cartEmptyState');
    const totalEl  = document.getElementById('cartTotal');
    const countEl  = document.getElementById('cartItemCount');
    const summaryEl = document.getElementById('cartSummaryDetails');

    if (itemsEl) itemsEl.innerHTML = skeletonRow(3);

    try {
        const cart = await getList('cart');

        if (!cart.length) {
            if (itemsEl) itemsEl.innerHTML = '';
            if (emptyEl) emptyEl.style.display = 'block';
            if (totalEl) totalEl.textContent = '₹0';
            if (summaryEl) summaryEl.innerHTML = '';
            const checkoutBtn = document.getElementById('checkoutBtn');
            if (checkoutBtn) { checkoutBtn.style.pointerEvents = 'none'; checkoutBtn.style.opacity = '0.5'; }
            if (countEl) countEl.textContent = '0 items';
            return;
        }

        if (emptyEl) emptyEl.style.display = 'none';

        let total = 0;
        if (countEl) countEl.textContent = `${cart.length} ${cart.length === 1 ? 'item' : 'items'}`;

        if (itemsEl) {
            itemsEl.innerHTML = cart.map(item => {
                const p = item.product_details || {};
                total += parseFloat(item.subtotal) || 0;
                const img = p.images?.[0]?.image || '';
                return `
                <div class="card" style="display:flex;gap:1rem;padding:1.25rem;align-items:flex-start" id="cartRow-${item.id}">
                    <a href="/products/${p.product_id}/" style="flex-shrink:0">
                        ${imgWithFallback(img, p.name, '', 'width:80px;height:80px;object-fit:cover;border-radius:var(--radius);background:var(--surface)')}
                    </a>
                    <div style="flex:1;min-width:0">
                        <a href="/products/${p.product_id}/" style="font-weight:600;font-size:0.95rem;display:block;margin-bottom:0.25rem" class="truncate-1">${p.name || 'Product'}</a>
                        <div style="font-size:0.8rem;color:var(--text-2);margin-bottom:0.75rem">${formatCurrency(p.price)} each</div>
                        <div style="display:flex;align-items:center;gap:0.75rem;flex-wrap:wrap">
                            <div class="qty-stepper">
                                <button class="qty-btn" onclick="updateCartItem(${item.id}, ${item.quantity - 1})">−</button>
                                <span class="qty-value">${item.quantity}</span>
                                <button class="qty-btn" onclick="updateCartItem(${item.id}, ${item.quantity + 1})">+</button>
                            </div>
                            <button onclick="removeCartItem(${item.id})" class="btn btn-danger btn-sm" style="font-size:0.78rem">Remove</button>
                        </div>
                    </div>
                    <div style="font-weight:700;color:#A78BFA;font-size:1rem;white-space:nowrap">${formatCurrency(item.subtotal)}</div>
                </div>`;
            }).join('');
        }

        if (totalEl) totalEl.textContent = formatCurrency(total);
        if (summaryEl) {
            summaryEl.innerHTML = cart.map(item => `
                <div style="display:flex;justify-content:space-between">
                    <span style="color:var(--text-2);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${item.product_details?.name || 'Item'} ×${item.quantity}</span>
                    <span>${formatCurrency(item.subtotal)}</span>
                </div>`).join('');
        }

    } catch (err) {
        if (itemsEl) itemsEl.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
        showToast('Failed to load cart', 'error');
    }
}

async function updateCartItem(id, newQty) {
    if (newQty < 1) { await removeCartItem(id); return; }
    try {
        await patchItem('cart', id, { quantity: newQty });
        loadCart();
        if (typeof loadCartCount === 'function') loadCartCount();
    } catch (err) { showToast(err.message, 'error'); }
}

async function removeCartItem(id) {
    try {
        await deleteItem('cart', id);
        loadCart();
        if (typeof loadCartCount === 'function') loadCartCount();
    } catch (err) { showToast(err.message, 'error'); }
}