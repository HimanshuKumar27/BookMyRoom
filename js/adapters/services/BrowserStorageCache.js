// ============================================================
// Adapter — Browser Storage Cache Service (LocalStorage / SessionStorage)
// ============================================================

import { ICacheService } from '../../core/interfaces/ICacheService.js';

export class BrowserStorageCache extends ICacheService {
  constructor(storageType = 'local') {
    super();
    this.storage = storageType === 'session' ? window.sessionStorage : window.localStorage;
  }

  getItem(key) {
    try {
      const value = this.storage.getItem(key);
      if (!value) return null;
      // Check if it's serialized JSON
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (e) {
      console.error(`Error reading key "${key}" from storage:`, e);
      return null;
    }
  }

  setItem(key, value) {
    try {
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      this.storage.setItem(key, stringValue);
    } catch (e) {
      console.error(`Error writing key "${key}" to storage:`, e);
    }
  }

  removeItem(key) {
    try {
      this.storage.removeItem(key);
    } catch (e) {
      console.error(`Error removing key "${key}" from storage:`, e);
    }
  }
}
