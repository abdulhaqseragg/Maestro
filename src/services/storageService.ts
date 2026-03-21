/**
 * Storage Service — Hybrid version (Cloud + Offline)
 * Strategy: Offline-First. 
 * Always persists locally to IndexedDB/localStorage immediately.
 * Background syncs to the remote API when online.
 */
import { FinanceState } from '../../types';
import { offlineStorage } from './offlineStorage';
import { syncService } from './syncService';
import { apiClient } from './apiClient';

const STORAGE_KEY = 'maestro_finance_data';

export const storageService = {

  // ── Save state ──────────────────────────────────────────────
  save: async (data: FinanceState) => {
    try {
      console.log('[StorageService] Saving state...', data.users.length, 'users');
      // 1. ALWAYS persist locally first (Instant + Offline-safe)
      const serialized = JSON.stringify(data);
      localStorage.setItem(STORAGE_KEY, serialized);
      await offlineStorage.cacheData('financeState', data, 'app-state');
      
      // 2. Queue for background sync
      await syncService.storePendingOperation('SAVE_STATE', data);
      
      console.log('[StorageService] Data saved locally and queued for sync');
    } catch (error) {
      console.error('[StorageService] Failed to save data:', error);
      // Fallback: ensure at least localStorage is updated
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  },

  // ── Load state ──────────────────────────────────────────────
  load: async (): Promise<FinanceState | null> => {
    try {
      // 1. Try to get fresh data from Cloud if online
      if (syncService.isDeviceOnline()) {
        try {
          const cloudData = await apiClient.get<FinanceState>('/sync/state');
          if (cloudData) {
            // Update local cache with cloud data
            await offlineStorage.cacheData('financeState', cloudData, 'app-state');
            localStorage.setItem(STORAGE_KEY, JSON.stringify(cloudData));
            return cloudData;
          }
        } catch (apiErr) {
          console.warn('[StorageService] Cloud fetch failed, falling back to local:', apiErr);
        }
      }

      // 2. Fallback to Local (IndexedDB then localStorage)
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

  // ── Helpers ──────────────────────────────────────────────────
  loadUserData: async (userId: string): Promise<FinanceState | null> => {
    // For local version, we load the global state
    // For cloud version, we could fetch /users/:id/data
    return storageService.load();
  },

  savePendingOperation: async (type: string, data: any) => {
    return syncService.storePendingOperation(type, data);
  },

  getSyncStatus: () => syncService.getSyncStatus(),

  forceSync: async () => syncService.syncPendingData(),
};
