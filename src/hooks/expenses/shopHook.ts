import { useCallback, useEffect } from "react";
import { api } from "@/hooks/api_client";
import type { CacheEntry } from "@/store/useDataCacheStore";
import { useDataCacheStore } from "@/store/useDataCacheStore";

type Shop = {
  id: string;
  name: string;
};

export type ShopDirectoryItem = Shop;

export function useShops() {
  const entry = useDataCacheStore(
    (state) => state.resources.shops as CacheEntry<Shop[]> | undefined,
  );
  const fetchResource = useDataCacheStore((state) => state.fetchResource);

  const getShops = useCallback(async (force = false) => {
    try {
      return await fetchResource<Shop[]>(
        "shops",
        async () => {
          const response = await api.get("api/v1/shops");
          return response.shops || [];
        },
        { force, initialData: [] },
      );
    } catch (e) {
      console.log("shops error", e);
      return [];
    }
  }, [fetchResource]);

  useEffect(() => {
    void getShops(false);
  }, [getShops]);

  return {
    shops: entry?.data ?? [],
    loading: entry?.loading ?? false,
    error: entry?.error ?? null,
    refreshShops: () => getShops(true),
  };
}
