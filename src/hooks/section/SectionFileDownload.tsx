import { useState } from "react";

import { api } from "@/hooks/api_client";
import { saveBlob } from "@/lib/download";

export function useDownloadSectionFile() {
  const [loadingDownload, setLoadingDownload] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const downloadSectionFile = async (
    projectId: string,
    sectionId: string,
    fileId: string,
    fileName: string,
  ) => {
    try {
      setLoadingDownload(true);
      setError(null);

      const blob = await api.download(
        `api/v1/projects/${projectId}/material-sections/${sectionId}/files/${fileId}/download`,
      );

      saveBlob(blob, fileName);
      return true;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Ошибка скачивания файла";
      setError(message);
      return false;
    } finally {
      setLoadingDownload(false);
    }
  };

  return {
    loadingDownload,
    error,
    downloadSectionFile,
  };
}
