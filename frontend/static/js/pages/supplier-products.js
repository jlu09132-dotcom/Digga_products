let currentEditId = null;

/* ── Load & Render Products ── */
async function loadSupplierProducts() {
    const container = document.getElementById('productsList');
    const countEl   = document.getElementById('productCountLabel');
    if (container) container.innerHTML = skeletonCard(6);

    try {
        const products = await getList('supplier/products');

        if (countEl) {
            countEl.textContent = `${products.length} ${products.length === 1 ? 'product' : 'products'}`;
        }

        if (!products.length) {
            container.innerHTML = emptyState(
                '📦',
                'No products yet',
                'Add your first product to start selling on Digga.',
                `<button onclick="openAddProductModal()" class="btn btn-primary btn-sm" style="margin-top:0.75rem">+ Add Product</button>`
            );
            return;
        }

        container.innerHTML = products.map(p => {
            const img    = p.images?.[0]?.image || '';
            const active = p.is_active !== false;

            return `
            <div class="card" style="overflow:hidden;display:flex;flex-direction:column">
                <div style="height:170px;background:var(--surface);position:relative;overflow:hidden;flex-shrink:0">
                    ${img
                        ? `<img
                                src="${img}"
                                alt="${p.name}"
                                style="width:100%;height:100%;object-fit:cover;transition:transform 0.3s"
                                onerror="this.parentElement.innerHTML='<div class=product-img-placeholder style=height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center>📦</div>'"
                            >`
                        : `<div class="product-img-placeholder" style="height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center">📦</div>`
                    }
                    <div class="badge ${active ? 'badge-success' : 'badge-error'}"
                         style="position:absolute;top:0.625rem;right:0.625rem">
                        ${active ? 'Active' : 'Inactive'}
                    </div>
                    ${p.stock <= 5 && p.stock > 0
                        ? `<div class="badge badge-warning" style="position:absolute;top:0.625rem;left:0.625rem">Low Stock</div>`
                        : ''}
                    ${p.stock === 0
                        ? `<div class="badge badge-error" style="position:absolute;top:0.625rem;left:0.625rem">Out of Stock</div>`
                        : ''}
                </div>
                <div style="padding:1rem;display:flex;flex-direction:column;flex:1">
                    <div style="font-family:var(--font-display);font-weight:700;font-size:0.95rem;margin-bottom:0.25rem;line-height:1.3" class="truncate-1">
                        ${p.name}
                    </div>
                    <div style="font-size:0.78rem;color:var(--text-2);margin-bottom:0.75rem;line-height:1.5" class="truncate-2">
                        ${p.description || 'No description'}
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.875rem;margin-top:auto">
                        <span style="font-family:var(--font-display);font-size:1.1rem;font-weight:800;color:#A78BFA">
                            ${formatCurrency(p.price)}
                        </span>
                        <span style="font-size:0.78rem;color:${p.stock > 0 ? 'var(--text-3)' : '#F87171'}">
                            Stock: ${p.stock}
                        </span>
                    </div>
                    <div style="display:flex;gap:0.5rem">
                        <button
                            onclick="editProduct(${p.product_id})"
                            class="btn btn-secondary btn-sm"
                            style="flex:1"
                        >
                            ✏️ Edit
                        </button>
                        <button
                            onclick="deleteProduct(${p.product_id})"
                            class="btn btn-danger btn-sm"
                            style="width:36px;padding:0;display:flex;align-items:center;justify-content:center"
                            title="Delete product"
                        >
                            🗑️
                        </button>
                    </div>
                </div>
            </div>`;
        }).join('');

    } catch (err) {
        if (container) {
            container.innerHTML = `<div class="alert alert-error" style="grid-column:1/-1">${err.message}</div>`;
        }
        showToast('Failed to load products: ' + err.message, 'error');
    }
}

/* ── Load Categories into select ── */
async function loadCategories() {
    try {
        const cats   = await getList('categories');
        const select = document.getElementById('productCategory');
        if (!select) return;

        const current = select.value;
        while (select.options.length > 1) select.remove(1);

        cats.forEach(c => {
            const opt       = document.createElement('option');
            opt.value       = c.category_id;
            opt.textContent = c.name;
            select.appendChild(opt);
        });

        if (current) select.value = current;
    } catch (err) {
        console.warn('Could not load categories:', err.message);
    }
}

