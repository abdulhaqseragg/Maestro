// Data Synchronization Service for Maestro PWA
import { offlineStorage } from './offlineStorage';
import { supabase } from './supabaseClient';

export class SyncService {
  private isOnline: boolean = navigator.onLine;
  private syncInProgress: boolean = false;

  constructor() {
    this.init();
  }

  private init() {
    // Listen for online/offline events
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
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      navigator.serviceWorker.ready.then((registration) => {
        // Register background sync
        registration.sync.register('sync-pending-data');
      });
    }

    // Initial sync check
    if (this.isOnline) {
      this.syncPendingData();
    }
  }

  // Check if device is online
  isDeviceOnline(): boolean {
    return this.isOnline;
  }

  // Store operation for later sync
  async storePendingOperation(type: string, data: any): Promise<string> {
    const operation = {
      type,
      data,
      timestamp: Date.now()
    };

    const operationId = await offlineStorage.storePendingOperation(operation);

    // Try to sync immediately if online
    if (this.isOnline && !this.syncInProgress) {
      this.syncPendingData();
    }

    return operationId;
  }

  // Sync all pending data
  async syncPendingData(): Promise<void> {
    if (this.syncInProgress || !this.isOnline) {
      return;
    }

    this.syncInProgress = true;
    console.log('[SyncService] Starting data synchronization...');

    try {
      const pendingOperations = await offlineStorage.getPendingOperations();
      if (!pendingOperations || !Array.isArray(pendingOperations)) {
        console.warn('[SyncService] pendingOperations is null or not an array');
        this.syncInProgress = false;
        return;
      }
      if (pendingOperations.length === 0) {
        console.log('[SyncService] No pending operations to sync');
        this.syncInProgress = false;
        return;
      }

      console.log(`[SyncService] Syncing ${pendingOperations.length} operations...`);

      for (const operation of pendingOperations) {
        try {
          await this.syncOperation(operation);
          await offlineStorage.markOperationSynced(operation.id);
          console.log(`[SyncService] Synced operation: ${operation.id}`);
        } catch (error) {
          console.error(`[SyncService] Failed to sync operation ${operation.id}:`, error);
          // Continue with other operations
        }
      }

      // Cleanup old synced operations
      await offlineStorage.cleanupSyncedOperations();

      console.log('[SyncService] Data synchronization completed');
    } catch (error) {
      console.error('[SyncService] Sync failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  // Sync individual operation
  private async syncOperation(operation: any): Promise<void> {
    const { type, data } = operation;

    switch (type) {
      case 'CREATE_USER':
        await this.syncCreateUser(data);
        break;
      case 'UPDATE_USER':
        await this.syncUpdateUser(data);
        break;
      case 'DELETE_USER':
        await this.syncDeleteUser(data);
        break;
      case 'CREATE_TRANSACTION':
        await this.syncCreateTransaction(data);
        break;
      case 'UPDATE_TRANSACTION':
        await this.syncUpdateTransaction(data);
        break;
      case 'DELETE_TRANSACTION':
        await this.syncDeleteTransaction(data);
        break;
      case 'CREATE_ACCOUNT':
        await this.syncCreateAccount(data);
        break;
      case 'UPDATE_ACCOUNT':
        await this.syncUpdateAccount(data);
        break;
      case 'DELETE_ACCOUNT':
        await this.syncDeleteAccount(data);
        break;
      default:
        console.warn(`[SyncService] Unknown operation type: ${type}`);
    }
  }

  // API sync methods using Supabase
  private async syncCreateUser(data: any): Promise<void> {
    const { error } = await supabase
      .from('users')
      .insert(data);

    if (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }
  }

  private async syncUpdateUser(data: any): Promise<void> {
    const { error } = await supabase
      .from('users')
      .update(data)
      .eq('id', data.id);

    if (error) {
      throw new Error(`Failed to update user: ${error.message}`);
    }
  }

  private async syncDeleteUser(data: any): Promise<void> {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', data.id);

    if (error) {
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  }

  private async syncCreateTransaction(data: any): Promise<void> {
    const { error } = await supabase
      .from('transactions')
      .insert(data);

    if (error) {
      throw new Error(`Failed to create transaction: ${error.message}`);
    }
  }

  private async syncUpdateTransaction(data: any): Promise<void> {
    const response = await fetch(`/api/transactions/${data.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`Failed to update transaction: ${response.statusText}`);
    }
  }

  private async syncDeleteTransaction(data: any): Promise<void> {
    const response = await fetch(`/api/transactions/${data.id}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error(`Failed to delete transaction: ${response.statusText}`);
    }
  }

  private async syncCreateAccount(data: any): Promise<void> {
    const response = await fetch('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`Failed to create account: ${response.statusText}`);
    }
  }

  private async syncUpdateAccount(data: any): Promise<void> {
    const response = await fetch(`/api/accounts/${data.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`Failed to update account: ${response.statusText}`);
    }
  }

  private async syncDeleteAccount(data: any): Promise<void> {
    const response = await fetch(`/api/accounts/${data.id}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error(`Failed to delete account: ${response.statusText}`);
    }
  }

  // Get sync status
  getSyncStatus(): { isOnline: boolean; syncInProgress: boolean; pendingOperations: number } {
    return {
      isOnline: this.isOnline,
      syncInProgress: this.syncInProgress,
      pendingOperations: 0 // This would be populated from offlineStorage
    };
  }
}

// Export singleton instance
export const syncService = new SyncService();