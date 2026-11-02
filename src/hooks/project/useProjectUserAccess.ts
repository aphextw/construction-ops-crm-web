import { useState } from "react";

import { api } from "@/hooks/api_client";
import { useDataCacheStore } from "@/store/useDataCacheStore";

export type ProjectAccessUser = {
  id: string;
  email: string;
  full_name: string;
  profile_photo_url?: string | null;
  role?: {
    code?: string;
    display_name?: string;
  };
  company?: {
    code?: string;
    display_name?: string;
  };
};

export type ProjectUserAccess = {
  id: string;
  user: ProjectAccessUser;
  can_view: boolean;
  can_edit: boolean;
  created_at: string;
  updated_at: string;
};

type UserAccessPayload = {
  user_id: string;
  can_view?: boolean;
  can_edit?: boolean;
};

export function useProjectUserAccess() {
  const [loadingUserAccess, setLoadingUserAccess] = useState(false);
  const [savingUserAccess, setSavingUserAccess] = useState(false);
  const [errorUserAccess, setErrorUserAccess] = useState<string | null>(null);

  const listUserAccess = async (projectId: string, force = false) => {
    try {
      setLoadingUserAccess(true);
      setErrorUserAccess(null);

      return await useDataCacheStore.getState().fetchResource<ProjectUserAccess[]>(
        `projectAccess:${projectId}`,
        async () => {
          const response = await api.get(`api/v1/projects/${projectId}/user-access`);
          return response?.user_access ?? [];
        },
        { force, initialData: [] },
      );
    } catch (error: any) {
      setErrorUserAccess(
        error?.message || "Не удалось загрузить персональные доступы",
      );
      return [];
    } finally {
      setLoadingUserAccess(false);
    }
  };

  const addUserAccess = async (projectId: string, payload: UserAccessPayload) => {
    try {
      setSavingUserAccess(true);
      setErrorUserAccess(null);

      const response = await api.request(`api/v1/projects/${projectId}/user-access`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const access = response?.user_access ?? null;
      if (access) {
        useDataCacheStore.getState().updateResource<ProjectUserAccess[]>(
          `projectAccess:${projectId}`,
          (items) => [...items, access],
          [],
        );
      }
      return access;
    } catch (error: any) {
      setErrorUserAccess(
        error?.message || "Не удалось выдать доступ пользователю",
      );
      return null;
    } finally {
      setSavingUserAccess(false);
    }
  };

  const updateUserAccess = async (
    projectId: string,
    accessId: string,
    payload: UserAccessPayload,
  ) => {
    try {
      setSavingUserAccess(true);
      setErrorUserAccess(null);

      const response = await api.patch(
        `api/v1/projects/${projectId}/user-access/${accessId}`,
        payload,
      );

      const access = response?.user_access ?? null;
      if (access) {
        useDataCacheStore.getState().updateResource<ProjectUserAccess[]>(
          `projectAccess:${projectId}`,
          (items) => items.map((item) => item.id === accessId ? access : item),
          [],
        );
      }
      return access;
    } catch (error: any) {
      setErrorUserAccess(
        error?.message || "Не удалось обновить доступ пользователя",
      );
      return null;
    } finally {
      setSavingUserAccess(false);
    }
  };

  const deleteUserAccess = async (projectId: string, accessId: string) => {
    try {
      setSavingUserAccess(true);
      setErrorUserAccess(null);

      const response = await api.delete(
        `api/v1/projects/${projectId}/user-access/${accessId}`,
      );

      const deletedAccess = response?.deleted_user_access ?? null;
      useDataCacheStore.getState().updateResource<ProjectUserAccess[]>(
        `projectAccess:${projectId}`,
        (items) => items.filter((item) => item.id !== accessId),
        [],
      );
      return deletedAccess;
    } catch (error: any) {
      setErrorUserAccess(
        error?.message || "Не удалось удалить доступ пользователя",
      );
      return null;
    } finally {
      setSavingUserAccess(false);
    }
  };

  return {
    loadingUserAccess,
    savingUserAccess,
    errorUserAccess,
    listUserAccess,
    addUserAccess,
    updateUserAccess,
    deleteUserAccess,
  };
}
