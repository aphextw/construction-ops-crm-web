import { useCallback, useState } from "react";

import { api } from "@/hooks/api_client";
import type { CacheEntry } from "@/store/useDataCacheStore";
import { useDataCacheStore } from "@/store/useDataCacheStore";

export type MeasurementUnit = {
  id: string;
  code: string;
  display_name: string;
  dimension: string;
};

export type MaterialCatalogItem = {
  id: string;
  name: string;
  value: string;
  unit: MeasurementUnit;
  measurements: string;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
};

export function useMaterials() {
  const materialsEntry = useDataCacheStore(
    (state) =>
      state.resources.materials as
        | CacheEntry<MaterialCatalogItem[]>
        | undefined,
  );
  const unitsEntry = useDataCacheStore(
    (state) =>
      state.resources.measurementUnits as
        | CacheEntry<MeasurementUnit[]>
        | undefined,
  );
  const fetchResource = useDataCacheStore((state) => state.fetchResource);
  const updateResource = useDataCacheStore((state) => state.updateResource);
  const [savingMaterial, setSavingMaterial] = useState(false);
  const [deletingMaterial, setDeletingMaterial] = useState(false);
  const [materialActionError, setMaterialActionError] = useState<string | null>(
    null,
  );
  const materials = materialsEntry?.data ?? [];
  const units = unitsEntry?.data ?? [];

  const getMaterials = useCallback(async (force = false) => {
    try {
      return await fetchResource<MaterialCatalogItem[]>(
        "materials",
        async () => {
          const response = await api.get("api/v1/materials");
          return Array.isArray(response?.materials) ? response.materials : [];
        },
        { force, initialData: [] },
      );
    } catch (error: any) {
      return [];
    }
  }, [fetchResource]);

  const getMeasurementUnits = useCallback(async (force = false) => {
    try {
      return await fetchResource<MeasurementUnit[]>(
        "measurementUnits",
        async () => {
          const response = await api.get("api/v1/measurement-units");
          return Array.isArray(response?.units) ? response.units : [];
        },
        { force, initialData: [] },
      );
    } catch (error: any) {
      console.log("MEASUREMENT UNITS ERROR:", error);
      return [];
    }
  }, [fetchResource]);

  const createMaterial = useCallback(
    async (payload: {
      name: string;
      value: string;
      unit_id: string;
      measurements: string;
    }) => {
      try {
        setSavingMaterial(true);
        setMaterialActionError(null);
        const response = await api.post("api/v1/materials", payload);
        const created = response?.material as MaterialCatalogItem | undefined;
        if (created) {
          updateResource<MaterialCatalogItem[]>(
            "materials",
            (current) => [created, ...current],
            [],
          );
        }
        return created ?? null;
      } catch (error: any) {
        console.log("CREATE MATERIAL ERROR:", error);
        setMaterialActionError(
          error?.message || "Не удалось создать материал",
        );
        return null;
      } finally {
        setSavingMaterial(false);
      }
    },
    [updateResource],
  );

  const updateMaterial = useCallback(
    async (
      materialId: string,
      payload: {
        name: string;
        value: string;
        unit_id: string;
        measurements: string;
      },
    ) => {
      try {
        setSavingMaterial(true);
        setMaterialActionError(null);
        const response = await api.patch(
          `api/v1/materials/${materialId}`,
          payload,
        );
        const updated = response?.material as MaterialCatalogItem | undefined;
        if (updated) {
          updateResource<MaterialCatalogItem[]>(
            "materials",
            (current) =>
              current.map((item) =>
                item.id === materialId ? updated : item,
              ),
            [],
          );
        }
        return updated ?? null;
      } catch (error: any) {
        console.log("UPDATE MATERIAL ERROR:", error);
        setMaterialActionError(
          error?.message || "Не удалось обновить материал",
        );
        return null;
      } finally {
        setSavingMaterial(false);
      }
    },
    [updateResource],
  );

  const deleteMaterial = useCallback(async (materialId: string) => {
    try {
      setDeletingMaterial(true);
      setMaterialActionError(null);
      await api.delete(`api/v1/materials/${materialId}`);
      updateResource<MaterialCatalogItem[]>(
        "materials",
        (current) => current.filter((item) => item.id !== materialId),
        [],
      );
      return true;
    } catch (error: any) {
      console.log("DELETE MATERIAL ERROR:", error);
      setMaterialActionError(
        error?.message || "Не удалось удалить материал",
      );
      return false;
    } finally {
      setDeletingMaterial(false);
    }
  }, [updateResource]);

  return {
    materials,
    units,
    loadingMaterials: materialsEntry?.loading ?? false,
    loadingUnits: unitsEntry?.loading ?? false,
    savingMaterial,
    deletingMaterial,
    materialsError: materialsEntry?.error ?? null,
    unitsError: unitsEntry?.error ?? null,
    materialActionError,
    getMaterials,
    getMeasurementUnits,
    createMaterial,
    updateMaterial,
    deleteMaterial,
  };
}
