// ============================================
// MFA Login Verification
// ============================================

const MfaLoginPage = (() => {
  const form = document.getElementById('mfa-login-form');
  const otpInput = document.getElementById('mfa-login-otp');
  const errorEl = document.getElementById('mfa-login-error');
  const submitBtn = document.getElementById('mfa-login-btn');

  let tempToken = '';

  function init() {
    form.addEventListener('submit', onSubmit);

    document.getElementById('link-back-login').addEventListener('click', (e) => {
      e.preventDefault();
      UI.showView('login');
    });
  }

  function setTempToken(token) {
    tempToken = token;
  }

  async function onSubmit(e) {
    e.preventDefault();
    errorEl.textContent = '';
    const code = otpInput.value.trim();
    if (code.length !== 6) {
      errorEl.textContent = 'Enter a 6-digit code';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Verifying...';

    try {
      const res = await Api.post('/auth/login/mfa', { tempToken, otp: code });
      form.reset();
      tempToken = '';
      App.onLoginSuccess(res.user);
    } catch (err) {
      errorEl.textContent = err.message || 'Invalid code';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Verify';
    }
  }

  return { init, setTempToken };
})();
