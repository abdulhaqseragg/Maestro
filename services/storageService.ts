
import { FinanceState } from '../types';
import { offlineStorage } from '../src/services/offlineStorage';
import { syncService } from '../src/services/syncService';
import { supabase } from '../src/services/supabaseClient';
import { authService } from '../src/services/authService';

const STORAGE_KEY = 'finance_flow_data';

export const storageService = {
  save: async (data: FinanceState) => {
    try {
      // Always save to local storage as backup
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      await offlineStorage.cacheData('financeState', data, 'app-state');

      // Check if user is authenticated
      const { data: { user } } = await authService.getCurrentUser();

      if (user && syncService.isDeviceOnline()) {
        // Sync accounts and transactions to Supabase
        console.log('[StorageService] Syncing data to Supabase for user:', user.id);

        // Sync accounts
        for (const account of data.accounts) {
          await syncService.storePendingOperation('CREATE_ACCOUNT', { ...account, user_id: user.id });
        }

        // Sync transactions
        for (const transaction of data.transactions) {
          await syncService.storePendingOperation('CREATE_TRANSACTION', { ...transaction, user_id: user.id });
        }
      }

      console.log('[StorageService] Data saved successfully');
    } catch (error) {
      console.error('[StorageService] Failed to save data:', error);
      // Fallback to localStorage only
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  },

  load: async (): Promise<FinanceState | null> => {
    try {
      // Check if user is authenticated
      const { data: { user } } = await authService.getCurrentUser();

      if (user) {
        // Load from Supabase for authenticated users
        console.log('[StorageService] Loading data from Supabase for user:', user.id);

        const [accountsRes, transactionsRes] = await Promise.all([
          supabase.from('accounts').select('*').eq('user_id', user.id),
          supabase.from('transactions').select('*').eq('user_id', user.id)
        ]);

        if (accountsRes.error || transactionsRes.error) {
          console.error('[StorageService] Failed to load from Supabase:', accountsRes.error || transactionsRes.error);
          // Fallback to local storage
        } else {
          const cloudData: FinanceState = {
            users: [], // Will be loaded separately
            accounts: accountsRes.data || [],
            transactions: transactionsRes.data || [],
            payables: [],
            receivables: [],
            budgets: [],
            goals: [],
            categories: [],
            globalSettings: {},
            notifications: []
          };

          // Cache in IndexedDB for offline use
          await offlineStorage.cacheData('financeState', cloudData, 'app-state');
          return cloudData;
        }
      }

      // For non-authenticated users or fallback, load from IndexedDB/localStorage
      let data = await offlineStorage.getCachedData('financeState');

      if (!data) {
        const localData = localStorage.getItem(STORAGE_KEY);
        data = localData ? JSON.parse(localData) : null;

        if (data) {
          await offlineStorage.cacheData('financeState', data, 'app-state');
        }
      }

      return data;
    } catch (error) {
      console.error('[StorageService] Failed to load data:', error);
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    }
  },

  loadUserData: async (userId: string): Promise<FinanceState | null> => {
    try {
      console.log('[StorageService] Loading user data from Supabase for user:', userId);

      const [userRes, accountsRes, transactionsRes] = await Promise.all([
        supabase.from('users').select('*').eq('id', userId).single(),
        supabase.from('accounts').select('*').eq('user_id', userId),
        supabase.from('transactions').select('*').eq('user_id', userId)
      ]);

      if (userRes.error || accountsRes.error || transactionsRes.error) {
        console.error('[StorageService] Failed to load user data:', userRes.error || accountsRes.error || transactionsRes.error);
        return null;
      }

      const userData: FinanceState = {
        users: [userRes.data],
        accounts: accountsRes.data || [],
        transactions: transactionsRes.data || [],
        payables: [],
        receivables: [],
        budgets: [],
        goals: [],
        categories: [],
        globalSettings: {},
        notifications: []
      };

      // Cache locally for offline use
      await offlineStorage.cacheData('financeState', userData, 'app-state');

      return userData;
    } catch (error) {
      console.error('[StorageService] Failed to load user data:', error);
      return null;
    }
  },

  // Enhanced methods for offline support
  savePendingOperation: async (type: string, data: any) => {
    return await syncService.storePendingOperation(type, data);
  },

  getSyncStatus: () => {
    return syncService.getSyncStatus();
  },

  forceSync: async () => {
    await syncService.syncPendingData();
  }
};
