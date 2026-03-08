
import { FinanceState } from '../types';
import { offlineStorage } from '../src/services/offlineStorage';
import { syncService } from '../src/services/syncService';

const STORAGE_KEY = 'finance_flow_data';

export const storageService = {
  save: async (data: FinanceState) => {
    try {
      // Save to localStorage as backup
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

      // Save to IndexedDB for better performance and offline support
      await offlineStorage.cacheData('financeState', data, 'app-state');

      // If online, sync with server
      if (syncService.isDeviceOnline()) {
        await syncService.storePendingOperation('SYNC_STATE', data);
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
      // Try to load from IndexedDB first (faster)
      let data = await offlineStorage.getCachedData('financeState');

      if (!data) {
        // Fallback to localStorage
        const localData = localStorage.getItem(STORAGE_KEY);
        data = localData ? JSON.parse(localData) : null;

        // Cache in IndexedDB for future use
        if (data) {
          await offlineStorage.cacheData('financeState', data, 'app-state');
        }
      }

      return data;
    } catch (error) {
      console.error('[StorageService] Failed to load data:', error);
      // Fallback to localStorage
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    }
  },

  clear: async () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      await offlineStorage.clearAllData();
      console.log('[StorageService] All data cleared');
    } catch (error) {
      console.error('[StorageService] Failed to clear data:', error);
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
