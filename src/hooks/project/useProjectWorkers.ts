import { useCallback, useState } from "react";

import { api } from "@/hooks/api_client";
import { useDataCacheStore } from "@/store/useDataCacheStore";

export type WorkerCatalogItem = {
  id: string;
  full_name: string;
  phone?: string | null;
  position?: string | null;
  created_at?: string;
};

export type ProjectWorkerItem = {
  id: string;
  worker_id: string;
  full_name: string;
  phone?: string | null;
  position?: string | null;
  created_at: string;
};

type AddProjectWorkerPayload = {
  worker_id?: string;
  full_name?: string;
  phone?: string;
  position?: string;
};

export function useProjectWorkers() {
  const [loadingProjectWorkers, setLoadingProjectWorkers] = useState(false);
  const [savingProjectWorker, setSavingProjectWorker] = useState(false);
  const [savingWorkerCatalog, setSavingWorkerCatalog] = useState(false);
  const [loadingWorkersCatalog, setLoadingWorkersCatalog] = useState(false);
  const [projectWorkersError, setProjectWorkersError] = useState<string | null>(
    null,
  );

  const listProjectWorkers = useCallback(async (projectId: string, force = false) => {
    try {
      setLoadingProjectWorkers(true);
      setProjectWorkersError(null);

      return await useDataCacheStore.getState().fetchResource<ProjectWorkerItem[]>(
        `projectWorkers:${projectId}`,
        async () => {
          const response = await api.get(`api/v1/projects/${projectId}/workers`);
          return response?.workers ?? [];
        },
        { force, initialData: [] },
      );
    } catch (error: any) {
      setProjectWorkersError(
        error?.message || "Не удалось загрузить работников проекта",
      );
      return [];
    } finally {
      setLoadingProjectWorkers(false);
    }
  }, []);

  const searchWorkersCatalog = useCallback(async (query?: string, force = false) => {
    try {
      setLoadingWorkersCatalog(true);
      setProjectWorkersError(null);

      const suffix = query?.trim()
        ? `?query=${encodeURIComponent(query.trim())}`
        : "";
      const normalizedQuery = query?.trim() ?? "";
      return await useDataCacheStore.getState().fetchResource<WorkerCatalogItem[]>(
        `workersCatalog:${normalizedQuery}`,
        async () => {
          const response = await api.get(`api/v1/workers${suffix}`);
          return response?.workers ?? [];
        },
        { force: force || Boolean(normalizedQuery), initialData: [] },
      );
    } catch (error: any) {
      setProjectWorkersError(
        error?.message || "Не удалось загрузить список работников",
      );
      return [];
    } finally {
      setLoadingWorkersCatalog(false);
    }
  }, []);

  const addProjectWorker = useCallback(
    async (projectId: string, payload: AddProjectWorkerPayload) => {
      try {
        setSavingProjectWorker(true);
        setProjectWorkersError(null);

        const response = await api.post(
          `api/v1/projects/${projectId}/workers`,
          payload,
        );
        const worker = response?.worker ?? null;
        if (worker) {
          useDataCacheStore.getState().updateResource<ProjectWorkerItem[]>(
            `projectWorkers:${projectId}`,
            (workers) => [...workers, worker],
            [],
          );
        }
        return worker;
      } catch (error: any) {
        setProjectWorkersError(
          error?.message || "Не удалось добавить работника в проект",
        );
        return null;
      } finally {
        setSavingProjectWorker(false);
      }
    },
    [],
  );

  const createWorkerCatalogItem = useCallback(
    async (payload: AddProjectWorkerPayload) => {
      try {
        setSavingWorkerCatalog(true);
        setProjectWorkersError(null);

        const response = await api.post("api/v1/workers", payload);
        const worker = response?.worker ?? response ?? null;
        if (worker) {
          useDataCacheStore.getState().updateResource<WorkerCatalogItem[]>(
            "workersCatalog:",
            (workers) => [worker, ...workers],
            [],
          );
        }
        return worker;
      } catch (error: any) {
        setProjectWorkersError(
          error?.message || "Не удалось добавить работника в каталог",
        );
        return null;
      } finally {
        setSavingWorkerCatalog(false);
      }
    },
    [],
  );

  const deleteWorker = useCallback(async (workerId: string) => {
    try {
      setSavingWorkerCatalog(true);
      setProjectWorkersError(null);

      await api.delete(`api/v1/workers/${workerId}`);
      useDataCacheStore.getState().updateResource<WorkerCatalogItem[]>(
        "workersCatalog:",
        (workers) => workers.filter((worker) => worker.id !== workerId),
        [],
      );
      return true;
    } catch (error: any) {
      setProjectWorkersError(error?.message || "Не удалось удалить работника");
      return false;
    } finally {
      setSavingWorkerCatalog(false);
    }
  }, []);

  const deleteProjectWorker = useCallback(
    async (projectId: string, workerId: string) => {
      try {
        setSavingProjectWorker(true);
        setProjectWorkersError(null);

        const response = await api.delete(
          `api/v1/projects/${projectId}/workers/${workerId}`,
        );
        useDataCacheStore.getState().updateResource<ProjectWorkerItem[]>(
          `projectWorkers:${projectId}`,
          (workers) => workers.filter((worker) => worker.worker_id !== workerId),
          [],
        );
        return response?.project ?? null;
      } catch (error: any) {
        setProjectWorkersError(
          error?.message || "Не удалось убрать работника из проекта",
        );
        return null;
      } finally {
        setSavingProjectWorker(false);
      }
    },
    [],
  );

  return {
    loadingProjectWorkers,
    savingProjectWorker,
    savingWorkerCatalog,
    loadingWorkersCatalog,
    projectWorkersError,
    listProjectWorkers,
    searchWorkersCatalog,
    addProjectWorker,
    createWorkerCatalogItem,
    deleteWorker,
    deleteProjectWorker,
  };
}
