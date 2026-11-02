import { useState } from "react";

import { api } from "@/hooks/api_client";
import { saveBlob } from "@/lib/download";

export function useDownloadProjectFile() {
  const [loadingDownload, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pdfUri, setPdfUri] = useState(null);

  const downloadFile = async (
    projectId,
    fileId,
    fileName = "file.pdf",
    sectionId = null,
  ) => {
    try {
      setLoading(true);
      setError(null);

      const endpoint = sectionId
        ? `api/v1/projects/${projectId}/material-sections/${sectionId}/files/${fileId}/download`
        : `api/v1/projects/${projectId}/files/${fileId}/download`;

      const blob = await api.download(endpoint);
      saveBlob(blob, fileName);

      setPdfUri(fileName);
      return fileName;
    } catch (e) {
      console.log("DOWNLOAD ERROR:", e);
      setError(e?.message || "Ошибка");
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    downloadFile,
    loadingDownload,
    error,
    pdfUri,
  };
}
