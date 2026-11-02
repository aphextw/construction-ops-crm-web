import { useRef, useState } from "react";

import { api } from "@/hooks/api_client";
import { useDataCacheStore } from "@/store/useDataCacheStore";

function getUpdateError(error) {
  let message = error instanceof Error ? error.message : "";
  try {
    message = JSON.parse(message)?.error || message;
  } catch {
    // The API also returns plain-text errors.
  }

  const messages = {
    "invalid material section": "Заполните название и номер раздела",
    "material section already exists": "Раздел с таким названием уже существует",
    "project forbidden": "У вас нет доступа к редактированию этого проекта",
    "forbidden": "У вас нет доступа к редактированию разделов",
    "material section not found": "Раздел не найден. Обновите страницу",
  };
  return messages[message] || message || "Не удалось сохранить раздел";
}

export function useUpdateBigSection() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const pending = useRef(false);

  const updateBigSection = async (projectId, sectionId, name, number) => {
    if (pending.current) return null;
    const payload = {
      name: String(name ?? "").trim(),
      number: String(number ?? "").trim(),
    };
    if (!projectId || !sectionId || !payload.name || !payload.number) {
      setError("Заполните название и номер раздела");
      return null;
    }

    pending.current = true;
    setLoading(true);
    setError(null);
    try {
      const response = await api.patch(
        `api/v1/projects/${projectId}/big-sections/${sectionId}`,
        payload,
      );
      if (response?.project?.id !== projectId || response?.big_section?.id !== sectionId) {
        throw new Error("Сервер не подтвердил изменение раздела. Обновите страницу");
      }

      const cache = useDataCacheStore.getState();
      cache.setResource(`project:${projectId}`, response.project);
      cache.invalidateResource(`projectHistory:${projectId}`);
      if (cache.resources.projects?.loaded) {
        cache.updateResource(
          "projects",
          (projects) => projects.map((project) =>
            project.id === response.project.id ? response.project : project),
          [],
        );
      }
      return response;
    } catch (requestError) {
      setError(getUpdateError(requestError));
      return null;
    } finally {
      pending.current = false;
      setLoading(false);
    }
  };

  return { updateBigSection, loading, error, clearError: () => setError(null) };
}
