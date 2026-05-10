let checkoutCartItems = [];

async function loadCheckout() {
    const summaryEl = document.getElementById('orderSummary');
    const totalEl   = document.getElementById('checkoutTotal');

    try {
        const cart = await getList('cart');
        checkoutCartItems = cart;

        if (!cart.length) {
            if (summaryEl) summaryEl.innerHTML = '<div style="color:var(--text-2);text-align:center;padding:1rem">Your cart is empty. <a href="/products/" style="color:#A78BFA">Shop now</a></div>';
            const btn = document.getElementById('placeOrderBtn');
            if (btn) { btn.disabled = true; btn.style.opacity = '0.5'; }
            return;
        }

        let total = 0;
        if (summaryEl) {
            summaryEl.innerHTML = cart.map(item => {
                const sub = parseFloat(item.subtotal) || 0;
                total += sub;
                return `<div style="display:flex;justify-content:space-between;padding:0.5rem 0;border-bottom:1px solid var(--border)">
                    <span style="color:var(--text-2)">${item.product_details?.name || 'Item'} × ${item.quantity}</span>
                    <span style="font-weight:600">${formatCurrency(sub)}</span>
                </div>`;
            }).join('');
        }

        if (totalEl) totalEl.textContent = formatCurrency(total);

    } catch (err) {
        showToast('Failed to load checkout: ' + err.message, 'error');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('placeOrderBtn');
    if (!btn) return;

    btn.addEventListener('click', async () => {
        const address = document.getElementById('shippingAddress')?.value.trim();
        const method  = document.querySelector('input[name="paymentMethod"]:checked')?.value || 'cod';

        if (!address) { showToast('Please enter your shipping address', 'error'); return; }

        for (const item of checkoutCartItems) {
            if ((item.product_details?.stock || 0) < item.quantity) {
                showToast(`"${item.product_details?.name}" has only ${item.product_details?.stock} in stock`, 'error');
                return;
            }
        }

        btn.disabled = true;
        btn.textContent = 'Placing Order…';
        btn.classList.add('loading');

        try {
            const res  = await fetchWithAuth('/api/checkout/', {
                method: 'POST',
                body:   JSON.stringify({ shipping_address: address, payment_method: method }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                showToast('🎉 Order placed successfully!', 'success');
                setTimeout(() => window.location.href = '/orders/', 1000);
            } else {
                throw new Error(data.error || data.detail || 'Checkout failed');
            }
        } catch (err) {
            showToast(err.message, 'error');
            btn.disabled = false;
            btn.textContent = 'Place Order';
            btn.classList.remove('loading');
        }
    });

    // Highlight selected payment option
    document.querySelectorAll('input[name="paymentMethod"]').forEach(radio => {
        radio.addEventListener('change', () => {
            document.querySelectorAll('.payment-option').forEach(opt => {
                opt.style.borderColor = 'var(--border)';
                opt.style.background  = '';
            });
            const label = radio.closest('.payment-option');
            if (label) { label.style.borderColor = 'var(--primary)'; label.style.background = 'rgba(124,58,237,0.05)'; }
        });
        // Init first selected
        if (radio.checked) {
            const label = radio.closest('.payment-option');
            if (label) { label.style.borderColor = 'var(--primary)'; label.style.background = 'rgba(124,58,237,0.05)'; }
        }
    });
});