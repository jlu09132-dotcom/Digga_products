/* ── Load Shop ── */
async function loadShop() {
    try {
        const shop = await apiRequest('supplier/shop/');

        const shopNameEl = document.getElementById('shopName');
        const phoneEl    = document.getElementById('phone');
        const addressEl  = document.getElementById('address');

        if (shopNameEl) shopNameEl.value = shop.shop_name || '';
        if (phoneEl)    phoneEl.value    = shop.phone     || '';
        if (addressEl)  addressEl.value  = shop.address   || '';

        const logoPreview = document.getElementById('logoPreview');
        if (logoPreview && shop.shop_logo) {
            logoPreview.innerHTML = `
                <img
                    src="${shop.shop_logo}"
                    alt="Shop logo"
                    style="width:80px;height:80px;border-radius:var(--radius);object-fit:cover;border:1px solid var(--border)"
                    onerror="this.style.display='none'"
                >`;
        }

        const alertEl = document.getElementById('shopAlert');
        if (alertEl && shop.verification_status) {
            const status = shop.verification_status;
            const messages = {
                pending:  '⏳ Your shop is awaiting KYC verification. We will review your documents shortly.',
                verified: '✅ Your shop is verified and active on the marketplace.',
                rejected: '❌ Verification was rejected. Please re-upload valid KYC documents and resubmit.',
            };
            const classes = {
                pending:  'alert alert-info',
                verified: 'alert alert-success',
                rejected: 'alert alert-error',
            };
            alertEl.className   = classes[status] || 'alert alert-info';
            alertEl.textContent = messages[status] || `Verification status: ${status}`;
            alertEl.style.display = 'flex';
        }

    } catch (err) {
        showToast('Failed to load shop settings: ' + err.message, 'error');
    }
}

/* ── Submit Shop Form ── */
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('shopForm');
    if (!form) return;

    /* KYC file name display */
    const kycInput = document.getElementById('kycDoc');
    if (kycInput) {
        kycInput.addEventListener('change', function () {
            const nameEl = document.getElementById('kycFileName');
            if (nameEl) {
                nameEl.textContent = this.files?.[0]
                    ? `✓  ${this.files[0].name}`
                    : '';
            }
        });
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const btn      = form.querySelector('button[type="submit"]');
        const alertEl  = document.getElementById('shopAlert');
        const origText = btn?.textContent || 'Save Shop Settings';

        const shopName = document.getElementById('shopName')?.value.trim();
        const phone    = document.getElementById('phone')?.value.trim();
        const address  = document.getElementById('address')?.value.trim();

        if (!shopName) { showToast('Shop name is required', 'error'); return; }
        if (!phone)    { showToast('Phone number is required', 'error'); return; }
        if (!address)  { showToast('Address is required', 'error'); return; }

        if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; btn.classList.add('loading'); }
        if (alertEl) alertEl.style.display = 'none';

        const formData = new FormData();
        formData.append('shop_name', shopName);
        formData.append('phone',     phone);
        formData.append('address',   address);

        const logoFile = document.getElementById('shopLogo')?.files[0];
        const kycFile  = document.getElementById('kycDoc')?.files[0];
        if (logoFile) formData.append('shop_logo',    logoFile);
        if (kycFile)  formData.append('kyc_document', kycFile);

        try {
            await uploadForm('/api/supplier/shop/', formData, 'PATCH');

            showToast('Shop settings saved!', 'success');

            if (alertEl) {
                alertEl.className   = 'alert alert-success';
                alertEl.textContent = '✅ Shop settings updated successfully.';
                alertEl.style.display = 'flex';
            }

            if (kycFile) {
                const kycStatus = document.getElementById('shopAlert');
                if (kycStatus) {
                    setTimeout(() => {
                        kycStatus.className   = 'alert alert-info';
                        kycStatus.textContent = '⏳ KYC document uploaded. Awaiting admin verification.';
                        kycStatus.style.display = 'flex';
                    }, 1500);
                }
            }

            loadShop();

        } catch (err) {
            showToast(err.message, 'error');

            if (alertEl) {
                alertEl.className   = 'alert alert-error';
                alertEl.textContent = err.message;
                alertEl.style.display = 'flex';
            }

        } finally {
            if (btn) { btn.disabled = false; btn.textContent = origText; btn.classList.remove('loading'); }
        }
    });
});