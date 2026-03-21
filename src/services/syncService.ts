/**
 * Sync Service — Self-hosted Backend version
 * Uses apiClient instead of Supabase for all operations.
 */
import { offlineStorage } from './offlineStorage';
import { apiClient } from './apiClient';

export class SyncService {
  private isOnline: boolean = navigator.onLine;
  private syncInProgress: boolean = false;

  constructor() {
    this.init();
  }

  private init() {
    window.addEventListener('online', () => {
      console.log('[SyncService] Connection restored');
      this.isOnline = true;
      this.syncPendingData();
    });

    window.addEventListener('offline', () => {
      console.log('[SyncService] Connection lost');
      this.isOnline = false;
    });

    // Register background sync if supported
    if ('serviceWorker' in navigator && 'sync' in (window as any).ServiceWorkerRegistration?.prototype) {
      navigator.serviceWorker.ready.then((registration: any) => {
        registration.sync?.register('sync-pending-data');
      }).catch(() => {});
    }

    // Initial sync check
    if (this.isOnline) {
      this.syncPendingData();
    }
  }

  isDeviceOnline(): boolean {
    return this.isOnline;
  }

  async storePendingOperation(type: string, data: any): Promise<string> {
    const operation = { type, data, timestamp: Date.now() };
    const operationId = await offlineStorage.storePendingOperation(operation);

    if (this.isOnline && !this.syncInProgress) {
      this.syncPendingData();
    }

    return operationId as string;
  }

  async syncPendingData(): Promise<void> {
    if (this.syncInProgress || !this.isOnline) return;

    this.syncInProgress = true;
    console.log('[SyncService] Starting data synchronization...');

    try {
      const pendingOperations = await offlineStorage.getPendingOperations();
      if (!pendingOperations || !Array.isArray(pendingOperations) || pendingOperations.length === 0) {
        console.log('[SyncService] No pending operations to sync');
        return;
      }

      console.log(`[SyncService] Syncing ${(pendingOperations as any[]).length} operations...`);

      for (const operation of pendingOperations as any[]) {
        try {
          await this.syncOperation(operation);
          await offlineStorage.markOperationSynced(operation.id);
        } catch (error) {
          console.error(`[SyncService] Failed to sync operation ${operation.id}:`, error);
        }
      }

      await offlineStorage.cleanupSyncedOperations();
      console.log('[SyncService] Data synchronization completed');
    } catch (error) {
      console.error('[SyncService] Sync failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  private async syncOperation(operation: any): Promise<void> {
    const { type, data } = operation;

    switch (type) {
      case 'CREATE_ACCOUNT':
      case 'UPDATE_ACCOUNT':
        await apiClient.post('/accounts', data);
        break;
      case 'DELETE_ACCOUNT':
        await apiClient.delete(`/accounts/${data.id}`);
        break;
      case 'CREATE_TRANSACTION':
      case 'UPDATE_TRANSACTION':
        await apiClient.post('/transactions', data);
        break;
      case 'DELETE_TRANSACTION':
        await apiClient.delete(`/transactions/${data.id}`);
        break;
      case 'CREATE_USER':
        await apiClient.post('/users', data);
        break;
      case 'UPDATE_USER':
        await apiClient.put(`/users/${data.id}`, data);
        break;
      case 'DELETE_USER':
        await apiClient.delete(`/users/${data.id}`);
        break;
      default:
        console.warn(`[SyncService] Unknown operation type: ${type}`);
    }
  }

  getSyncStatus(): { isOnline: boolean; syncInProgress: boolean; pendingOperations: number } {
    return {
      isOnline: this.isOnline,
      syncInProgress: this.syncInProgress,
      pendingOperations: 0,
    };
  }
}

export const syncService = new SyncService();