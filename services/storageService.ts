/**
 * Storage Service — Self-hosted Backend version
 * Removes all Supabase dependencies.
 * Strategy: localStorage + IndexedDB (offline) → backend API (online sync)
 */
import { FinanceState } from '../types';
import { offlineStorage } from '../src/services/offlineStorage';
import { syncService } from '../src/services/syncService';
import { authService } from '../src/services/authService';
import { apiClient } from '../src/services/apiClient';

const STORAGE_KEY = 'maestro_finance_data';

export const storageService = {

  // ── Save state ──────────────────────────────────────────────
  save: async (data: FinanceState) => {
    try {
      // Always persist locally first (instant + offline-safe)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      await offlineStorage.cacheData('financeState', data, 'app-state');

      // If the user is authenticated and online, queue a background sync
      const { data: { user } } = await authService.getCurrentUser();
      if (user && syncService.isDeviceOnline()) {
        // Sync accounts to backend (upsert strategy)
        for (const account of data.accounts) {
          await syncService.storePendingOperation('CREATE_ACCOUNT', { ...account, user_id: user.id });
        }
        // Sync transactions to backend
        for (const transaction of data.transactions) {
          await syncService.storePendingOperation('CREATE_TRANSACTION', { ...transaction, user_id: user.id });
        }
      }
    } catch (error) {
      console.error('[StorageService] Failed to save data:', error);
      // Fallback: at minimum, always save to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  },

  // ── Load state ──────────────────────────────────────────────
  load: async (): Promise<FinanceState | null> => {
    try {
      const { data: { user } } = await authService.getCurrentUser();

      if (user && syncService.isDeviceOnline()) {
        // Load fresh data from backend for authenticated users
        try {
          const [accountsRes, transactionsRes] = await Promise.all([
            apiClient.get<{ accounts: any[] }>('/accounts'),
            apiClient.get<{ transactions: any[] }>('/transactions'),
          ]);

          const cloudData: FinanceState = {
            users:           [],
            accounts:        accountsRes.accounts  || [],
            transactions:    transactionsRes.transactions || [],
            payables:        [],
            receivables:     [],
            budgets:         [],
            goals:           [],
            categories:      [],
            globalSettings:  { language: (user.settings as any)?.language ?? 'en' },
          };

          // Cache locally for offline use
          await offlineStorage.cacheData('financeState', cloudData, 'app-state');
          return cloudData;
        } catch (apiErr) {
          console.warn('[StorageService] Backend unavailable, falling back to local cache:', apiErr);
        }
      }

      // Offline / unauthenticated: load from IndexedDB → localStorage
      let data = await offlineStorage.getCachedData('financeState') as FinanceState | null;

      if (!data) {
        const localRaw = localStorage.getItem(STORAGE_KEY);
        data = localRaw ? JSON.parse(localRaw) : null;
        if (data) {
          await offlineStorage.cacheData('financeState', data, 'app-state');
        }
      }

      return data;
    } catch (error) {
      console.error('[StorageService] Failed to load data:', error);
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    }
  },

  // ── Load single user's data from backend ─────────────────────
  loadUserData: async (userId: string): Promise<FinanceState | null> => {
    if (!syncService.isDeviceOnline()) return null;

    try {
      const [accountsRes, transactionsRes] = await Promise.all([
        apiClient.get<{ accounts: any[] }>('/accounts'),
        apiClient.get<{ transactions: any[] }>('/transactions'),
      ]);

      const userData: FinanceState = {
        users:          [],
        accounts:       accountsRes.accounts       || [],
        transactions:   transactionsRes.transactions || [],
        payables:       [],
        receivables:    [],
        budgets:        [],
        goals:          [],
        categories:     [],
        globalSettings: { language: 'en' },
      };

      await offlineStorage.cacheData('financeState', userData, 'app-state');
      return userData;
    } catch (error) {
      console.error('[StorageService] Failed to load user data:', error);
      return null;
    }
  },

  // ── Pending operations helpers ───────────────────────────────
  savePendingOperation: async (type: string, data: any) => {
    return syncService.storePendingOperation(type, data);
  },

  getSyncStatus: () => syncService.getSyncStatus(),

  forceSync: async () => syncService.syncPendingData(),
};
