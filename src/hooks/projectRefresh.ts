import { api } from "@/hooks/api_client";
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
  material_sections: any;
  id: string;
  number: string;
  name: string;
  object_code: string;
  project_code: string;
  total_materials_cost: string;
  material_expenses: MaterialExpense[];
};

type ApiResponse = {
  project: Project;
};

export function useGetProject(activeProjectId?: string) {
  const activeEntry = useDataCacheStore((state) =>
    activeProjectId ? state.resources[`project:${activeProjectId}`] : undefined,
  );
  const fetchResource = useDataCacheStore((state) => state.fetchResource);
  const updateResource = useDataCacheStore((state) => state.updateResource);

  const getProject = async (project_id: string, force = false) => {
    try {
      return await fetchResource<Project | null>(
        `project:${project_id}`,
        async () => {
          const data: ApiResponse = await api.get(
            `api/v1/projects/${project_id}`,
          );
          if (useDataCacheStore.getState().resources.projects?.loaded) {
            updateResource<Project[]>(
              "projects",
              (projects) =>
                projects.map((project) =>
                  project.id === data.project.id ? data.project : project,
                ),
              [],
            );
          }
          return data.project;
        },
        { force, initialData: null },
      );
    } catch {
      return null;
    }
  };

  return {
    getProject,
    projectDataRefresh: activeEntry?.data as Project | undefined,
    refreshing: activeEntry?.loading ?? false,
    error: activeEntry?.error ?? null,
  };
}
