import { describe, it, expect, beforeEach, vi } from 'vitest';
import { authService } from './authService';
import { FinanceState, UserPermissions, AccountType, TransactionType } from '../../types';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    clear: () => { store = {}; },
    removeItem: (key: string) => { delete store[key]; }
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  password: 'password123',
  username: 'testuser',
  role: 'USER' as const,
  permissions: {
    dashboard: true, accounts: true, transactions: true,
    obligations: true, budgets: true, goals: true, ai: true, settings: true
  },
  settings: { currency: 'EGP', language: 'ar' as const }
};

const mockState: FinanceState = {
  users: [mockUser],
  accounts: [],
  transactions: [],
  budgets: [],
  payables: [],
  receivables: [],
  goals: [],
  categories: [],
  globalSettings: { language: 'ar' }
};

describe('AuthService', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('maestro_finance_data', JSON.stringify(mockState));
    authService.clearCache();
  });

  it('should sign in successfully with correct credentials', async () => {
    const user = await authService.signIn('test@example.com', 'password123');
    expect(user.email).toBe('test@example.com');
    expect(localStorage.getItem('maestro_local_session')).toBeDefined();
  });

  it('should throw error with incorrect credentials', async () => {
    await expect(authService.signIn('test@example.com', 'wrong-pass'))
      .rejects.toThrow('Invalid email or password.');
  });

  it('should sign up a new user successfully', async () => {
    const newUser = await authService.signUp('new@example.com', 'pass123', 'newuser');
    expect(newUser.email).toBe('new@example.com');
    
    const data = JSON.parse(localStorage.getItem('maestro_finance_data') || '{}');
    expect(data.users.length).toBe(2);
  });
});
