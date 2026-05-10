let currentPage    = 1;
let currentFilters = {
    search: '', category: '', min_price: '', max_price: '', ordering: ''
};

/* ── Main loader ─────────────────────────────────────────────────── */
async function loadProducts(filters = currentFilters, page = currentPage) {
    const container = document.getElementById('productList');
    const countEl   = document.getElementById('resultCount');
    if (container) container.innerHTML = skeletonCard(8);

    const params = new URLSearchParams();
    params.set('page', page);
    if (filters.search)    params.set('search',    filters.search);
    if (filters.category)  params.set('category',  filters.category);
    if (filters.min_price) params.set('min_price', filters.min_price);
    if (filters.max_price) params.set('max_price', filters.max_price);
    if (filters.ordering)  params.set('ordering',  filters.ordering);

    try {
        const data = await apiRequest(`products/?${params.toString()}`);

        let products, total;
        if (data && Array.isArray(data.results)) {
            products = data.results;
            total    = data.count ?? products.length;
        } else if (Array.isArray(data)) {
            products = data;
            total    = data.length;
        } else {
            products = [];
            total    = 0;
        }

        if (countEl) {
            countEl.textContent = total === 0
                ? 'No products found'
                : `${total} product${total !== 1 ? 's' : ''}`;
        }

        renderProducts(products, container);
        renderPagination(data, page);

    } catch (err) {
        if (container) {
            container.innerHTML =
                `<div class="alert alert-error" style="grid-column:1/-1">
                    Failed to load products: ${err.message}
                 </div>`;
        }
        showToast('Failed to load products: ' + err.message, 'error');
    }
}

/* ── Render product cards ────────────────────────────────────────── */
function renderProducts(products, container) {
    if (!container) return;

    if (!products || !products.length) {
        container.innerHTML =
            `<div style="grid-column:1/-1">${
                emptyState(
                    '🔍',
                    'No products found',
                    'Try adjusting your filters or search term.',
                    `<button onclick="resetFilters()" class="btn btn-secondary btn-sm"
                             style="margin-top:0.75rem">Reset Filters</button>`
                )
            }</div>`;
        return;
    }

    container.innerHTML = products.map(p => {
        const imgSrc  = p.images?.[0]?.image || '';
        const inStock = (p.stock ?? 0) > 0;

        return `
        <div class="product-card">
            <div class="product-img-wrap">
                <a href="/products/${p.product_id}/">
                    ${imgSrc
                        ? `<img
                            src="${imgSrc}"
                            alt="${p.name}"
                            loading="lazy"
                            onerror="this.parentElement.innerHTML='<div class=product-img-placeholder>📦<span>${p.name}</span></div>'">`
                        : `<div class="product-img-placeholder">📦<span>${p.name}</span></div>`
                    }
                </a>
                <button
                    class="product-wishlist-btn"
                    onclick="addToWishlist(event, ${p.product_id})"
                    title="Add to wishlist"
                    aria-label="Add ${p.name} to wishlist">❤</button>
                ${p.stock > 0 && p.stock <= 10
                    ? `<span class="product-badge"
                             style="background:rgba(245,158,11,0.9);color:#000">
                           Low Stock
                       </span>` : ''}
                ${p.stock === 0
                    ? `<span class="product-badge"
                             style="background:rgba(239,68,68,0.9);color:white">
                           Out of Stock
                       </span>` : ''}
            </div>
            <div class="product-body">
                ${p.category_name
                    ? `<div class="product-category">${p.category_name}</div>` : ''}
                <a href="/products/${p.product_id}/">
                    <div class="product-name">${p.name}</div>
                </a>
                <div class="product-supplier">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" stroke-width="2">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    </svg>
                    ${p.supplier_name || 'Seller'}
                </div>
                <div class="product-footer">
                    <div class="product-price">${formatCurrency(p.price)}</div>
                    <button
                        onclick="addToCart(event, ${p.product_id})"
                        class="btn btn-primary btn-sm"
                        ${!inStock ? 'disabled' : ''}>
                        ${inStock ? '+ Cart' : 'Sold Out'}
                    </button>
                </div>
            </div>
        </div>`;
    }).join('');
}

