import { useCallback, useState } from "react";

import { api } from "@/hooks/api_client";
import type { MeasurementUnit } from "@/hooks/materials/useMaterials";
import type { CacheEntry } from "@/store/useDataCacheStore";
import { useDataCacheStore } from "@/store/useDataCacheStore";

export type MaterialSetItem = {
  id: string;
  set_id: string;
  material_id: string;
  name: string;
  value: string;
  unit: MeasurementUnit;
  measurements: string;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
};

export type MaterialSet = {
  id: string;
  name: string;
  set_items: MaterialSetItem[];
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
};

export function useMaterialSets() {
  const setsEntry = useDataCacheStore(
    (state) =>
      state.resources.materialSets as CacheEntry<MaterialSet[]> | undefined,
  );
  const fetchResource = useDataCacheStore((state) => state.fetchResource);
  const updateResource = useDataCacheStore((state) => state.updateResource);
  const [savingSet, setSavingSet] = useState(false);
  const [deletingSet, setDeletingSet] = useState(false);
  const [setActionError, setSetActionError] = useState<string | null>(null);
  const sets = setsEntry?.data ?? [];

  const getMaterialSets = useCallback(async (force = false) => {
    try {
      return await fetchResource<MaterialSet[]>(
        "materialSets",
        async () => {
          const response = await api.get("api/v1/material-sets");
          return Array.isArray(response?.material_sets)
            ? response.material_sets
            : [];
        },
        { force, initialData: [] },
      );
    } catch (error: any) {
      return [];
    }
  }, [fetchResource]);

  const getMaterialSet = useCallback(async (setId: string) => {
    const response = await api.get(`api/v1/material-sets/${setId}`);
    return (response?.material_set as MaterialSet | undefined) ?? null;
  }, []);

  const createMaterialSet = useCallback(async (name: string) => {
    const response = await api.post("api/v1/material-sets", { name });
    return (response?.material_set as MaterialSet | undefined) ?? null;
  }, []);

  const updateMaterialSet = useCallback(async (setId: string, name: string) => {
    const response = await api.patch(`api/v1/material-sets/${setId}`, { name });
    return (response?.material_set as MaterialSet | undefined) ?? null;
  }, []);

  const addMaterialSetItem = useCallback(
    async (
      setId: string,
      payload: { material_id: string; measurements: string; sort_order?: number },
    ) => {
      const response = await api.post(`api/v1/material-sets/${setId}/items`, payload);
      return {
        set: (response?.material_set as MaterialSet | undefined) ?? null,
        item: (response?.item as MaterialSetItem | undefined) ?? null,
      };
    },
    [],
  );

  const updateMaterialSetItem = useCallback(
    async (
      setId: string,
      itemId: string,
      payload: { material_id: string; measurements: string; sort_order: number },
    ) => {
      const response = await api.patch(
        `api/v1/material-sets/${setId}/items/${itemId}`,
        payload,
      );
      return {
        set: (response?.material_set as MaterialSet | undefined) ?? null,
        item: (response?.item as MaterialSetItem | undefined) ?? null,
      };
    },
    [],
  );

  const deleteMaterialSetItem = useCallback(async (setId: string, itemId: string) => {
    const response = await api.delete(`api/v1/material-sets/${setId}/items/${itemId}`);
    return {
      set: (response?.material_set as MaterialSet | undefined) ?? null,
      item: (response?.deleted_item as MaterialSetItem | undefined) ?? null,
    };
  }, []);

  const createSetWithItems = useCallback(
    async (
      name: string,
      items: Array<{ material_id: string; measurements: string; sort_order: number }>,
    ) => {
      try {
        setSavingSet(true);
        setSetActionError(null);

        const createdSet = await createMaterialSet(name.trim());
        if (!createdSet) {
          throw new Error("Не удалось создать комплект");
        }

        const createdItems = await Promise.all(
          items.map(async (item) => {
            const result = await addMaterialSetItem(createdSet.id, item);
            if (!result.item) {
              throw new Error("Не удалось добавить материал в комплект");
            }
            return result.item;
          }),
        );

        const freshSet = {
          ...createdSet,
          set_items: createdItems.sort(
            (left, right) => left.sort_order - right.sort_order,
          ),
        };
        if (freshSet) {
          updateResource<MaterialSet[]>(
            "materialSets",
            (current) => [
              freshSet,
              ...current.filter((entry) => entry.id !== freshSet.id),
            ],
            [],
          );
        }
        return freshSet;
      } catch (error: any) {
        setSetActionError(error?.message || "Не удалось создать комплект");
        return null;
      } finally {
        setSavingSet(false);
      }
    },
    [addMaterialSetItem, createMaterialSet, updateResource],
  );

  const updateSetWithItems = useCallback(
    async (
      existingSet: MaterialSet,
      name: string,
      items: Array<{ material_id: string; measurements: string; sort_order: number }>,
    ) => {
      try {
        setSavingSet(true);
        setSetActionError(null);

        const nextByMaterialId = new Map(items.map((item) => [item.material_id, item]));
        const currentByMaterialId = new Map(
          existingSet.set_items.map((item) => [item.material_id, item]),
        );

        const itemChanges = [
          ...existingSet.set_items
            .filter((item) => !nextByMaterialId.has(item.material_id))
            .map((item) =>
              deleteMaterialSetItem(existingSet.id, item.id),
            ),
          ...items.flatMap((item) => {
            const currentItem = currentByMaterialId.get(item.material_id);
            if (!currentItem) {
              return [addMaterialSetItem(existingSet.id, item)];
            }

            if (
              currentItem.measurements !== item.measurements ||
              currentItem.sort_order !== item.sort_order
            ) {
              return [
                updateMaterialSetItem(existingSet.id, currentItem.id, item),
              ];
            }

            return [];
          }),
        ];

        await Promise.all([
          updateMaterialSet(existingSet.id, name.trim()),
          ...itemChanges,
        ]);

        const freshSet = await getMaterialSet(existingSet.id);
        if (freshSet) {
          updateResource<MaterialSet[]>(
            "materialSets",
            (current) =>
              current.map((entry) =>
                entry.id === freshSet.id ? freshSet : entry,
              ),
            [],
          );
        }
        return freshSet;
      } catch (error: any) {
        setSetActionError(error?.message || "Не удалось обновить комплект");
        return null;
      } finally {
        setSavingSet(false);
      }
    },
    [addMaterialSetItem, deleteMaterialSetItem, getMaterialSet, updateMaterialSet, updateMaterialSetItem, updateResource],
  );

  const removeMaterialSet = useCallback(async (setId: string) => {
    try {
      setDeletingSet(true);
      setSetActionError(null);
      await api.delete(`api/v1/material-sets/${setId}`);
      updateResource<MaterialSet[]>(
        "materialSets",
        (current) => current.filter((entry) => entry.id !== setId),
        [],
      );
      return true;
    } catch (error: any) {
      setSetActionError(error?.message || "Не удалось удалить комплект");
      return false;
    } finally {
      setDeletingSet(false);
    }
  }, [updateResource]);

  return {
    sets,
    loadingSets: setsEntry?.loading ?? false,
    savingSet,
    deletingSet,
    setsError: setsEntry?.error ?? null,
    setActionError,
    getMaterialSets,
    getMaterialSet,
    createSetWithItems,
    updateSetWithItems,
    removeMaterialSet,
  };
}
