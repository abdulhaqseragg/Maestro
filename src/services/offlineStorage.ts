// Offline Storage Manager for Maestro PWA
class OfflineStorage {
  constructor() {
    this.dbName = 'MaestroDB';
    this.version = 1;
    this.db = null;
    this.init();
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('[OfflineStorage] Database error:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[OfflineStorage] Database opened successfully');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        this.createObjectStores(db);
      };
    });
  }

  createObjectStores(db) {
    // Store for pending operations when offline
    if (!db.objectStoreNames.contains('pendingOperations')) {
      const pendingStore = db.createObjectStore('pendingOperations', { keyPath: 'id' });
      pendingStore.createIndex('type', 'type', { unique: false });
      pendingStore.createIndex('timestamp', 'timestamp', { unique: false });
    }

    // Store for cached data
    if (!db.objectStoreNames.contains('cachedData')) {
      const cacheStore = db.createObjectStore('cachedData', { keyPath: 'key' });
      cacheStore.createIndex('type', 'type', { unique: false });
      cacheStore.createIndex('lastModified', 'lastModified', { unique: false });
    }

    // Store for user preferences
    if (!db.objectStoreNames.contains('userPreferences')) {
      db.createObjectStore('userPreferences', { keyPath: 'userId' });
    }
  }

  // Store data operation for offline sync
  async storePendingOperation(operation) {
    const data = {
      id: crypto.randomUUID(),
      type: operation.type,
      data: operation.data,
      timestamp: Date.now(),
      synced: false
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['pendingOperations'], 'readwrite');
      const store = transaction.objectStore('pendingOperations');
      const request = store.add(data);

      request.onsuccess = () => {
        console.log('[OfflineStorage] Operation stored:', data.id);
        resolve(data.id);
      };

      request.onerror = () => {
        console.error('[OfflineStorage] Failed to store operation:', request.error);
        reject(request.error);
      };
    });
  }

  // Get all pending operations
  async getPendingOperations() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['pendingOperations'], 'readonly');
      const store = transaction.objectStore('pendingOperations');
      const request = store.getAll();

      request.onsuccess = () => {
        if (!request.result) {
          console.warn('[OfflineStorage] getPendingOperations: result is null');
          resolve([]);
        } else {
          resolve(request.result);
        }
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // Mark operation as synced
  async markOperationSynced(operationId) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['pendingOperations'], 'readwrite');
      const store = transaction.objectStore('pendingOperations');
      const request = store.get(operationId);

      request.onsuccess = () => {
        const operation = request.result;
        if (operation) {
          operation.synced = true;
          const updateRequest = store.put(operation);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          resolve();
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Remove synced operations
  async cleanupSyncedOperations() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['pendingOperations'], 'readwrite');
      const store = transaction.objectStore('pendingOperations');
      const index = store.index('timestamp');

      // Remove operations older than 30 days that are synced
      const range = IDBKeyRange.upperBound(Date.now() - (30 * 24 * 60 * 60 * 1000));
      const request = index.openCursor(range);

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          const operation = cursor.value;
          if (operation.synced) {
            cursor.delete();
          }
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Cache data locally
  async cacheData(key, data, type = 'general') {
    const cacheEntry = {
      key,
      data: JSON.parse(JSON.stringify(data)), // Deep clone to avoid DataCloneError
      type,
      lastModified: Date.now(),
      version: 1
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['cachedData'], 'readwrite');
      const store = transaction.objectStore('cachedData');
      const request = store.put(cacheEntry);

      request.onsuccess = () => {
        console.log('[OfflineStorage] Data cached:', key);
        resolve();
      };

      request.onerror = () => {
        console.error('[OfflineStorage] Failed to cache data:', request.error);
        reject(request.error);
      };
    });
  }

  // Get cached data
  async getCachedData(key) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['cachedData'], 'readonly');
      const store = transaction.objectStore('cachedData');
      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result ? request.result.data : null);
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Store user preferences
  async storeUserPreferences(userId, preferences) {
    const data = {
      userId,
      preferences,
      lastModified: Date.now()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['userPreferences'], 'readwrite');
      const store = transaction.objectStore('userPreferences');
      const request = store.put(data);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Get user preferences
  async getUserPreferences(userId) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['userPreferences'], 'readonly');
      const store = transaction.objectStore('userPreferences');
      const request = store.get(userId);

      request.onsuccess = () => {
        resolve(request.result ? request.result.preferences : null);
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Clear all data (for reset functionality)
  async clearAllData() {
    const stores = ['pendingOperations', 'cachedData', 'userPreferences'];

    for (const storeName of stores) {
      await new Promise((resolve, reject) => {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }

    console.log('[OfflineStorage] All data cleared');
  }
}

// Export singleton instance
export const offlineStorage = new OfflineStorage();