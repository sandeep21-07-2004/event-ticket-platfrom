const API_BASE = 'http://localhost:3000/api';

// --- Utility Functions ---

function showToast(message) {
    let toast = document.getElementById("toast");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "toast";
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = "show";
    setTimeout(() => { toast.className = toast.className.replace("show", ""); }, 3000);
}

function setToken(token, user) {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
}

function getToken() { return localStorage.getItem('auth_token'); }
function getUser() {
    try {
        return JSON.parse(localStorage.getItem('auth_user'));
    } catch (e) { return null; }
}

function logout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    window.location.href = '/index.html';
}

function getAuthHeaders() {
    const token = getToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// Request Wrapper
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;

    // Add default headers
    options.headers = {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
        ...(options.headers || {})
    };

    if (options.body && typeof options.body === 'object') {
        options.body = JSON.stringify(options.body);
    }

    try {
        const response = await fetch(url, options);
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.message || 'API request failed');
        }
        return data;
    } catch (error) {
        showToast(error.message);
        throw error;
    }
}

// Setup common header navigation
document.addEventListener("DOMContentLoaded", () => {
    const user = getUser();
    const guestNav = document.querySelectorAll('.guest-nav');
    const authNav = document.querySelectorAll('.auth-nav');

    if (user) {
        guestNav.forEach(el => el.style.display = 'none');
        authNav.forEach(el => el.style.display = 'inline-block');

        let userNameSpan = document.getElementById('nav-username');
        if (!userNameSpan) {
            const nav = document.querySelector('nav');
            if (nav) {
                userNameSpan = document.createElement('span');
                userNameSpan.id = 'nav-username';
                userNameSpan.style = "margin-left: 20px; color: var(--text-muted); font-size: 0.9em;";
                nav.insertBefore(userNameSpan, nav.firstChild);
            }
        }
        if (userNameSpan) userNameSpan.textContent = `Hello, ${user.full_name}`;
    } else {
        guestNav.forEach(el => el.style.display = 'inline-block');
        authNav.forEach(el => el.style.display = 'none');
    }
});
