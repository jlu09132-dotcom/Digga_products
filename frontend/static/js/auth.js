/* ============================================================
   Digga 2.0 — Auth Module
   Login, logout, session helpers
   ============================================================ */

async function login(email, password) {
    try {
        const res  = await fetch('/api/login/', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || data.detail || 'Invalid credentials');

        localStorage.setItem('access_token',  data.access);
        localStorage.setItem('refresh_token', data.refresh);
        localStorage.setItem('user_role',     data.role);
        localStorage.setItem('user_id',       String(data.id));
        localStorage.setItem('user_name',     data.name);
        localStorage.setItem('user_email',    data.email);
        return true;
    } catch (err) {
        return { error: err.message };
    }
}

function logout() {
    ['access_token','refresh_token','user_role','user_id','user_name','user_email']
        .forEach(k => localStorage.removeItem(k));
    window.location.href = '/login/';
}

function isAuthenticated() { return !!localStorage.getItem('access_token'); }
function requireAuth()     { if (!isAuthenticated()) window.location.href = '/login/'; }
function requireRole(role) { if (getUserRole() !== role) window.location.href = '/'; }

function getUserRole()  { return localStorage.getItem('user_role')  || ''; }
function getUserId()    { return localStorage.getItem('user_id')    || ''; }
function getUserName()  { return localStorage.getItem('user_name')  || 'User'; }
function getUserEmail() { return localStorage.getItem('user_email') || ''; }

/* Expose */
window.login           = login;
window.logout          = logout;
window.isAuthenticated = isAuthenticated;
window.requireAuth     = requireAuth;
window.requireRole     = requireRole;
window.getUserRole     = getUserRole;
window.getUserId       = getUserId;
window.getUserName     = getUserName;
window.getUserEmail    = getUserEmail;