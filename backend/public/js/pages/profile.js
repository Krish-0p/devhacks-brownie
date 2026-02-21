// ============================================
// Profile Page (includes MFA management)
// ============================================

const ProfilePage = (() => {
  const form = document.getElementById('profile-form');
  const emailInput = document.getElementById('profile-email');
  const usernameInput = document.getElementById('profile-username');
  const firstNameInput = document.getElementById('profile-first-name');
  const lastNameInput = document.getElementById('profile-last-name');
  const errorEl = document.getElementById('profile-error');
  const saveBtn = document.getElementById('profile-save-btn');
  const avatarEl = document.getElementById('profile-avatar');
  const avatarInitial = document.getElementById('profile-avatar-initial');
  const avatarFileInput = document.getElementById('avatar-file-input');
  const avatarError = document.getElementById('avatar-error');
  const btnRemoveAvatar = document.getElementById('btn-remove-avatar');
  const statsGrid = document.getElementById('profile-stats-grid');
  const mfaCard = document.getElementById('mfa-setup-card');
  const usernameStatusEl = document.getElementById('profile-username-status');
  const usernameHintEl = document.getElementById('profile-username-hint');

  let checkTimeout = null;
  let originalUsername = '';
  let usernameValid = true;

  function init() {
    form.addEventListener('submit', onSave);

    document.getElementById('link-back-from-profile').addEventListener('click', (e) => {
      e.preventDefault();
      App.refreshLanding();
      UI.showView('landing');
    });

    avatarFileInput.addEventListener('change', onAvatarSelected);
    btnRemoveAvatar.addEventListener('click', onRemoveAvatar);

    // Live username availability check
    usernameInput.addEventListener('input', () => {
      const val = usernameInput.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
      usernameInput.value = val;
      clearTimeout(checkTimeout);

      if (val === originalUsername) {
        usernameValid = true;
        usernameStatusEl.textContent = '';
        usernameStatusEl.className = 'input-status';
        usernameHintEl.textContent = '3-20 chars • lowercase letters, numbers, underscores';
        usernameHintEl.className = 'input-hint';
        return;
      }

      if (val.length < 3) {
        usernameValid = false;
        usernameStatusEl.textContent = '';
        usernameStatusEl.className = 'input-status';
        usernameHintEl.textContent = 'Username must be at least 3 characters';
        usernameHintEl.className = 'input-hint error';
        return;
      }

      usernameValid = false;
      usernameStatusEl.textContent = '⏳';
      usernameStatusEl.className = 'input-status checking';
      checkTimeout = setTimeout(() => checkProfileUsername(val), 400);
    });
  }

  async function checkProfileUsername(username) {
    try {
      const res = await Api.get(`/auth/check-username/${encodeURIComponent(username)}`);
      if (usernameInput.value.toLowerCase() !== username) return;
      if (res.available) {
        usernameValid = true;
        usernameStatusEl.textContent = '✓';
        usernameStatusEl.className = 'input-status available';
        usernameHintEl.textContent = 'Username is available!';
        usernameHintEl.className = 'input-hint success';
      } else {
        usernameValid = false;
        usernameStatusEl.textContent = '✗';
        usernameStatusEl.className = 'input-status taken';
        usernameHintEl.textContent = res.reason || 'Username is already taken';
        usernameHintEl.className = 'input-hint error';
      }
    } catch {
      usernameStatusEl.textContent = '';
      usernameStatusEl.className = 'input-status';
    }
  }

  async function show() {
    UI.showView('profile');
    errorEl.textContent = '';
    avatarError.textContent = '';
    mfaCard.innerHTML = '<p class="auth-subtitle">Loading…</p>';

    try {
      const res = await Api.get('/me');
      const user = res.user;
      populate(user);
      loadMfa(user);
    } catch (err) {
      errorEl.textContent = err.message || 'Failed to load profile';
    }
  }

  // ==============================
  // Profile logic
  // ==============================

  function populate(user) {
    emailInput.value = user.email || '';
    usernameInput.value = user.username || '';
    originalUsername = user.username || '';
    usernameValid = true;
    firstNameInput.value = user.firstName || '';
    lastNameInput.value = user.lastName || '';

    // Reset username status
    usernameStatusEl.textContent = '';
    usernameStatusEl.className = 'input-status';
    usernameHintEl.textContent = '3-20 chars • lowercase letters, numbers, underscores';
    usernameHintEl.className = 'input-hint';

    renderAvatar(user);

    statsGrid.innerHTML = `
      <div class="profile-stat-card">
        <span class="profile-stat-value">${user.gamesPlayed || 0}</span>
        <span class="profile-stat-label">Games Played</span>
      </div>
      <div class="profile-stat-card">
        <span class="profile-stat-value">${user.gamesWon || 0}</span>
        <span class="profile-stat-label">Games Won</span>
      </div>
      <div class="profile-stat-card">
        <span class="profile-stat-value">${user.totalScore || 0}</span>
        <span class="profile-stat-label">Total Score</span>
      </div>
      <div class="profile-stat-card">
        <span class="profile-stat-value">${user.gamesPlayed ? Math.round((user.gamesWon / user.gamesPlayed) * 100) : 0}%</span>
        <span class="profile-stat-label">Win Rate</span>
      </div>
    `;
  }

  function renderAvatar(user) {
    if (user.avatar) {
      avatarEl.innerHTML = `<img src="${user.avatar}" alt="avatar">`;
      avatarEl.classList.add('has-img');
      btnRemoveAvatar.style.display = '';
    } else {
      const name = user.username || user.firstName || user.email || '?';
      avatarEl.innerHTML = '';
      const span = document.createElement('span');
      span.id = 'profile-avatar-initial';
      span.textContent = name[0].toUpperCase();
      avatarEl.appendChild(span);
      avatarEl.classList.remove('has-img');
      btnRemoveAvatar.style.display = 'none';
    }
  }

  async function onSave(e) {
    e.preventDefault();
    errorEl.textContent = '';

    const username = usernameInput.value.trim().toLowerCase();
    const firstName = firstNameInput.value.trim();
    const lastName = lastNameInput.value.trim();

    if (username.length < 3 || username.length > 20 || !/^[a-z0-9_]+$/.test(username)) {
      errorEl.textContent = 'Username must be 3-20 chars: lowercase letters, numbers, underscores';
      return;
    }

    if (username !== originalUsername && !usernameValid) {
      errorEl.textContent = 'Please wait for username availability check or pick a different one';
      return;
    }

    const body = {};
    if (username !== originalUsername) body.username = username;
    body.firstName = firstName || null;
    body.lastName = lastName || null;

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
      const res = await Api.patch('/profile', body);
      populate(res.user);
      UI.showToast('Profile updated!');
    } catch (err) {
      errorEl.textContent = err.message || 'Failed to save';
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Changes';
    }
  }

  async function onAvatarSelected() {
    avatarError.textContent = '';
    const file = avatarFileInput.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      avatarError.textContent = 'Please select an image file';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      avatarError.textContent = 'Image must be under 5MB';
      return;
    }

    const label = document.getElementById('avatar-upload-label');
    label.textContent = 'Uploading...';
    label.style.pointerEvents = 'none';

    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await Api.upload('/profile/avatar', formData);

      avatarEl.innerHTML = `<img src="${res.avatar}" alt="avatar">`;
      avatarEl.classList.add('has-img');
      btnRemoveAvatar.style.display = '';

      UI.showToast('Avatar uploaded!');
    } catch (err) {
      avatarError.textContent = err.message || 'Upload failed';
    } finally {
      label.textContent = '📷 Upload Photo';
      label.style.pointerEvents = '';
      avatarFileInput.value = '';
    }
  }

  async function onRemoveAvatar() {
    avatarError.textContent = '';
    btnRemoveAvatar.disabled = true;

    try {
      await Api.del('/profile/avatar');

      avatarEl.classList.remove('has-img');
      avatarEl.innerHTML = '';
      const name = usernameInput.value.trim() || firstNameInput.value.trim() || emailInput.value || '?';
      const span = document.createElement('span');
      span.id = 'profile-avatar-initial';
      span.textContent = name[0].toUpperCase();
      avatarEl.appendChild(span);
      btnRemoveAvatar.style.display = 'none';

      UI.showToast('Avatar removed');
    } catch (err) {
      avatarError.textContent = err.message || 'Failed to remove avatar';
    } finally {
      btnRemoveAvatar.disabled = false;
    }
  }

  // ==============================
  // MFA logic (absorbed from mfa-setup.js)
  // ==============================

  function loadMfa(user) {
    if (user.mfaEnabled) {
      showMfaDisableView();
    } else {
      showMfaEnableView();
    }
  }

  function showMfaEnableView() {
    mfaCard.innerHTML = `
      <p class="auth-subtitle">Secure your account with an authenticator app.</p>
      <button class="btn btn-primary auth-btn" id="mfa-enable-btn">Generate QR Code</button>
      <div id="mfa-qr-area" style="display:none; margin-top:14px;">
        <p class="auth-subtitle">Scan this QR code with your authenticator app:</p>
        <div id="mfa-qr-img" style="margin:12px auto; text-align:center;"></div>
        <p class="auth-subtitle" style="font-size:0.78rem;">Or enter manually: <code id="mfa-manual-key" style="color:var(--accent-secondary);"></code></p>
        <form id="mfa-verify-form" class="auth-form" style="margin-top:12px;">
          <div class="input-group">
            <label for="mfa-verify-code">Authenticator Code</label>
            <input type="text" id="mfa-verify-code" placeholder="000000" maxlength="6" inputmode="numeric" required>
          </div>
          <span class="auth-error" id="mfa-verify-error"></span>
          <button type="submit" class="btn btn-primary auth-btn" id="mfa-verify-btn">Verify & Enable</button>
        </form>
      </div>
    `;

    document.getElementById('mfa-enable-btn').addEventListener('click', onMfaEnableStart);
  }

  async function onMfaEnableStart() {
    const btn = document.getElementById('mfa-enable-btn');
    btn.disabled = true;
    btn.textContent = 'Generating...';

    try {
      const res = await Api.post('/mfa/enable');
      btn.style.display = 'none';
      const qrArea = document.getElementById('mfa-qr-area');
      qrArea.style.display = 'block';

      const qrImg = document.getElementById('mfa-qr-img');
      const img = document.createElement('img');
      img.src = res.qrCode;
      img.alt = 'MFA QR Code';
      qrImg.appendChild(img);

      document.getElementById('mfa-manual-key').textContent = res.manualEntry;

      document.getElementById('mfa-verify-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const code = document.getElementById('mfa-verify-code').value.trim();
        const errEl = document.getElementById('mfa-verify-error');
        const verifyBtn = document.getElementById('mfa-verify-btn');
        errEl.textContent = '';

        if (code.length !== 6) {
          errEl.textContent = 'Enter a 6-digit code';
          return;
        }

        verifyBtn.disabled = true;
        verifyBtn.textContent = 'Verifying...';

        try {
          await Api.post('/mfa/verify-enable', { otp: code });
          UI.showToast('MFA enabled successfully! 🔒');
          const meRes = await Api.get('/me');
          loadMfa(meRes.user);
        } catch (err) {
          errEl.textContent = err.message || 'Verification failed';
        } finally {
          verifyBtn.disabled = false;
          verifyBtn.textContent = 'Verify & Enable';
        }
      });
    } catch (err) {
      btn.disabled = false;
      btn.textContent = 'Generate QR Code';
      UI.showToast(err.message || 'Failed to generate QR code');
    }
  }

  function showMfaDisableView() {
    mfaCard.innerHTML = `
      <p class="auth-subtitle" style="color:var(--accent-success);">✅ MFA is currently <strong>enabled</strong></p>
      <form id="mfa-disable-form" class="auth-form" style="margin-top:12px;">
        <div class="input-group">
          <label for="mfa-disable-code">Authenticator Code</label>
          <input type="text" id="mfa-disable-code" placeholder="000000" maxlength="6" inputmode="numeric" required>
        </div>
        <span class="auth-error" id="mfa-disable-error"></span>
        <button type="submit" class="btn btn-danger auth-btn" id="mfa-disable-btn">Disable MFA</button>
      </form>
    `;

    document.getElementById('mfa-disable-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const code = document.getElementById('mfa-disable-code').value.trim();
      const errEl = document.getElementById('mfa-disable-error');
      const btn = document.getElementById('mfa-disable-btn');
      errEl.textContent = '';

      if (code.length !== 6) {
        errEl.textContent = 'Enter a 6-digit code';
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Disabling...';

      try {
        await Api.post('/mfa/disable', { otp: code });
        UI.showToast('MFA disabled');
        const meRes = await Api.get('/me');
        loadMfa(meRes.user);
      } catch (err) {
        errEl.textContent = err.message || 'Failed to disable MFA';
      } finally {
        btn.disabled = false;
        btn.textContent = 'Disable MFA';
      }
    });
  }

  return { init, show };
})();
