// ============================================
// Register Page
// ============================================

const RegisterPage = (() => {
  const form = document.getElementById('register-form');
  const emailInput = document.getElementById('register-email');
  const usernameInput = document.getElementById('register-username');
  const passwordInput = document.getElementById('register-password');
  const confirmInput = document.getElementById('register-confirm');
  const errorEl = document.getElementById('register-error');
  const submitBtn = document.getElementById('register-btn');
  const usernameStatus = document.getElementById('username-status');
  const usernameHint = document.getElementById('username-hint');

  let checkTimeout = null;
  let lastCheckedUsername = '';
  let usernameAvailable = false;

  function init() {
    form.addEventListener('submit', onSubmit);

    document.getElementById('link-login-from-register').addEventListener('click', (e) => {
      e.preventDefault();
      UI.showView('login');
    });

    // Live username availability check
    usernameInput.addEventListener('input', () => {
      const val = usernameInput.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
      usernameInput.value = val;
      usernameAvailable = false;
      clearTimeout(checkTimeout);

      if (val.length < 3) {
        usernameStatus.textContent = '';
        usernameStatus.className = 'input-status';
        usernameHint.textContent = '3-20 chars • lowercase letters, numbers, underscores';
        usernameHint.className = 'input-hint';
        return;
      }

      usernameStatus.textContent = '⏳';
      usernameStatus.className = 'input-status checking';
      checkTimeout = setTimeout(() => checkUsername(val), 400);
    });
  }

  async function checkUsername(username) {
    if (username === lastCheckedUsername) return;
    lastCheckedUsername = username;
    try {
      const res = await Api.get(`/auth/check-username/${encodeURIComponent(username)}`);
      // Only update if still the current value
      if (usernameInput.value.toLowerCase() !== username) return;
      if (res.available) {
        usernameAvailable = true;
        usernameStatus.textContent = '✓';
        usernameStatus.className = 'input-status available';
        usernameHint.textContent = 'Username is available!';
        usernameHint.className = 'input-hint success';
      } else {
        usernameAvailable = false;
        usernameStatus.textContent = '✗';
        usernameStatus.className = 'input-status taken';
        usernameHint.textContent = res.reason || 'Username is already taken';
        usernameHint.className = 'input-hint error';
      }
    } catch {
      usernameStatus.textContent = '';
      usernameStatus.className = 'input-status';
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    errorEl.textContent = '';

    const email = emailInput.value.trim();
    const username = usernameInput.value.trim().toLowerCase();
    const password = passwordInput.value;
    const confirm = confirmInput.value;

    // Client-side checks
    if (username.length < 3 || username.length > 20) {
      errorEl.textContent = 'Username must be 3-20 characters';
      return;
    }
    if (!/^[a-z0-9_]+$/.test(username)) {
      errorEl.textContent = 'Username can only contain lowercase letters, numbers, and underscores';
      return;
    }
    if (password.length < 8) {
      errorEl.textContent = 'Password must be at least 8 characters';
      return;
    }
    if (password !== confirm) {
      errorEl.textContent = 'Passwords do not match';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating account...';

    try {
      await Api.post('/auth/register', { email, username, password });
      form.reset();
      usernameStatus.textContent = '';
      usernameStatus.className = 'input-status';
      usernameHint.textContent = '3-20 chars • lowercase letters, numbers, underscores';
      usernameHint.className = 'input-hint';
      lastCheckedUsername = '';
      usernameAvailable = false;
      VerifyEmailPage.setEmail(email);
      UI.showView('verify-email');
      UI.showToast('Account created! Check your email for the verification code.');
    } catch (err) {
      errorEl.textContent = err.message || 'Registration failed';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Account';
    }
  }

  return { init };
})();
