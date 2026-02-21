// ============================================
// API Client — fetch wrapper with auto-refresh
// ============================================

const Api = (() => {
  const BASE = '';
  let isRefreshing = false;
  let refreshQueue = [];

  async function request(method, path, body = null, options = {}) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      ...options,
    };
    if (body && method !== 'GET') {
      opts.body = JSON.stringify(body);
    }
    // For multipart (avatar upload), remove Content-Type so browser sets boundary
    if (options.multipart) {
      delete opts.headers['Content-Type'];
      opts.body = body; // FormData
    }

    let res = await fetch(`${BASE}${path}`, opts);

    // If 401 with TOKEN_EXPIRED, try refresh once
    if (res.status === 401) {
      const data = await res.json().catch(() => ({}));
      if (data.code === 'TOKEN_EXPIRED') {
        const refreshed = await tryRefresh();
        if (refreshed) {
          // Retry original request
          res = await fetch(`${BASE}${path}`, opts);
        } else {
          // Refresh failed — redirect to login
          App.onSessionExpired();
          throw new ApiError('Session expired', 401, 'SESSION_EXPIRED');
        }
      } else {
        throw new ApiError(data.message || 'Unauthorized', 401, data.code);
      }
    }

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new ApiError(json.message || json.error || 'Request failed', res.status, json.code);
    }
    return json;
  }

  async function tryRefresh() {
    if (isRefreshing) {
      // Wait for the existing refresh to complete
      return new Promise((resolve) => {
        refreshQueue.push(resolve);
      });
    }
    isRefreshing = true;
    try {
      const res = await fetch(`${BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      const ok = res.ok;
      isRefreshing = false;
      refreshQueue.forEach(cb => cb(ok));
      refreshQueue = [];
      return ok;
    } catch {
      isRefreshing = false;
      refreshQueue.forEach(cb => cb(false));
      refreshQueue = [];
      return false;
    }
  }

  // Convenience methods
  function get(path) { return request('GET', path); }
  function post(path, body) { return request('POST', path, body); }
  function patch(path, body) { return request('PATCH', path, body); }
  function del(path) { return request('DELETE', path); }

  function upload(path, formData) {
    return request('POST', path, formData, { multipart: true });
  }

  // Custom error class
  class ApiError extends Error {
    constructor(message, status, code) {
      super(message);
      this.status = status;
      this.code = code;
    }
  }

  return { get, post, patch, del, upload, ApiError };
})();
