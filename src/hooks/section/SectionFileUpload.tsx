import { useState } from "react";

import { api } from "@/hooks/api_client";
import { useDataCacheStore } from "@/store/useDataCacheStore";

function getSectionFileUploadError(error: unknown) {
  const fallback = "Не удалось загрузить файл";
  if (!(error instanceof Error)) return fallback;

  let message = error.message;
  try {
    const parsed = JSON.parse(message);
    message = parsed?.error || message;
  } catch {
    // The API can also return a plain-text error.
  }

  if (/file must be (20|200)MB or smaller/.test(message)) {
    return "Файл превышает допустимый размер 200 МБ";
  }

  if (message.includes("file must be pdf")) {
    return "Поддерживаются PDF, DOC, DOCX, XLS, XLSX, JPG и PNG";
  }

  if (message.includes("file is required")) return "Файл не выбран";
  if (message.includes("project forbidden") || message === "forbidden") {
    return "Нет доступа к загрузке файлов в этот подраздел";
  }
  if (message.includes("cannot save file")) return "Сервер не смог сохранить файл";
  return message || fallback;
}

export function useUploadSectionFile() {
  const [loadingSecFile, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadSecFile = async (
    projectId: string | string[],
    sectionId: string,
    file: File,
  ) => {
    try {
      setLoading(true);
      setError(null);

      const formData = new FormData();
      formData.append("file", file, file.name);
      formData.append("display_name", file.name);

      const data = await api.request(
        `api/v1/projects/${projectId}/material-sections/${sectionId}/files`,
        {
          method: "POST",
          body: formData,
          headers: {
            accept: "application/json",
          },
        },
      );

      if (!data?.file?.id || data?.project?.id !== projectId) {
        throw new Error("Сервер не подтвердил загрузку файла. Обновите страницу");
      }
      const cache = useDataCacheStore.getState();
      cache.setResource(`project:${projectId}`, data.project);
      cache.invalidateResource(`projectHistory:${projectId}`);
      return data;
    } catch (e: unknown) {
      setError(getSectionFileUploadError(e));
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { uploadSecFile, loadingSecFile, error, clearError: () => setError(null) };
}
