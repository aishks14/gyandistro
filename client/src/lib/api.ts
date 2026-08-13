/**
 * One fetch wrapper for the whole app.
 *
 * The access token lives in memory only — never localStorage — so a script
 * injected into the page has nothing to steal. The long-lived refresh token
 * sits in an httpOnly cookie the browser sends automatically.
 *
 * When a call comes back 401, the wrapper silently refreshes once and retries.
 */

const BASE = import.meta.env.VITE_API_BASE_URL || '';

let accessToken: string | null = null;
let refreshing: Promise<boolean> | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}
export function getAccessToken() {
  return accessToken;
}

export class ApiError extends Error {
  status: number;
  details?: Array<{ field: string; message: string }>;

  constructor(status: number, message: string, details?: ApiError['details']) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  meta?: unknown;
  message?: string;
  details?: Array<{ field: string; message: string }>;
}

async function raw<T>(path: string, init: RequestInit = {}): Promise<ApiEnvelope<T>> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(init.headers as Record<string, string>)
  };
  // FormData (file uploads) must NOT get a manual Content-Type: the browser
  // adds the multipart boundary itself only when the header is left unset.
  if (init.body && !headers['Content-Type'] && !(init.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch(`${BASE}/api${path}`, {
    ...init,
    headers,
    credentials: 'include'
  });

  let payload: ApiEnvelope<T>;
  try {
    payload = (await res.json()) as ApiEnvelope<T>;
  } catch {
    throw new ApiError(res.status, 'The server sent a response we could not read');
  }

  if (!res.ok) throw new ApiError(res.status, payload.message ?? 'Request failed', payload.details);
  return payload;
}

/** Shared across concurrent 401s so only one refresh call goes out. */
async function refreshOnce(): Promise<boolean> {
  if (!refreshing) {
    refreshing = raw<{ accessToken: string }>('/auth/refresh', { method: 'POST' })
      .then((res) => {
        accessToken = res.data?.accessToken ?? null;
        return Boolean(accessToken);
      })
      .catch(() => {
        accessToken = null;
        return false;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<ApiEnvelope<T>> {
  try {
    return await raw<T>(path, init);
  } catch (error) {
    const isAuthCall = path.startsWith('/auth/');
    if (error instanceof ApiError && error.status === 401 && retry && !isAuthCall) {
      const ok = await refreshOnce();
      if (ok) return raw<T>(path, init);
    }
    throw error;
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  upload: <T>(path: string, formData: FormData) => request<T>(path, { method: 'POST', body: formData }),
  refresh: refreshOnce
};

export function formatDate(value?: string | null): string {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

export function roleRank(role?: string): number {
  return { reader: 0, author: 1, editor: 2, admin: 3 }[role ?? 'reader'] ?? 0;
}
