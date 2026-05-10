let allUsersData = { buyers: [], suppliers: [], admins: [] };

async function loadUsers(role = 'buyers') {
    const container = document.getElementById('usersList');
    if (container) container.innerHTML = skeletonRow(6);

    try {
        const data = await apiRequest('admin/users/');
        allUsersData = data;
        renderUsersTable(role, data);
    } catch (err) {
        container.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
    }
}

function renderUsersTable(role, data) {
    const container = document.getElementById('usersList');
    if (!container) return;

    const users = data[role] || [];

    if (!users.length) {
        container.innerHTML = emptyState(
            role === 'buyers' ? '👤' : role === 'suppliers' ? '🏭' : '⚙️',
            `No ${role} found`,
            `There are no registered ${role} yet.`
        );
        return;
    }

    if (role === 'buyers') {
        container.innerHTML = `
        <div class="table-wrap">
            <table class="table">
                <thead>
                    <tr>
                        <th>User</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Joined</th>
                    </tr>
                </thead>
                <tbody>
                    ${users.map(u => `
                    <tr>
                        <td>
                            <div style="display:flex;align-items:center;gap:0.75rem">
                                <div class="user-avatar" style="width:32px;height:32px;font-size:0.75rem">
                                    ${(u.name || 'U').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()}
                                </div>
                                <span style="font-weight:600">${u.name}</span>
                            </div>
                        </td>
                        <td><span style="color:var(--text-2);font-size:0.875rem">${u.email}</span></td>
                        <td><span style="color:var(--text-2);font-size:0.875rem">${u.phone || '—'}</span></td>
                        <td><span style="color:var(--text-3);font-size:0.8rem">${formatDate(u.date_joined || u.created_at)}</span></td>
                    </tr>`).join('')}
                </tbody>
            </table>
        </div>`;

    } else if (role === 'suppliers') {
        container.innerHTML = `
        <div class="table-wrap">
            <table class="table">
                <thead>
                    <tr>
                        <th>Shop</th>
                        <th>Owner</th>
                        <th>Email</th>
                        <th>Status</th>
                        <th>KYC</th>
                    </tr>
                </thead>
                <tbody>
                    ${users.map(s => `
                    <tr>
                        <td>
                            <div style="display:flex;align-items:center;gap:0.75rem">
                                <div class="user-avatar" style="width:32px;height:32px;font-size:0.7rem;background:linear-gradient(135deg,#10B981,#059669)">
                                    ${(s.shop_name || 'S').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()}
                                </div>
                                <span style="font-weight:600">${s.shop_name || '—'}</span>
                            </div>
                        </td>
                        <td><span style="font-size:0.875rem">${s.name}</span></td>
                        <td><span style="color:var(--text-2);font-size:0.875rem">${s.email}</span></td>
                        <td>${statusBadge(s.verification_status)}</td>
                        <td>
                            <span class="badge ${s.kyc_verified ? 'badge-success' : 'badge-warning'}">
                                ${s.kyc_verified ? 'Verified' : 'Pending'}
                            </span>
                        </td>
                    </tr>`).join('')}
                </tbody>
            </table>
        </div>`;

    } else if (role === 'admins') {
        container.innerHTML = `
        <div class="table-wrap">
            <table class="table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                    </tr>
                </thead>
                <tbody>
                    ${users.map(a => `
                    <tr>
                        <td>
                            <div style="display:flex;align-items:center;gap:0.75rem">
                                <div class="user-avatar" style="width:32px;height:32px;font-size:0.7rem;background:linear-gradient(135deg,#F59E0B,#D97706)">
                                    ${(a.name || 'A').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()}
                                </div>
                                <span style="font-weight:600">${a.name}</span>
                            </div>
                        </td>
                        <td><span style="color:var(--text-2);font-size:0.875rem">${a.email}</span></td>
                        <td><span class="badge badge-info">Admin</span></td>
                    </tr>`).join('')}
                </tbody>
            </table>
        </div>`;
    }
}