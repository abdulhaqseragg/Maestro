/**
 * Maestro API Client
 * Centralized HTTP client — replaces all Supabase calls.
 * Handles auth tokens, refresh, and error normalization.
 */

const API_BASE = (import.meta as any).env.VITE_API_BASE_URL || '/api';
const TOKEN_KEY = 'maestro_access_token';

// ─────────────────────────────────────────────
// Token management
// ─────────────────────────────────────────────
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem('maestro_remembered_user_id');
}

// ─────────────────────────────────────────────
// Core fetch wrapper
// ─────────────────────────────────────────────
async function request<T = any>(
  method: string,
  path: string,
  body?: any,
  skipAuth = false
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (!skipAuth) {
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401) {
    const data = await response.json().catch(() => ({}));
    // Token expired or invalid — clear and redirect to login
    if (data.code === 'TOKEN_EXPIRED' || data.error === 'Invalid token') {
      clearToken();
      window.dispatchEvent(new CustomEvent('maestro:session-expired'));
    }
    throw new Error(data.error || 'Unauthorized');
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Request failed: ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

// ─────────────────────────────────────────────
// HTTP methods
// ─────────────────────────────────────────────
export const apiClient = {
  get:    <T = any>(path: string)             => request<T>('GET',    path),
  post:   <T = any>(path: string, body?: any) => request<T>('POST',   path, body),
  put:    <T = any>(path: string, body?: any) => request<T>('PUT',    path, body),
  delete: <T = any>(path: string)             => request<T>('DELETE', path),

  // Public endpoints (no auth header)
  publicPost: <T = any>(path: string, body?: any) => request<T>('POST', path, body, true),
};

export default apiClient;
