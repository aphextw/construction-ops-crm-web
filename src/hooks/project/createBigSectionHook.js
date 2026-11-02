import { useState } from "react";

import { api } from "@/hooks/api_client";

export function useCreateBigSection() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createBigSection = async (projectId, name, number) => {
    if (!projectId) {
      setError("ID проекта не указан");
      return false;
    }

    if (!name?.trim()) {
      setError("Введите название раздела");
      return false;
    }

    if (!number?.trim()) {
      setError("Введите номер раздела");
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      await api.post(`api/v1/projects/${projectId}/big-sections`, {
        name: name.trim(),
        number: number.trim(),
      });

      return true;
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Ошибка при создании раздела",
      );
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { createBigSection, loading, error };
}
