// ============================================
// Login Page
// ============================================

const LoginPage = (() => {
  const form = document.getElementById('login-form');
  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');
  const errorEl = document.getElementById('login-error');
  const submitBtn = document.getElementById('login-btn');

  function init() {
    form.addEventListener('submit', onSubmit);

    document.getElementById('link-register').addEventListener('click', (e) => {
      e.preventDefault();
      UI.showView('register');
    });

    document.getElementById('link-forgot').addEventListener('click', (e) => {
      e.preventDefault();
      UI.showView('forgot-password');
    });
  }

  async function onSubmit(e) {
    e.preventDefault();
    errorEl.textContent = '';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in...';

    try {
      const res = await Api.post('/auth/login', {
        email: emailInput.value.trim(),
        password: passwordInput.value,
      });

      if (res.mfaRequired) {
        // Pass tempToken to MFA login page
        MfaLoginPage.setTempToken(res.tempToken);
        UI.showView('mfa-login');
      } else {
        // Login success — go to game
        form.reset();
        App.onLoginSuccess(res.user);
      }
    } catch (err) {
      if (err.code === 'EMAIL_NOT_VERIFIED') {
        // Redirect to verify page
        VerifyEmailPage.setEmail(emailInput.value.trim());
        UI.showView('verify-email');
      } else {
        errorEl.textContent = err.message || 'Login failed';
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign In';
    }
  }

  return { init };
})();
