const STORAGE_CHANGE_EVENT = "codex-storage-change";

function emitStorageChange(key: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(STORAGE_CHANGE_EVENT, {
      detail: { key },
    }),
  );
}

export const storage = {
  get(key: string) {
    return localStorage.getItem(key);
  },
  set(key: string, value: string) {
    localStorage.setItem(key, value);
    emitStorageChange(key);
  },
  remove(key: string) {
    localStorage.removeItem(key);
    emitStorageChange(key);
  },
  getJSON<T>(key: string, fallback: T): T {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;

    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },
  setJSON(key: string, value: unknown) {
    localStorage.setItem(key, JSON.stringify(value));
    emitStorageChange(key);
  },
};

export const STORAGE_CHANGE_EVENT_NAME = STORAGE_CHANGE_EVENT;
