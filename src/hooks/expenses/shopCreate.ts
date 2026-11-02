import { useState } from "react";

import { api } from "@/hooks/api_client";
import { useDataCacheStore } from "@/store/useDataCacheStore";

type Shop = {
  id: string;
  name: string;
};

export type CreatedShop = Shop;

export function useCreateShop() {
  const updateResource = useDataCacheStore((state) => state.updateResource);
  const [creatingShop, setCreatingShop] = useState(false);
  const [createShopError, setCreateShopError] = useState<string | null>(null);

  const createShop = async (name: string): Promise<Shop | null> => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setCreateShopError("Введите название магазина");
      return null;
    }

    try {
      setCreatingShop(true);
      setCreateShopError(null);

      const response = await api.post("api/v1/shops", {
        name: trimmedName,
      });

      const createdShop = response?.shop ?? null;
      if (
        createdShop &&
        useDataCacheStore.getState().resources.shops?.loaded
      ) {
        updateResource<Shop[]>(
          "shops",
          (shops) => [...shops, createdShop],
          [],
        );
      }
      return createdShop;
    } catch (error: any) {
      const message = error?.message || "Не удалось создать магазин";
      setCreateShopError(message);
      return null;
    } finally {
      setCreatingShop(false);
    }
  };

  return {
    createShop,
    creatingShop,
    createShopError,
  };
}
