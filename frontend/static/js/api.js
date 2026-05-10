/* ============================================================
   Digga 2.0 — API Client
   Central HTTP utility with auth, error handling, token management
   ============================================================ */

const API_BASE = '/api/';

/* ── Auth Headers ── */
function getAuthHeaders(isJson = true) {
    const token = localStorage.getItem('access_token');
    const headers = {};
    if (isJson) headers['Content-Type'] = 'application/json';
    if (token)  headers['Authorization'] = `Bearer ${token}`;
    return headers;
}

/* ── Core request (JSON body) ── */
async function apiRequest(endpoint, method = 'GET', body = null) {
    const url = endpoint.startsWith('/') ? endpoint : API_BASE + endpoint;
    const options = { method, headers: getAuthHeaders(true) };
    if (body && method !== 'GET') options.body = JSON.stringify(body);

    let response;
    try {
        response = await fetch(url, options);
    } catch (networkErr) {
        throw new Error('Network error — please check your connection.');
    }

    if (response.status === 401) { logout(); throw new Error('Session expired. Please log in again.'); }
    if (response.status === 204) return null;
    if (response.status === 404) throw new Error('Resource not found.');

    let data;
    try { data = await response.json(); } catch { data = {}; }

    if (!response.ok) {
        const msg = data.detail || data.error || Object.values(data).flat().join(', ') || `Error ${response.status}`;
        throw new Error(msg);
    }
    return data;
}

/* ── fetchWithAuth — fetch()-compatible signature for file uploads & raw fetch ── */
async function fetchWithAuth(url, options = {}) {
    const token = localStorage.getItem('access_token');
    const isFormData = options.body instanceof FormData;

    const headers = { ...(options.headers || {}) };
    if (!isFormData) headers['Content-Type'] = 'application/json';
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let response;
    try {
        response = await fetch(url, { ...options, headers });
    } catch (networkErr) {
        throw new Error('Network error — please check your connection.');
    }

    if (response.status === 401) { logout(); throw new Error('Session expired.'); }
    return response;
}

/* ── Convenience REST helpers ── */
async function getList(resource) {
    const data = await apiRequest(resource.endsWith('/') ? resource : resource + '/');
    if (Array.isArray(data))                  return data;
    if (data && Array.isArray(data.results))  return data.results;
    return [];
}

async function getItem(resource, id)         { return apiRequest(`${resource}/${id}/`); }
async function createItem(resource, data)    { return apiRequest(`${resource}/`, 'POST', data); }
async function patchItem(resource, id, data) { return apiRequest(`${resource}/${id}/`, 'PATCH', data); }
async function deleteItem(resource, id)      { return apiRequest(`${resource}/${id}/`, 'DELETE'); }

/* ── Paginated list (returns full response) ── */
async function getPaginatedList(endpoint) {
    return apiRequest(endpoint.startsWith('/') ? endpoint.replace('/api/', '') : endpoint);
}

/* ── Upload helper (FormData) ── */
async function uploadForm(url, formData, method = 'POST') {
    const res = await fetchWithAuth(url, { method, body: formData });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || data.error || Object.values(data).flat().join(', ') || 'Upload failed');
    return data;
}

/* Expose globals */
window.apiRequest    = apiRequest;
window.fetchWithAuth = fetchWithAuth;
window.getList       = getList;
window.getItem       = getItem;
window.createItem    = createItem;
window.patchItem     = patchItem;
window.deleteItem    = deleteItem;
window.uploadForm    = uploadForm;