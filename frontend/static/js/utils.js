/* ============================================================
   Digga 2.0 — Utilities
   Toast, modal, formatting, cart, skeleton helpers
   ============================================================ */

/* ── Toast ── */
const TOAST_ICONS = { success: '✓', error: '✕', info: 'i' };

function showToast(message, type = 'success', duration = 3500) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-icon">${TOAST_ICONS[type] || 'i'}</div>
        <div class="toast-msg">${message}</div>
    `;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('removing');
        toast.addEventListener('animationend', () => toast.remove(), { once: true });
    }, duration);
}

/* ── Modal ── */
function openModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('hidden');
    el.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('hidden');
    el.classList.remove('open');
    document.body.style.overflow = '';
}

/* ── Currency ── */
function formatCurrency(amount) {
    const n = parseFloat(amount) || 0;
    return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

/* ── Date ── */
function formatDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)  return 'Just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}

/* ── Status badge ── */
function statusBadge(status) {
    const map = {
        pending:    'badge-pending',
        confirmed:  'badge-confirmed',
        processing: 'badge-processing',
        shipped:    'badge-shipped',
        delivered:  'badge-delivered',
        cancelled:  'badge-cancelled',
        verified:   'badge-verified',
        rejected:   'badge-rejected',
        active:     'badge-success',
        inactive:   'badge-error',
    };
    const cls = map[status?.toLowerCase()] || 'badge-neutral';
    return `<span class="badge ${cls}">${status || 'Unknown'}</span>`;
}

/* ── Cart count ── */
async function loadCartCount() {
    const token = localStorage.getItem('access_token');
    if (!token || getUserRole() !== 'buyer') return;
    try {
        const data = await apiRequest('cart/count/');
        const el = document.getElementById('cartCountNav');
        if (el) {
            el.textContent = data.count || 0;
            el.style.display = data.count > 0 ? 'inline-flex' : 'none';
        }
    } catch { /* silent */ }
}

/* ── Skeleton loader HTML ── */
function skeletonCard(n = 6) {
    return Array(n).fill(`
        <div class="card" style="overflow:hidden">
            <div class="skeleton skeleton-img" style="height:180px"></div>
            <div style="padding:1rem">
                <div class="skeleton skeleton-text" style="width:60%;margin-bottom:0.5rem"></div>
                <div class="skeleton skeleton-text" style="width:80%;margin-bottom:0.75rem"></div>
                <div class="skeleton skeleton-text" style="width:40%"></div>
            </div>
        </div>`).join('');
}

function skeletonRow(n = 5) {
    return Array(n).fill(`
        <div style="display:flex;gap:1rem;padding:0.875rem 0;border-bottom:1px solid var(--border);align-items:center">
            <div class="skeleton skeleton-avatar" style="width:36px;height:36px;flex-shrink:0"></div>
            <div style="flex:1">
                <div class="skeleton skeleton-text" style="width:50%;margin-bottom:0.375rem"></div>
                <div class="skeleton skeleton-text" style="width:30%"></div>
            </div>
            <div class="skeleton skeleton-text" style="width:80px"></div>
        </div>`).join('');
}

function skeletonStatCards(n = 4) {
    return Array(n).fill(`
        <div class="stat-card">
            <div class="skeleton" style="width:44px;height:44px;border-radius:var(--radius);margin-bottom:1rem"></div>
            <div class="skeleton skeleton-text" style="width:50%;margin-bottom:0.375rem"></div>
            <div class="skeleton skeleton-title" style="width:70%"></div>
        </div>`).join('');
}

/* ── Empty state HTML ── */
function emptyState(icon, title, desc, actionHtml = '') {
    return `
    <div class="empty-state">
        <div class="empty-icon">${icon}</div>
        <div class="empty-title">${title}</div>
        <div class="empty-desc">${desc}</div>
        ${actionHtml}
    </div>`;
}

/* ── Fallback image ── */
function imgWithFallback(src, alt = '', cls = '', style = '') {
    const placeholder = `https://ui-avatars.com/api/?name=${encodeURIComponent(alt || 'P')}&background=1E293B&color=475569&size=200`;
    return `<img src="${src || placeholder}" alt="${alt}" class="${cls}" style="${style}" onerror="this.src='${placeholder}'">`;
}

/* ── Confirm dialog (returns promise) ── */
function confirmAction(message) {
    return new Promise(resolve => resolve(window.confirm(message)));
}

/* Expose */
window.showToast      = showToast;
window.openModal      = openModal;
window.closeModal     = closeModal;
window.formatCurrency = formatCurrency;
window.formatDate     = formatDate;
window.timeAgo        = timeAgo;
window.statusBadge    = statusBadge;
window.loadCartCount  = loadCartCount;
window.skeletonCard   = skeletonCard;
window.skeletonRow    = skeletonRow;
window.skeletonStatCards = skeletonStatCards;
window.emptyState     = emptyState;
window.imgWithFallback = imgWithFallback;
window.confirmAction  = confirmAction;