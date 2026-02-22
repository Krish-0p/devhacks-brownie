/* ── HTTP API Client ── */

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

let isRefreshing = false;
let refreshQueue: Array<{ resolve: (v: boolean) => void; reject: (e: Error) => void }> = [];

function processQueue(success: boolean, error?: Error) {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (success) resolve(true);
    else reject(error ?? new Error('Refresh failed'));
  });
  refreshQueue = [];
}

async function refreshToken(): Promise<boolean> {
  if (isRefreshing) {
    return new Promise((resolve, reject) => {
      refreshQueue.push({ resolve, reject });
    });
  }

  isRefreshing = true;
  try {
    const res = await fetch('/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) {
      processQueue(false, new Error('Refresh failed'));
      return false;
    }
    processQueue(true);
    return true;
  } catch (err) {
    processQueue(false, err as Error);
    return false;
  } finally {
    isRefreshing = false;
  }
}

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// Global callback set by auth store for session expiry
let onSessionExpired: (() => void) | null = null;
export function setSessionExpiredHandler(handler: () => void) {
  onSessionExpired = handler;
}

async function request<T>(method: HttpMethod, path: string, body?: unknown): Promise<T> {
  const opts: RequestInit = {
    method,
    credentials: 'include',
    headers: body instanceof FormData ? {} : { 'Content-Type': 'application/json' },
  };

  if (body) {
    opts.body = body instanceof FormData ? body : JSON.stringify(body);
  }

  let res = await fetch(path, opts);

  // Handle token expiry → auto-refresh
  if (res.status === 401) {
    const data = await res.json().catch(() => ({}));
    if (data.code === 'TOKEN_EXPIRED') {
      const refreshed = await refreshToken();
      if (refreshed) {
        res = await fetch(path, opts);
      } else {
        onSessionExpired?.();
        throw new ApiError('Session expired', 401, 'SESSION_EXPIRED');
      }
    } else {
      onSessionExpired?.();
      throw new ApiError(data.message || 'Unauthorized', 401, data.code);
    }
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({ message: res.statusText }));
    throw new ApiError(data.message || data.error || res.statusText, res.status, data.code);
  }

  // Handle 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  del: <T>(path: string) => request<T>('DELETE', path),
  upload: <T>(path: string, formData: FormData) => request<T>('POST', path, formData),
};
