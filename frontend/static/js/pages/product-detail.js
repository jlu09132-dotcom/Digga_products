async function loadProductDetail() {
    const parts     = window.location.pathname.split('/').filter(Boolean);
    const productId = parts[parts.length - 1];
    const container = document.getElementById('productDetailContainer');

    try {
        const p = await getItem('products', productId);

        // Update breadcrumb
        const bc = document.getElementById('breadcrumbName');
        if (bc) bc.textContent = p.name;

        const primaryImg = p.images?.[0]?.image || '';
        const allImgs    = p.images || [];
        const inStock    = p.stock > 0;

        container.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:2.5rem;align-items:start">
            <!-- Image gallery -->
            <div>
                <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-xl);overflow:hidden;aspect-ratio:1/1;margin-bottom:0.75rem">
                    <img id="mainProductImg" src="${primaryImg}" alt="${p.name}"
                        style="width:100%;height:100%;object-fit:cover;cursor:zoom-in;transition:transform 0.3s"
                        onerror="this.src=''" onclick="zoomImage(this)">
                </div>
                ${allImgs.length > 1 ? `
                <div style="display:flex;gap:0.5rem;overflow-x:auto" class="no-scrollbar">
                    ${allImgs.map((img, i) => `
                        <img src="${img.image}" alt="view ${i+1}"
                            style="width:64px;height:64px;object-fit:cover;border-radius:var(--radius);border:2px solid ${i===0?'var(--primary)':'var(--border)'};cursor:pointer;flex-shrink:0;transition:border-color 0.2s"
                            onclick="switchImg(this, '${img.image}')"
                            onerror="this.style.display='none'">`
                    ).join('')}
                </div>` : ''}
            </div>

            <!-- Details -->
            <div style="display:flex;flex-direction:column;gap:1.25rem">
                <div>
                    ${p.category_name ? `<div style="font-size:0.75rem;font-weight:700;color:#A78BFA;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:0.5rem">${p.category_name}</div>` : ''}
                    <h1 style="font-family:var(--font-display);font-size:1.75rem;font-weight:800;line-height:1.2;letter-spacing:-0.02em">${p.name}</h1>
                    <div style="display:flex;align-items:center;gap:0.5rem;margin-top:0.5rem;font-size:0.875rem;color:var(--text-2)">
                        <span>by</span>
                        <span style="color:var(--text-1);font-weight:600">${p.supplier_name || 'Seller'}</span>
                    </div>
                </div>

                <div style="display:flex;align-items:center;gap:1rem">
                    <div style="font-family:var(--font-display);font-size:2.5rem;font-weight:800;letter-spacing:-0.04em;color:#A78BFA">${formatCurrency(p.price)}</div>
                    <div class="badge ${inStock ? 'badge-success' : 'badge-error'}">${inStock ? `In Stock (${p.stock})` : 'Out of Stock'}</div>
                </div>

                <div style="padding:1.25rem;background:rgba(255,255,255,0.025);border:1px solid var(--border);border-radius:var(--radius-lg)">
                    <div style="font-size:0.8rem;font-weight:700;color:var(--text-2);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:0.5rem">Description</div>
                    <p style="color:var(--text-2);font-size:0.9rem;line-height:1.7">${p.description}</p>
                </div>

                <div style="display:flex;align-items:center;gap:0.75rem">
                    <div class="qty-stepper">
                        <button class="qty-btn" onclick="adjustQty(-1)">−</button>
                        <span class="qty-value" id="qtyInput">1</span>
                        <button class="qty-btn" onclick="adjustQty(1)">+</button>
                    </div>
                    <span style="font-size:0.8rem;color:var(--text-3)">Max: ${p.stock}</span>
                </div>

                <div style="display:flex;gap:0.75rem;flex-wrap:wrap">
                    <button id="addToCartBtn" class="btn btn-primary btn-lg" ${!inStock ? 'disabled' : ''} onclick="addToCart(${p.product_id})">
                        🛒 Add to Cart
                    </button>
                    <button id="addToWishlistBtn" class="btn btn-secondary" onclick="addToWishlist(${p.product_id})">
                        ❤️ Wishlist
                    </button>
                </div>

                <div style="padding-top:1rem;border-top:1px solid var(--border);display:flex;flex-direction:column;gap:0.5rem;font-size:0.825rem;color:var(--text-2)">
                    <div>📦 SKU: ${p.product_id}</div>
                    ${p.category_name ? `<div>🏷️ Category: ${p.category_name}</div>` : ''}
                </div>
            </div>
        </div>`;

    } catch (err) {
        if (container) container.innerHTML = emptyState('⚠️', 'Product not found', err.message,
            `<a href="/products/" class="btn btn-secondary" style="margin-top:1rem">← Back to Marketplace</a>`);
    }
}

let currentQty = 1;
function adjustQty(delta) {
    currentQty = Math.max(1, currentQty + delta);
    const el = document.getElementById('qtyInput');
    if (el) el.textContent = currentQty;
}

function switchImg(el, src) {
    document.getElementById('mainProductImg').src = src;
    document.querySelectorAll('[onclick*="switchImg"]').forEach(img => img.style.borderColor = 'var(--border)');
    el.style.borderColor = 'var(--primary)';
}

function zoomImage(img) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.9);z-index:999;display:flex;align-items:center;justify-content:center;cursor:zoom-out';
    const zoomed = document.createElement('img');
    zoomed.src = img.src;
    zoomed.style.cssText = 'max-width:90vw;max-height:90vh;object-fit:contain;border-radius:var(--radius-lg)';
    overlay.appendChild(zoomed);
    overlay.onclick = () => overlay.remove();
    document.body.appendChild(overlay);
}

async function addToCart(id) {
    const btn = document.getElementById('addToCartBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Adding…'; }
    try {
        await createItem('cart', { product: id, quantity: currentQty });
        showToast('Added to cart!', 'success');
        if (typeof loadCartCount === 'function') loadCartCount();
    } catch (err) { showToast(err.message, 'error'); }
    finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '🛒 Add to Cart'; }
    }
}

async function addToWishlist(id) {
    try {
        await createItem('wishlist', { product: id });
        showToast('Added to wishlist!', 'success');
        document.getElementById('addToWishlistBtn').innerHTML = '❤️ Saved!';
    } catch (err) { showToast(err.message, 'error'); }
}