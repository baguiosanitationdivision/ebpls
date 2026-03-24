// Redirect if already logged in
if (sessionStorage.getItem('admin_token')) {
  window.location.href = 'dashboard.html';
}

document.getElementById('password').addEventListener('keydown', e => {
  if (e.key === 'Enter') doLogin();
});

async function doLogin() {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const errEl    = document.getElementById('error-msg');
  errEl.textContent = '';

  if (!username || !password) {
    errEl.textContent = 'Please enter username and password.';
    return;
  }

  if (!CONFIG.APPS_SCRIPT_URL || CONFIG.APPS_SCRIPT_URL.includes('YOUR_')) {
    errEl.textContent = 'Apps Script URL not configured. See config.js';
    return;
  }

  const btn     = document.getElementById('login-btn');
  const txtEl   = document.getElementById('login-text');
  const spinner = document.getElementById('login-spinner');
  btn.disabled  = true;
  txtEl.textContent = 'Signing in…';
  spinner.hidden = false;

  try {
    const res = await fetch(CONFIG.APPS_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'login', username, password }),
    });
    const result = await res.json();

    if (result.success) {
      // Store token as "username|~|token"
      sessionStorage.setItem('admin_token', username + '|~|' + result.token);
      sessionStorage.setItem('admin_username', username);
      sessionStorage.setItem('admin_fullname', result.fullName);
      window.location.href = 'dashboard.html';
    } else {
      errEl.textContent = 'Invalid username or password.';
    }
  } catch (err) {
    errEl.textContent = 'Connection error. Please try again.';
  } finally {
    btn.disabled = false;
    txtEl.textContent = 'Sign in';
    spinner.hidden = true;
  }
}