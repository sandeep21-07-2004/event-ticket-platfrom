document.addEventListener("DOMContentLoaded", () => {
    // Redirect if already logged in
    if (getUser()) {
        window.location.href = 'dashboard.html';
        return;
    }

    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const formLogin = document.getElementById('login-form');
    const formRegister = document.getElementById('register-form');

    // Tab switching
    tabLogin.addEventListener('click', () => {
        formLogin.style.display = 'block';
        formRegister.style.display = 'none';
        tabLogin.style.color = 'var(--neon-accent)';
        tabLogin.style.borderBottom = '2px solid var(--neon-accent)';
        tabRegister.style.color = 'var(--text-muted)';
        tabRegister.style.borderBottom = 'none';
    });

    tabRegister.addEventListener('click', () => {
        formLogin.style.display = 'none';
        formRegister.style.display = 'block';
        tabRegister.style.color = 'var(--neon-accent)';
        tabRegister.style.borderBottom = '2px solid var(--neon-accent)';
        tabLogin.style.color = 'var(--text-muted)';
        tabLogin.style.borderBottom = 'none';
    });

    // Login Handle
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: document.getElementById('login-email').value,
                    password: document.getElementById('login-password').value
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);

            setToken(data.token, data.user);
            showToast('Login successful!');
            setTimeout(() => window.location.href = 'dashboard.html', 1000);
        } catch (error) {
            showToast(error.message);
        }
    });

    // Register Handle
    formRegister.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_BASE}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    full_name: document.getElementById('reg-name').value,
                    email: document.getElementById('reg-email').value,
                    password: document.getElementById('reg-password').value,
                    role: document.getElementById('reg-role').value
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);

            showToast('Registration successful! Please login.');
            tabLogin.click();
        } catch (error) {
            showToast(error.message);
        }
    });
});