/* ── Pagination bar ──────────────────────────────────────────────── */
function renderPagination(data, page) {
    const container = document.getElementById('pagination');
    if (!container) return;

    const hasNext = data && data.next;
    const hasPrev = data && data.previous;

    if (!hasNext && !hasPrev) {
        container.innerHTML = '';
        return;
    }

    const total = data.count || 0;
    const totalPages = Math.ceil(total / 20) || 1;

    container.innerHTML = `
        ${hasPrev
            ? `<button onclick="changePage(${page - 1})"
                       class="btn btn-secondary btn-sm">← Prev</button>` : ''}
        <span style="font-size:0.85rem;color:var(--text-2);padding:0 0.5rem">
            Page ${page} of ${totalPages}
        </span>
        ${hasNext
            ? `<button onclick="changePage(${page + 1})"
                       class="btn btn-secondary btn-sm">Next →</button>` : ''}`;
}

function changePage(page) {
    currentPage = page;
    loadProducts(currentFilters, page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ── Categories ──────────────────────────────────────────────────── */
async function loadCategories() {
    try {
        const cats   = await getList('categories');
        const select = document.getElementById('categoryFilter');
        if (!select || !cats.length) return;

        cats.forEach(c => {
            const opt       = document.createElement('option');
            opt.value       = c.category_id;
            opt.textContent = c.name;
            select.appendChild(opt);
        });
    } catch {
        /* non-fatal — category filter just stays empty */
    }
}

/* ── Reset ───────────────────────────────────────────────────────── */
function resetFilters() {
    currentFilters = {
        search: '', category: '', min_price: '', max_price: '', ordering: ''
    };
    ['searchInput', 'categoryFilter', 'minPrice', 'maxPrice', 'sortFilter']
        .forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
    currentPage = 1;
    loadProducts();
}

/* ── Cart / Wishlist helpers ─────────────────────────────────────── */
async function addToCart(e, productId) {
    e.preventDefault();
    e.stopPropagation();
    const btn  = e.currentTarget;
    const orig = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '…';

    try {
        await createItem('cart', { product: productId, quantity: 1 });
        showToast('Added to cart!', 'success');
        btn.innerHTML = '✓ Added';
        if (typeof loadCartCount === 'function') loadCartCount();
        setTimeout(() => { btn.innerHTML = orig; btn.disabled = false; }, 1600);
    } catch (err) {
        showToast(err.message, 'error');
        btn.disabled = false;
        btn.innerHTML = orig;
    }
}

async function addToWishlist(e, productId) {
    // Prevent any default link behavior and stop bubbling
    e.preventDefault();
    e.stopPropagation();
    
    // Get the button element safely
    let btn = e.currentTarget;
    // Fallback: if currentTarget is null (should not happen but guard)
    if (!btn || !btn.classList) {
        btn = e.target.closest('.product-wishlist-btn');
    }
    // If still null, we cannot proceed
    if (!btn || !btn.classList) {
        console.warn('Wishlist button not found for product', productId);
        showToast('Could not add to wishlist', 'error');
        return;
    }
    
    try {
        await createItem('wishlist', { product: productId });
        showToast('Added to wishlist!', 'success');
        btn.classList.add('active');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

/* ── Filter event bindings ───────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('applyFilters')?.addEventListener('click', () => {
        currentFilters = {
            search:    document.getElementById('searchInput')?.value.trim()   || '',
            category:  document.getElementById('categoryFilter')?.value       || '',
            min_price: document.getElementById('minPrice')?.value             || '',
            max_price: document.getElementById('maxPrice')?.value             || '',
            ordering:  document.getElementById('sortFilter')?.value           || '',
        };
        currentPage = 1;
        loadProducts();
    });

    document.getElementById('resetFilters')?.addEventListener('click', resetFilters);

    document.getElementById('searchInput')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') document.getElementById('applyFilters')?.click();
    });
});