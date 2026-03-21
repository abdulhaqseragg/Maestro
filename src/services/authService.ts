/**
 * Auth Service — Local Database version
 * No external API dependencies.
 * Stores local session and manages users in the local finance state.
 */
import apiClient, { setToken, clearToken, getToken } from './apiClient';
import { User, FinanceState, UserPermissions } from '../../types';

export interface AuthUser extends User {}

class AuthService {
  private _currentUser: AuthUser | null = null;
  private readonly SESSION_KEY = 'maestro_local_session';
  private readonly STORAGE_KEY = 'maestro_finance_data';

  private getFinanceData(): FinanceState | null {
    const raw = localStorage.getItem(this.STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  private saveFinanceData(data: FinanceState): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
  }

  // Sign in by checking against the local users array and fallback to Cloud
  async signIn(email: string, password: string): Promise<AuthUser> {
    // 1. Try Cloud Auth first if online
    if (navigator.onLine) {
      try {
        const response = await apiClient.publicPost('/auth/login', { email, password });
        if (response.user && response.token) {
          setToken(response.token);
          this._currentUser = response.user;
          localStorage.setItem(this.SESSION_KEY, JSON.stringify(response.user));
          
          // Optionally sync full state from cloud after login
          if (response.state) {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(response.state));
          }
          
          return response.user;
        }
      } catch (cloudErr) {
        console.warn('[AuthService] Cloud login failed, falling back to local:', cloudErr);
      }
    }

    // 2. Fallback to Local Auth
    const data = this.getFinanceData();
    if (!data || !data.users) {
      throw new Error('No users found. Please create an account.');
    }

    const user = data.users.find(u => u.email === email && u.password === password);
    if (!user) {
      throw new Error('Invalid email or password.');
    }

    const token = 'local-token-' + Date.now();
    setToken(token);
    localStorage.setItem(this.SESSION_KEY, JSON.stringify(user));
    this._currentUser = user;
    return user;
  }

  // Sign up — create a new user locally and sync to Cloud
  async signUp(email: string, password: string, username: string): Promise<AuthUser> {
    // 1. Try Cloud Sign Up first
    if (navigator.onLine) {
      try {
        const response = await apiClient.publicPost('/auth/signup', { email, password, username });
        if (response.user && response.token) {
          setToken(response.token);
          this._currentUser = response.user;
          localStorage.setItem(this.SESSION_KEY, JSON.stringify(response.user));
          
          // Add to local database too for offline access
          const data = this.getFinanceData() || { users: [], accounts: [], transactions: [], budgets: [], payables: [], receivables: [], goals: [], syncQueue: [], globalSettings: { language: 'en', currency: 'USD' } };
          data.users.push(response.user);
          this.saveFinanceData(data);
          
          return response.user;
        }
      } catch (cloudErr) {
        console.warn('[AuthService] Cloud signup failed, creating local account:', cloudErr);
      }
    }

    // 2. Fallback to Local Sign Up
    const data = this.getFinanceData() || { users: [], accounts: [], transactions: [], budgets: [], payables: [], receivables: [], goals: [], syncQueue: [], globalSettings: { language: 'en', currency: 'USD' } };
    const currentUsers = data?.users || [];

    if (currentUsers.some(u => u.email === email)) {
      throw new Error('User already exists with this email.');
    }

    const newUser: AuthUser = {
      id: crypto.randomUUID(),
      email,
      password,
      username,
      role: 'USER',
      permissions: {
        dashboard: true, accounts: true, transactions: true,
        obligations: true, budgets: true, goals: true, ai: true, settings: true
      },
      settings: { language: 'en', currency: 'USD' }
    };

    data.users.push(newUser);
    this.saveFinanceData(data);
    
    // Auto login after local signup
    return this.signIn(email, password);
  }

  // Sign out
  async signOut(): Promise<void> {
    clearToken();
    localStorage.removeItem(this.SESSION_KEY);
    this._currentUser = null;
  }

  // Get current authenticated user
  async getCurrentUser(): Promise<{ data: { user: AuthUser | null } }> {
    if (this._currentUser) {
      return { data: { user: this._currentUser } };
    }

    const token = getToken();
    const session = localStorage.getItem(this.SESSION_KEY);
    
    if (!token || !session) {
      return { data: { user: null } };
    }

    try {
      this._currentUser = JSON.parse(session);
      return { data: { user: this._currentUser } };
    } catch {
      this.signOut();
      return { data: { user: null } };
    }
  }

  // Local password change
  async changePassword(current: string, newPass: string): Promise<void> {
    const { data: { user } } = await this.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const data = this.getFinanceData();
    if (!data) throw new Error('Database not found');

    const userIdx = data.users.findIndex(u => u.id === user.id && u.password === current);
    if (userIdx === -1) throw new Error('Incorrect current password');

    data.users[userIdx].password = newPass;
    this.saveFinanceData(data);
    
    // Update session
    localStorage.setItem(this.SESSION_KEY, JSON.stringify(data.users[userIdx]));
    this._currentUser = data.users[userIdx];
  }

  // Dummy method for backward compatibility
  onAuthStateChange(_callback: (event: string, session: any) => void) {
    return {
      data: {
        subscription: {
          unsubscribe: () => {}
        }
      }
    };
  }

  // Clear cached user
  clearCache(): void {
    this._currentUser = null;
  }

  // Update session data
  updateSession(user: AuthUser): void {
    localStorage.setItem(this.SESSION_KEY, JSON.stringify(user));
    this._currentUser = user;
  }
}

export const authService = new AuthService();
