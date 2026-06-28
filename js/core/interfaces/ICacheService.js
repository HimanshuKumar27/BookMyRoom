// ============================================================
// Core Interface (Port) — Cache / Local Storage Service
// ============================================================

export class ICacheService {
  getItem(key) {
    throw new Error('Method getItem() must be implemented.');
  }

  setItem(key, value) {
    throw new Error('Method setItem() must be implemented.');
  }

  removeItem(key) {
    throw new Error('Method removeItem() must be implemented.');
  }
}
