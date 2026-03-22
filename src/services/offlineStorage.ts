export class OfflineStorage {
  dbName: string;
  version: number;
  db: IDBDatabase | null;
  initPromise: Promise<void> | null;

  constructor() {
    this.dbName = 'MaestroDB';
    this.version = 1;
    this.db = null;
    this.initPromise = null;
  }

  /**
   * Safe initialization getter. We do this lazily or wait for it.
   */
  async getDb(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    if (!this.initPromise) {
      this.initPromise = new Promise((resolve, reject) => {
        try {
          if (typeof window === 'undefined' || !window.indexedDB) {
            reject(new Error('IndexedDB is not supported in this environment'));
            return;
          }

          const request = indexedDB.open(this.dbName, this.version);

          request.onerror = () => {
            console.error('[OfflineStorage] Database error:', request.error);
            reject(request.error || new Error('Failed to open database'));
          };

          request.onsuccess = () => {
            this.db = request.result;
            resolve();
          };

          request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (db) this.createObjectStores(db);
          };
        } catch (err) {
          reject(err);
        }
      });
    }

    try {
      await this.initPromise;
    } catch (e) {
      // Intentionally swallow to let db be returned as null if we want to fail gracefully
    }
    
    if (!this.db) {
      // Just returning a dummy object or throwing?
      // Since some callers don't catch, let's gracefully return null here? No, caller expects promise of IDBDatabase.
      // Let's actually throw here, BUT inside methods we catch or expect null if we use .catch(() => null)
      throw new Error('Database initialized but db object is null');
    }
    return this.db;
  }

  createObjectStores(db: IDBDatabase) {
    if (!db) return;
    if (!db.objectStoreNames.contains('pendingOperations')) {
      const pendingStore = db.createObjectStore('pendingOperations', { keyPath: 'id' });
      pendingStore.createIndex('type', 'type', { unique: false });
      pendingStore.createIndex('timestamp', 'timestamp', { unique: false });
    }

    if (!db.objectStoreNames.contains('cachedData')) {
      const cacheStore = db.createObjectStore('cachedData', { keyPath: 'key' });
      cacheStore.createIndex('type', 'type', { unique: false });
      cacheStore.createIndex('lastModified', 'lastModified', { unique: false });
    }

    if (!db.objectStoreNames.contains('userPreferences')) {
      db.createObjectStore('userPreferences', { keyPath: 'userId' });
    }
  }

  async storePendingOperation(operation: any): Promise<string> {
    const db = await this.getDb().catch(() => null);
    
    const data = {
      id: crypto.randomUUID(),
      type: operation.type,
      data: operation.data,
      timestamp: Date.now(),
      synced: false
    };

    if (!db) return data.id;

    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction(['pendingOperations'], 'readwrite');
        const store = transaction.objectStore('pendingOperations');
        const request = store.add(data);

        request.onsuccess = () => resolve(data.id);
        request.onerror = () => reject(request.error);
      } catch (e) {
        reject(e);
      }
    });
  }

  async getPendingOperations(): Promise<any[]> {
    try {
      const db = await this.getDb().catch(() => null);
      if (!db) return [];
      
      return new Promise((resolve, reject) => {
        try {
          const transaction = db.transaction(['pendingOperations'], 'readonly');
          const store = transaction.objectStore('pendingOperations');
          const request = store.getAll();

          request.onsuccess = () => resolve(request.result || []);
          request.onerror = () => reject(request.error);
        } catch (e) {
          reject(e);
        }
      });
    } catch (e) {
      console.warn('[OfflineStorage] getPendingOperations missing fallback:', e);
      return [];
    }
  }

  async markOperationSynced(operationId: string): Promise<void> {
    const db = await this.getDb().catch(() => null);
    if (!db) return;
    
    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction(['pendingOperations'], 'readwrite');
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
      } catch (err) {
        reject(err);
      }
    });
  }

  async cleanupSyncedOperations(): Promise<void> {
    try {
      const db = await this.getDb().catch(() => null);
      if (!db) return;
      
      return new Promise((resolve, reject) => {
        try {
          const transaction = db.transaction(['pendingOperations'], 'readwrite');
          const store = transaction.objectStore('pendingOperations');
          const index = store.index('timestamp');

          const range = IDBKeyRange.upperBound(Date.now() - (30 * 24 * 60 * 60 * 1000));
          const request = index.openCursor(range);

          request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest).result;
            if (cursor) {
              if (cursor.value.synced) cursor.delete();
              cursor.continue();
            } else {
              resolve();
            }
          };

          request.onerror = () => reject(request.error);
        } catch (e) {
          reject(e);
        }
      });
    } catch {
      // ignore
    }
  }

  async cacheData(key: string, data: any, type = 'general'): Promise<void> {
    try {
      const db = await this.getDb().catch(() => null);
      if (!db) return;
      
      const cacheEntry = {
        key,
        data: JSON.parse(JSON.stringify(data)),
        type,
        lastModified: Date.now(),
        version: 1
      };

      return new Promise((resolve, reject) => {
        try {
          const transaction = db.transaction(['cachedData'], 'readwrite');
          const store = transaction.objectStore('cachedData');
          const request = store.put(cacheEntry);

          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        } catch (e) {
          reject(e);
        }
      });
    } catch (e) {
      console.warn('[OfflineStorage] Cache skipped:', e);
    }
  }

  async getCachedData(key: string): Promise<any> {
    try {
      const db = await this.getDb().catch(() => null);
      if (!db) return null;
      
      return new Promise((resolve, reject) => {
        try {
          const transaction = db.transaction(['cachedData'], 'readonly');
          const store = transaction.objectStore('cachedData');
          const request = store.get(key);

          request.onsuccess = () => resolve(request.result ? request.result.data : null);
          request.onerror = () => reject(request.error);
        } catch (e) {
          reject(e);
        }
      });
    } catch (e) {
      console.warn('[OfflineStorage] Get cache skipped:', e);
      return null;
    }
  }

  async storeUserPreferences(userId: string, preferences: any): Promise<void> {
    const db = await this.getDb().catch(() => null);
    if (!db) return;
    
    const data = { userId, preferences, lastModified: Date.now() };

    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction(['userPreferences'], 'readwrite');
        const store = transaction.objectStore('userPreferences');
        const request = store.put(data);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  async getUserPreferences(userId: string): Promise<any> {
    try {
      const db = await this.getDb().catch(() => null);
      if (!db) return null;
      
      return new Promise((resolve, reject) => {
        try {
          const transaction = db.transaction(['userPreferences'], 'readonly');
          const store = transaction.objectStore('userPreferences');
          const request = store.get(userId);

          request.onsuccess = () => resolve(request.result ? request.result.preferences : null);
          request.onerror = () => reject(request.error);
        } catch(err) {
          reject(err);
        }
      });
    } catch {
      return null;
    }
  }

  async clearAllData(): Promise<void> {
    const db = await this.getDb().catch(() => null);
    if (!db) return;
    
    const stores = ['pendingOperations', 'cachedData', 'userPreferences'];

    for (const storeName of stores) {
      await new Promise<void>((resolve, reject) => {
        try {
          const transaction = db.transaction([storeName], 'readwrite');
          const store = transaction.objectStore(storeName);
          const request = store.clear();

          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        } catch(err) {
          reject(err);
        }
      });
    }
  }
}

export const offlineStorage = new OfflineStorage();