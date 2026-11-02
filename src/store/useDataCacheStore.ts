import { create } from "zustand";

export type CacheEntry<T = unknown> = {
  data: T;
  loaded: boolean;
  loading: boolean;
  error: string | null;
};

type FetchOptions<T> = {
  force?: boolean;
  initialData: T;
};

type DataCacheState = {
  resources: Record<string, CacheEntry>;
  fetchResource: <T>(
    key: string,
    loader: () => Promise<T>,
    options: FetchOptions<T>,
  ) => Promise<T>;
  setResource: <T>(key: string, data: T) => void;
  updateResource: <T>(
    key: string,
    updater: (current: T) => T,
    initialData: T,
  ) => void;
  invalidateResource: (key: string) => void;
  resetDataCache: () => void;
};

const inFlightRequests = new Map<string, Promise<unknown>>();
let cacheGeneration = 0;

export const useDataCacheStore = create<DataCacheState>((set, get) => ({
  resources: {},

  fetchResource: async <T>(
    key: string,
    loader: () => Promise<T>,
    { force = false, initialData }: FetchOptions<T>,
  ) => {
    const cached = get().resources[key] as CacheEntry<T> | undefined;

    if (cached?.loaded && !force) {
      return cached.data;
    }

    const pending = inFlightRequests.get(key) as Promise<T> | undefined;
    if (pending) {
      return pending;
    }

    set((state) => ({
      resources: {
        ...state.resources,
        [key]: {
          data: cached?.data ?? initialData,
          loaded: cached?.loaded ?? false,
          loading: true,
          error: null,
        },
      },
    }));

    const requestGeneration = cacheGeneration;

    const request = loader()
      .then((data) => {
        if (requestGeneration !== cacheGeneration) return data;
        set((state) => ({
          resources: {
            ...state.resources,
            [key]: { data, loaded: true, loading: false, error: null },
          },
        }));
        return data;
      })
      .catch((error: unknown) => {
        if (requestGeneration !== cacheGeneration) throw error;
        const message = error instanceof Error ? error.message : String(error);
        set((state) => ({
          resources: {
            ...state.resources,
            [key]: {
              data:
                (state.resources[key] as CacheEntry<T> | undefined)?.data ??
                initialData,
              loaded:
                (state.resources[key] as CacheEntry<T> | undefined)?.loaded ??
                false,
              loading: false,
              error: message,
            },
          },
        }));
        throw error;
      })
      .finally(() => {
        if (inFlightRequests.get(key) === request) {
          inFlightRequests.delete(key);
        }
      });

    inFlightRequests.set(key, request);
    return request;
  },

  setResource: (key, data) => {
    set((state) => ({
      resources: {
        ...state.resources,
        [key]: { data, loaded: true, loading: false, error: null },
      },
    }));
  },

  updateResource: (key, updater, initialData) => {
    set((state) => {
      const current = state.resources[key];
      return {
        resources: {
          ...state.resources,
          [key]: {
            data: updater((current?.data ?? initialData) as typeof initialData),
            loaded: true,
            loading: false,
            error: null,
          },
        },
      };
    });
  },

  invalidateResource: (key) => {
    inFlightRequests.delete(key);
    set((state) => {
      const current = state.resources[key];
      if (!current) return state;

      return {
        resources: {
          ...state.resources,
          [key]: { ...current, loaded: false },
        },
      };
    });
  },

  resetDataCache: () => {
    cacheGeneration += 1;
    inFlightRequests.clear();
    set({ resources: {} });
  },
}));
