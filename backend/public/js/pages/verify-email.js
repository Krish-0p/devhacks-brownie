// ============================================
// Verify Email Page
// ============================================

const VerifyEmailPage = (() => {
  const form = document.getElementById('verify-email-form');
  const otpInput = document.getElementById('verify-otp');
  const errorEl = document.getElementById('verify-email-error');
  const submitBtn = document.getElementById('verify-email-btn');
  const emailDisplay = document.getElementById('verify-email-address');
  const resendLink = document.getElementById('link-resend-otp');

  let email = '';

  function init() {
    form.addEventListener('submit', onSubmit);

    resendLink.addEventListener('click', async (e) => {
      e.preventDefault();
      if (!email) return;
      try {
        await Api.post('/auth/resend-verification', { email });
        UI.showToast('Verification code resent!');
      } catch (err) {
        UI.showToast(err.message || 'Failed to resend');
      }
    });

    document.getElementById('link-login-from-verify').addEventListener('click', (e) => {
      e.preventDefault();
      UI.showView('login');
    });
  }

  function setEmail(e) {
    email = e;
    emailDisplay.textContent = e;
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
      await Api.post('/auth/verify-email', { email, otp: code });
      form.reset();
      UI.showToast('Email verified! You can now sign in.');
      UI.showView('login');
    } catch (err) {
      errorEl.textContent = err.message || 'Verification failed';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Verify Email';
    }
  }

  return { init, setEmail };
})();
