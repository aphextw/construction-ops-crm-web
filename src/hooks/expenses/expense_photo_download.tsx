import { useState } from "react";

import { api } from "@/hooks/api_client";

export const useExpensePhotos = () => {
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});

  const getPhotoUri = async (
    expenseId: string,
    projectId: string,
    photoId: string,
  ): Promise<string | null> => {
    try {
      setLoadingMap((prev) => ({ ...prev, [photoId]: true }));

      const blob = await api.download(
        `api/v1/projects/${projectId}/material-expenses/${expenseId}/photos/${photoId}/download`,
      );

      return URL.createObjectURL(blob);
    } catch {
      return null;
    } finally {
      setLoadingMap((prev) => ({ ...prev, [photoId]: false }));
    }
  };

  return {
    getPhotoUri,
    loadingMap,
  };
};

export const useUploadExpensePhoto = () => {
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});

  const uploadPhoto = async (
    expenseId: string,
    projectId: string,
    file: File,
  ) => {
    try {
      setLoadingMap((prev) => ({ ...prev, [expenseId]: true }));

      const formData = new FormData();
      formData.append("photo", file, file.name);

      const response = await api.request(
        `api/v1/projects/${projectId}/material-expenses/${expenseId}/photos`,
        {
          method: "POST",
          body: formData,
        },
      );

      return response;
    } catch {
      return null;
    } finally {
      setLoadingMap((prev) => ({ ...prev, [expenseId]: false }));
    }
  };

  return {
    uploadPhoto,
    loadingMap,
  };
};
