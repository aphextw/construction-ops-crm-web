import { useState } from "react";

import { api } from "@/hooks/api_client";

function getProjectFileUploadError(error: unknown) {
  const fallback = "Не удалось загрузить файл";
  if (!(error instanceof Error)) return fallback;

  let message = error.message;
  try {
    const parsed = JSON.parse(message);
    message = parsed?.error || message;
  } catch {
    // The API can return plain text as well as JSON.
  }

  if (message.includes("file must be pdf")) {
    return "Для файлов проекта поддерживается только формат PDF";
  }
  if (message.includes("file must be 200MB or smaller")) {
    return "Размер PDF не должен превышать 200 МБ";
  }
  if (message.includes("file is required")) return "Файл не выбран";
  if (message.includes("cannot save file")) {
    return "Сервер не смог сохранить файл";
  }

  return message || fallback;
}

export function useUploadProjectFile() {
  const [loadingFile, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = async (projectId: string, type: string, file: File) => {
    try {
      setLoading(true);
      setError(null);

      const formData = new FormData();
      formData.append("file", file, file.name);
      formData.append("display_name", file.name);

      const data = await api.request(`api/v1/projects/${projectId}/files/${type}`, {
        method: "POST",
        body: formData,
        headers: {
          accept: "application/json",
        },
      });

      return data;
    } catch (e: unknown) {
      setError(getProjectFileUploadError(e));
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { uploadFile, loadingFile, error };
}
