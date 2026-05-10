/* ── Load Profile ── */
async function loadSupplierProfile() {
    try {
        const profile = await apiRequest('supplier/profile/');

        const fields = ['name', 'email', 'phone', 'address'];
        fields.forEach(f => {
            const el = document.getElementById(f);
            if (el) el.value = profile[f] || '';
        });

        const nameEl   = document.getElementById('profileNameDisplay');
        const emailEl  = document.getElementById('profileEmailDisplay');
        const avatarEl = document.getElementById('profileAvatar');

        if (nameEl)   nameEl.textContent  = profile.name  || 'Supplier';
        if (emailEl)  emailEl.textContent = profile.email || '';
        if (avatarEl) {
            avatarEl.textContent = (profile.name || 'S')
                .split(' ')
                .map(w => w[0])
                .join('')
                .slice(0, 2)
                .toUpperCase();
        }

    } catch (err) {
        showToast('Failed to load profile: ' + err.message, 'error');
    }
}

/* ── Submit Profile Form ── */
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('supplierProfileForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const btn      = form.querySelector('button[type="submit"]');
        const alertEl  = document.getElementById('profileAlert');
        const origText = btn?.textContent || 'Save Profile';

        if (btn)     { btn.disabled = true; btn.textContent = 'Saving…'; btn.classList.add('loading'); }
        if (alertEl) { alertEl.style.display = 'none'; }

        const name    = document.getElementById('name')?.value.trim();
        const email   = document.getElementById('email')?.value.trim();
        const phone   = document.getElementById('phone')?.value.trim();
        const address = document.getElementById('address')?.value.trim();
        const pwd     = document.getElementById('password')?.value;

        if (!name)  { showToast('Name is required', 'error');  restoreBtn(btn, origText); return; }
        if (!email) { showToast('Email is required', 'error'); restoreBtn(btn, origText); return; }
        if (!phone) { showToast('Phone is required', 'error'); restoreBtn(btn, origText); return; }

        const payload = { name, email, phone, address };
        if (pwd) payload.password = pwd;

        try {
            const res  = await fetchWithAuth('/api/supplier/profile/', {
                method: 'PATCH',
                body:   JSON.stringify(payload),
            });
            const data = await res.json().catch(() => ({}));

            if (res.ok) {
                localStorage.setItem('user_name', data.name || name);

                const nameDisplayEl  = document.getElementById('profileNameDisplay');
                const emailDisplayEl = document.getElementById('profileEmailDisplay');
                const avatarEl       = document.getElementById('profileAvatar');

                if (nameDisplayEl)  nameDisplayEl.textContent  = data.name  || name;
                if (emailDisplayEl) emailDisplayEl.textContent = data.email || email;
                if (avatarEl) {
                    avatarEl.textContent = (data.name || name)
                        .split(' ')
                        .map(w => w[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase();
                }

                showToast('Profile updated successfully!', 'success');

                if (alertEl) {
                    alertEl.className   = 'alert alert-success';
                    alertEl.textContent = 'Your profile has been saved.';
                    alertEl.style.display = 'flex';
                }

                if (pwd) document.getElementById('password').value = '';

            } else {
                const msg = data.detail || data.error || Object.values(data).flat().join(', ') || 'Update failed';
                throw new Error(msg);
            }

        } catch (err) {
            showToast(err.message, 'error');
            if (alertEl) {
                alertEl.className   = 'alert alert-error';
                alertEl.textContent = err.message;
                alertEl.style.display = 'flex';
            }
        } finally {
            restoreBtn(btn, origText);
        }
    });
});

function restoreBtn(btn, text) {
    if (!btn) return;
    btn.disabled = false;
    btn.textContent = text;
    btn.classList.remove('loading');
}