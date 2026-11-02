import { useCallback, useEffect } from "react";
import { api } from "@/hooks/api_client";
import type { CacheEntry } from "@/store/useDataCacheStore";
import { useDataCacheStore } from "@/store/useDataCacheStore";

type MaterialPhoto = {
  id: string;
  url: string;
  original_filename: string;
  content_type: string;
  size_bytes: number;
  uploaded_by: string;
  created_at: string;
};

type MaterialExpense = {
  id: string;
  material_type: string;
  quantity: string;
  unit_price: string;
  line_total: string;
  photos: MaterialPhoto[];
  created_at: string;
  updated_at: string;
};

type Project = {
  id: string;
  number: string;
  name: string;
  object_code: string;
  project_code: string;
  total_materials_cost: string;
  status: string;
  material_expenses: MaterialExpense[];
};

type ApiResponse = {
  projects: Project[];
};

export function useGetProjects() {
  const entry = useDataCacheStore(
    (state) => state.resources.projects as CacheEntry<Project[]> | undefined,
  );
  const fetchResource = useDataCacheStore((state) => state.fetchResource);

  const fetchProjects = useCallback(async (force = false) => {
    try {
      return await fetchResource<Project[]>(
        "projects",
        async () => {
          const data: ApiResponse = await api.get("api/v1/projects");
          return data.projects;
        },
        { force, initialData: [] },
      );
    } catch {
      return null;
    }
  }, [fetchResource]);

  useEffect(() => {
    void fetchProjects(false);
  }, [fetchProjects]);

  return {
    projects: entry?.data ?? [],
    loading: entry?.loading ?? false,
    error: entry?.error ?? null,
    getProjects: () => fetchProjects(true),
  };
}