/* ── Open Add Modal ── */
function openAddProductModal() {
    currentEditId = null;

    const form = document.getElementById('productForm');
    if (form) form.reset();

    const els = {
        productId:       '',
        productName:     '',
        productDesc:     '',
        productPrice:    '',
        productStock:    '',
        productCategory: '',
    };
    Object.entries(els).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) el.value = val;
    });

    const preview = document.getElementById('imagePreview');
    if (preview) preview.innerHTML = '';

    const titleEl = document.getElementById('modalTitle');
    const saveBtn = document.getElementById('saveProductBtn');
    if (titleEl) titleEl.textContent = 'Add New Product';
    if (saveBtn) saveBtn.textContent = 'Add Product';

    openModal('productModal');
}

/* ── Open Edit Modal ── */
window.editProduct = async (id) => {
    const saveBtn = document.getElementById('saveProductBtn');
    const titleEl = document.getElementById('modalTitle');

    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Loading…'; }
    openModal('productModal');

    try {
        const p = await getItem('supplier/products', id);
        currentEditId = id;

        const fields = {
            productId:   p.product_id,
            productName: p.name,
            productDesc: p.description,
            productPrice: p.price,
            productStock: p.stock,
            productCategory: p.category || '',
        };
        Object.entries(fields).forEach(([elId, val]) => {
            const el = document.getElementById(elId);
            if (el) el.value = val;
        });

        if (titleEl) titleEl.textContent = 'Edit Product';
        if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save Changes'; }

        const preview = document.getElementById('imagePreview');
        if (preview) {
            preview.innerHTML = p.images?.length
                ? p.images.map(img => `
                    <div class="img-preview-item">
                        <img src="${img.image}" alt="product image">
                    </div>`).join('')
                : '';
        }

    } catch (err) {
        showToast('Failed to load product: ' + err.message, 'error');
        closeModal('productModal');
        if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save Changes'; }
    }
};

/* ── Delete Product ── */
window.deleteProduct = async (id) => {
    const ok = await confirmAction('Delete this product? This cannot be undone.');
    if (!ok) return;
    try {
        await deleteItem('supplier/products', id);
        showToast('Product deleted successfully', 'success');
        loadSupplierProducts();
    } catch (err) {
        showToast('Delete failed: ' + err.message, 'error');
    }
};

/* ── Submit (Add or Edit) ── */
async function submitProduct() {
    const btn      = document.getElementById('saveProductBtn');
    const origText = btn?.textContent || 'Save Product';

    const name  = document.getElementById('productName')?.value.trim();
    const desc  = document.getElementById('productDesc')?.value.trim();
    const price = parseFloat(document.getElementById('productPrice')?.value);
    const stock = parseInt(document.getElementById('productStock')?.value);

    if (!name)           { showToast('Product name is required', 'error');  return; }
    if (!desc)           { showToast('Description is required', 'error');   return; }
    if (isNaN(price) || price < 0) { showToast('Enter a valid price', 'error');  return; }
    if (isNaN(stock) || stock < 0) { showToast('Enter a valid stock quantity', 'error'); return; }

    if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; btn.classList.add('loading'); }

    const formData = new FormData();
    formData.append('name',        name);
    formData.append('description', desc);
    formData.append('price',       price);
    formData.append('stock',       stock);

    const catVal = parseInt(document.getElementById('productCategory')?.value);
    if (catVal) formData.append('category', catVal);

    const imageFile = document.getElementById('productImage')?.files[0];
    if (imageFile) formData.append('image', imageFile);

    try {
        const url    = currentEditId
            ? `/api/supplier/products/${currentEditId}/`
            : '/api/supplier/products/';
        const method = currentEditId ? 'PATCH' : 'POST';

        await uploadForm(url, formData, method);

        showToast(currentEditId ? 'Product updated!' : 'Product added!', 'success');
        closeModal('productModal');
        loadSupplierProducts();

    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = origText; btn.classList.remove('loading'); }
    }
}