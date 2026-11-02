import { useState } from "react";
import { api } from "@/hooks/api_client";

type MaterialExpense = {
  material_type: string;
  quantity: string;
  unit_price: string;
  comment?: string;
};

type CreateProjectPayload = {
  number: string;
  name: string;
  object_code: string;
  project_code: string;
  comment?: string;
  total_materials_cost: string;
  material_expenses: MaterialExpense[];
  visible_roles: string[];
};

export function useCreateProject() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createProject = async (payload: CreateProjectPayload) => {
    setLoading(true);
    setError(null);

    try {
      const cleanedPayload = {
        ...payload,
        comment: payload.comment || undefined,
        material_expenses: payload.material_expenses ?? [],
        visible_roles: payload.visible_roles ?? [],
      };

      const response = await api.post("api/v1/projects", cleanedPayload);

      console.log("new", response);

      return response;
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Ошибка создания проекта";
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    createProject,
    loading,
    error,
  };
}
