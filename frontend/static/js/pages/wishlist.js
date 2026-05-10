async function loadWishlist() {
    const container = document.getElementById('wishlistItems');
    const countEl   = document.getElementById('wishlistCount');
    if (container) container.innerHTML = skeletonCard(6);

    try {
        const wishlist = await getList('wishlist');

        if (countEl) countEl.textContent = `${wishlist.length} ${wishlist.length === 1 ? 'item' : 'items'}`;

        if (!wishlist.length) {
            container.innerHTML = emptyState('❤️', 'Your wishlist is empty',
                'Save items you love and add them to your cart later.',
                `<a href="/products/" class="btn btn-primary btn-sm" style="margin-top:0.75rem">Browse Products</a>`);
            return;
        }

        container.innerHTML = wishlist.map(item => {
            const p   = item.product_details || {};
            const img = p.images?.[0]?.image || '';
            return `
            <div class="product-card">
                <div class="product-img-wrap">
                    <a href="/products/${p.product_id}/">
                        ${img ? `<img src="${img}" alt="${p.name}" onerror="this.parentElement.innerHTML='<div class=product-img-placeholder>📦</div>'">` : '<div class="product-img-placeholder">📦</div>'}
                    </a>
                    <button class="product-wishlist-btn active" onclick="removeFromWishlist(event,${item.id})" title="Remove from wishlist">❤</button>
                </div>
                <div class="product-body">
                    ${p.category_name ? `<div class="product-category">${p.category_name}</div>` : ''}
                    <a href="/products/${p.product_id}/"><div class="product-name">${p.name}</div></a>
                    <div class="product-supplier">${p.supplier_name || 'Seller'}</div>
                    <div class="product-footer">
                        <div class="product-price">${formatCurrency(p.price)}</div>
                        <button onclick="addToCart(event,${p.product_id})" class="btn btn-primary btn-sm" ${(p.stock||0) === 0 ? 'disabled' : ''}>
                            + Cart
                        </button>
                    </div>
                </div>
            </div>`;
        }).join('');
    } catch (err) {
        container.innerHTML = `<div class="alert alert-error" style="grid-column:1/-1">${err.message}</div>`;
    }
}

async function addToCart(e, productId) {
    e.preventDefault(); e.stopPropagation();
    const btn = e.currentTarget;
    btn.disabled = true; btn.innerHTML = '…';
    try {
        await createItem('cart', { product: productId, quantity: 1 });
        showToast('Added to cart!', 'success');
        btn.innerHTML = '✓ Added';
        setTimeout(() => { btn.innerHTML = '+ Cart'; btn.disabled = false; }, 1500);
        if (typeof loadCartCount === 'function') loadCartCount();
    } catch (err) {
        showToast(err.message, 'error');
        btn.disabled = false; btn.innerHTML = '+ Cart';
    }
}

async function removeFromWishlist(e, id) {
    e.preventDefault(); e.stopPropagation();
    try {
        await deleteItem('wishlist', id);
        showToast('Removed from wishlist', 'info');
        loadWishlist();
        if (typeof loadCartCount === 'function') loadCartCount();
    } catch (err) { showToast(err.message, 'error'); }
}