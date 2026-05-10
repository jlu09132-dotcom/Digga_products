async function loadBuyerProfile() {
    try {
        const profile = await apiRequest('buyer/profile/');
        document.getElementById('name').value    = profile.name    || '';
        document.getElementById('email').value   = profile.email   || '';
        document.getElementById('phone').value   = profile.phone   || '';
        document.getElementById('address').value = profile.address || '';

        const avatarEl = document.getElementById('profileAvatar');
        const nameEl   = document.getElementById('profileNameDisplay');
        const emailEl  = document.getElementById('profileEmailDisplay');

        if (avatarEl) avatarEl.textContent = (profile.name || 'U').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
        if (nameEl)  nameEl.textContent  = profile.name  || '';
        if (emailEl) emailEl.textContent = profile.email || '';
    } catch (err) {
        showToast('Failed to load profile: ' + err.message, 'error');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('profileForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn   = form.querySelector('button[type="submit"]');
        const alert = document.getElementById('profileAlert');
        btn.disabled = true;
        btn.textContent = 'Saving…';
        btn.classList.add('loading');
        if (alert) alert.style.display = 'none';

        const payload = {
            name:    document.getElementById('name').value.trim(),
            email:   document.getElementById('email').value.trim(),
            phone:   document.getElementById('phone').value.trim(),
            address: document.getElementById('address').value.trim(),
        };
        const pwd = document.getElementById('password')?.value;
        if (pwd) payload.password = pwd;

        try {
            const res  = await fetchWithAuth('/api/buyer/profile/', { method: 'PATCH', body: JSON.stringify(payload) });
            const data = await res.json();
            if (res.ok) {
                localStorage.setItem('user_name', data.name || payload.name);
                showToast('Profile updated successfully!', 'success');
                if (alert) { alert.className = 'alert alert-success'; alert.textContent = 'Profile saved.'; alert.style.display = 'flex'; }
            } else {
                throw new Error(data.detail || 'Update failed');
            }
        } catch (err) {
            showToast(err.message, 'error');
            if (alert) { alert.className = 'alert alert-error'; alert.textContent = err.message; alert.style.display = 'flex'; }
        } finally {
            btn.disabled = false;
            btn.textContent = 'Save Changes';
            btn.classList.remove('loading');
        }
    });
});