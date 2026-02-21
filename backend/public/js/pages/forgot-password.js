// ============================================
// Forgot Password Page
// ============================================

const ForgotPasswordPage = (() => {
  const emailForm = document.getElementById('forgot-email-form');
  const resetForm = document.getElementById('forgot-reset-form');
  const emailInput = document.getElementById('forgot-email');
  const emailDisplay = document.getElementById('forgot-email-display');
  const otpInput = document.getElementById('forgot-otp');
  const newPasswordInput = document.getElementById('forgot-new-password');
  const errorEl = document.getElementById('forgot-error');
  const resetErrorEl = document.getElementById('forgot-reset-error');
  const sendBtn = document.getElementById('forgot-send-btn');
  const resetBtn = document.getElementById('forgot-reset-btn');
  const step1 = document.getElementById('forgot-step-1');
  const step2 = document.getElementById('forgot-step-2');

  let email = '';

  function init() {
    emailForm.addEventListener('submit', onSendCode);
    resetForm.addEventListener('submit', onReset);

    document.getElementById('link-login-from-forgot').addEventListener('click', (e) => {
      e.preventDefault();
      // Reset to step 1
      step1.style.display = '';
      step2.style.display = 'none';
      UI.showView('login');
    });
  }

  async function onSendCode(e) {
    e.preventDefault();
    errorEl.textContent = '';
    email = emailInput.value.trim();
    if (!email) return;

    sendBtn.disabled = true;
    sendBtn.textContent = 'Sending...';

    try {
      await Api.post('/auth/forgot-password', { email });
      emailDisplay.textContent = email;
      step1.style.display = 'none';
      step2.style.display = '';
      UI.showToast('Reset code sent to your email!');
    } catch (err) {
      errorEl.textContent = err.message || 'Failed to send code';
    } finally {
      sendBtn.disabled = false;
      sendBtn.textContent = 'Send Reset Code';
    }
  }

  async function onReset(e) {
    e.preventDefault();
    resetErrorEl.textContent = '';
    const code = otpInput.value.trim();
    const newPassword = newPasswordInput.value;

    if (code.length !== 6) {
      resetErrorEl.textContent = 'Enter a 6-digit code';
      return;
    }
    if (newPassword.length < 8) {
      resetErrorEl.textContent = 'Password must be at least 8 characters';
      return;
    }

    resetBtn.disabled = true;
    resetBtn.textContent = 'Resetting...';

    try {
      await Api.post('/auth/reset-password', { email, otp: code, newPassword });
      resetForm.reset();
      emailForm.reset();
      step1.style.display = '';
      step2.style.display = 'none';
      UI.showToast('Password reset! You can now sign in.');
      UI.showView('login');
    } catch (err) {
      resetErrorEl.textContent = err.message || 'Reset failed';
    } finally {
      resetBtn.disabled = false;
      resetBtn.textContent = 'Reset Password';
    }
  }

  return { init };
})();
