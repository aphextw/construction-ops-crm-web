import { useState } from "react";

import { api } from "@/hooks/api_client";

export function useUploadMaterialImport() {
  const [loadingMaterialImport, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadMaterialImport = async (projectId: string, file: File) => {
    try {
      setLoading(true);
      setError(null);

      const formData = new FormData();
      formData.append("file", file, file.name);
      formData.append("display_name", file.name);

      const data = await api.request(
        `api/v1/projects/${projectId}/material-imports`,
        {
          method: "POST",
          body: formData,
          headers: {
            accept: "application/json",
          },
        },
      );

      return data;
    } catch (e: any) {
      setError(e?.message || "Ошибка загрузки файла");
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { uploadMaterialImport, loadingMaterialImport, error };
}
