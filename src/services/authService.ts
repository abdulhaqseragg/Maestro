/**
 * Auth Service — Self-hosted backend version
 * Replaces Supabase Auth completely.
 */
import { apiClient, setToken, clearToken, getToken } from './apiClient';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  role: 'ADMIN' | 'USER' | 'VIEWER';
  permissions: Record<string, boolean>;
  settings: { currency: string; language: string };
  expirationDate?: string;
  expiration_date?: string;
  is_active: boolean;
  created_at: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

// ─────────────────────────────────────────────
// AuthService
// ─────────────────────────────────────────────
class AuthService {
  private _currentUser: AuthUser | null = null;

  // Sign in with email/password
  async signIn(email: string, password: string): Promise<AuthUser> {
    const data = await apiClient.publicPost<LoginResponse>('/auth/login', { email, password });
    setToken(data.token);
    this._currentUser = data.user;
    return data.user;
  }

  // Sign out
  async signOut(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // ignore errors on logout
    } finally {
      clearToken();
      this._currentUser = null;
    }
  }

  // Get current authenticated user (verifies token with server)
  async getCurrentUser(): Promise<{ data: { user: AuthUser | null } }> {
    const token = getToken();
    if (!token) {
      return { data: { user: null } };
    }

    // Return cached user if available
    if (this._currentUser) {
      return { data: { user: this._currentUser } };
    }

    try {
      const data = await apiClient.get<{ user: AuthUser }>('/auth/me');
      this._currentUser = data.user;
      return { data: { user: data.user } };
    } catch {
      clearToken();
      return { data: { user: null } };
    }
  }

  // Change password
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await apiClient.post('/auth/change-password', { currentPassword, newPassword });
  }

  // Supabase-compatible shim — for any code that calls onAuthStateChange
  // This is a no-op since we use JWT; components should listen to
  // the 'maestro:session-expired' window event instead.
  onAuthStateChange(_callback: (event: string, session: any) => void) {
    return {
      data: {
        subscription: {
          unsubscribe: () => {}
        }
      }
    };
  }

  // Clear cached user (e.g., after logout)
  clearCache(): void {
    this._currentUser = null;
  }
}

export const authService = new AuthService();