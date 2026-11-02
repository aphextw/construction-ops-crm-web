import { useState } from "react";
import { api } from "@/hooks/api_client";
import { useDataCacheStore } from "@/store/useDataCacheStore";

interface UseDeleteProjectResult {
  deleteProject: (projectId: string) => Promise<boolean>;
  loading: boolean;
  error: string | null;
}

export function useDeleteProject(): UseDeleteProjectResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteProject = async (projectId: string): Promise<boolean> => {
    if (!projectId) {
      setError("ID проекта не указан");
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      await api.delete(`api/v1/projects/${projectId}`);
      const cache = useDataCacheStore.getState();
      if (cache.resources.projects?.loaded) {
        cache.updateResource<Array<{ id: string }>>(
          "projects",
          (projects) => projects.filter((project) => project.id !== projectId),
          [],
        );
      }
      useDataCacheStore.getState().invalidateResource(`project:${projectId}`);

      return true;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Ошибка удаления проекта";
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { deleteProject, loading, error };
}
