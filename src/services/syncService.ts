/**
 * Sync Service — Hybrid version (Cloud + Offline)
 * Handles background synchronization between local IndexedDB and remote API.
 */
import { offlineStorage } from './offlineStorage';
import { apiClient } from './apiClient';

export class SyncService {
  private isOnline: boolean = navigator.onLine;
  private isSyncing: boolean = false;

  constructor() {
    this.init();
  }

  private init() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncPendingData(); // Trigger sync when coming back online
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  isDeviceOnline(): boolean {
    return this.isOnline;
  }

  async storePendingOperation(type: string, data: any): Promise<string> {
    const operation = { type, data, timestamp: Date.now() };
    const id = await offlineStorage.storePendingOperation(operation);
    
    // If online, try to sync immediately
    if (this.isOnline) {
      this.syncPendingData();
    }
    
    return id;
  }

  async syncPendingData(): Promise<void> {
    if (this.isSyncing || !this.isOnline) return;

    const pending = await offlineStorage.getPendingOperations();
    const unsynced = pending.filter(op => !op.synced);

    if (unsynced.length === 0) return;

    this.isSyncing = true;
    console.log(`[SyncService] Starting sync for ${unsynced.length} operations...`);

    try {
      for (const op of unsynced) {
        try {
          // Map operation types to API calls
          // Example: CREATE_TRANSACTION -> POST /transactions
          const endpoint = this.getEndpointForType(op.type);
          if (endpoint) {
            await apiClient.post(endpoint, op.data);
            await offlineStorage.markOperationSynced(op.id);
          }
        } catch (err) {
          console.error(`[SyncService] Failed to sync operation ${op.id}:`, err);
          // Stop syncing if we hit a serious network error
          break;
        }
      }
      
      await offlineStorage.cleanupSyncedOperations();
    } finally {
      this.isSyncing = false;
      console.log(`[SyncService] Sync finished.`);
    }
  }

  private getEndpointForType(type: string): string | null {
    switch (type) {
      case 'SAVE_STATE': return '/sync/state';
      case 'CREATE_ACCOUNT': return '/accounts';
      case 'CREATE_TRANSACTION': return '/transactions';
      case 'UPDATE_SETTINGS': return '/settings';
      default: return null;
    }
  }

  async getSyncStatus() {
    const pending = await offlineStorage.getPendingOperations();
    const unsyncedCount = pending.filter(op => !op.synced).length;
    return { 
      pending: unsyncedCount, 
      lastSync: new Date().toISOString(),
      isSyncing: this.isSyncing
    };
  }
}

export const syncService = new SyncService();
