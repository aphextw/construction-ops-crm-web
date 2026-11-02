import { useCallback, useState } from "react";

import { api } from "@/hooks/api_client";
import type { CacheEntry } from "@/store/useDataCacheStore";
import { useDataCacheStore } from "@/store/useDataCacheStore";

type RegisterUserPayload = {
  full_name: string;
  email: string;
  company_code: string;
  role: string;
  phones?: string[];
};

type ModerationUser = {
  id: string;
  [key: string]: unknown;
};

export function useUserModeration() {
  const usersEntry = useDataCacheStore(
    (state) =>
      state.resources.users as CacheEntry<ModerationUser[]> | undefined,
  );
  const fetchResource = useDataCacheStore((state) => state.fetchResource);
  const updateResource = useDataCacheStore((state) => state.updateResource);
  const [savingModerationUser, setSavingModerationUser] = useState(false);
  const [moderationError, setModerationError] = useState<string | null>(null);

  const getModerationUsers = useCallback(async (force = false) => {
    try {
      setModerationError(null);
      return await fetchResource<ModerationUser[]>(
        "users",
        async () => {
          const response = await api.get("api/v1/users");
          return response?.users ?? [];
        },
        { force, initialData: [] },
      );
    } catch (error: any) {
      setModerationError(
        error?.message || "Не удалось загрузить список пользователей",
      );
      return [];
    }
  }, [fetchResource]);

  const approveUser = useCallback(async (userId: string) => {
    try {
      setSavingModerationUser(true);
      setModerationError(null);

      const response = await api.post(`api/v1/users/${userId}/approve`, {});
      const updated = response?.user ?? null;
      if (updated) {
        updateResource<ModerationUser[]>(
          "users",
          (current) =>
            current.map((user) => (user.id === userId ? updated : user)),
          [],
        );
      }
      return updated;
    } catch (error: any) {
      setModerationError(
        error?.message || "Не удалось подтвердить пользователя",
      );
      return null;
    } finally {
      setSavingModerationUser(false);
    }
  }, [updateResource]);

  const rejectUser = useCallback(async (userId: string) => {
    try {
      setSavingModerationUser(true);
      setModerationError(null);

      const response = await api.post(`api/v1/users/${userId}/reject`, {});
      const updated = response?.user ?? null;
      if (updated) {
        updateResource<ModerationUser[]>(
          "users",
          (current) =>
            current.map((user) => (user.id === userId ? updated : user)),
          [],
        );
      }
      return updated;
    } catch (error: any) {
      setModerationError(error?.message || "Не удалось отклонить пользователя");
      return null;
    } finally {
      setSavingModerationUser(false);
    }
  }, [updateResource]);

  const blockUser = useCallback(async (userId: string) => {
    try {
      setSavingModerationUser(true);
      setModerationError(null);

      const response = await api.post(`api/v1/users/${userId}/block`, {});
      const updated = response?.user ?? null;
      if (updated) {
        updateResource<ModerationUser[]>(
          "users",
          (current) =>
            current.map((user) => (user.id === userId ? updated : user)),
          [],
        );
      }
      return updated;
    } catch (error: any) {
      setModerationError(
        error?.message || "Не удалось заблокировать пользователя",
      );
      return null;
    } finally {
      setSavingModerationUser(false);
    }
  }, [updateResource]);

  const updateUserAdminProfile = useCallback(
    async (userId: string, payload: Record<string, string | null>) => {
      try {
        setSavingModerationUser(true);
        setModerationError(null);

        const response = await api.patch(`api/v1/users/${userId}`, payload);
        const updated = response?.user ?? null;
        if (updated) {
          updateResource<ModerationUser[]>(
            "users",
            (current) =>
              current.map((user) => (user.id === userId ? updated : user)),
            [],
          );
        }
        return updated;
      } catch (error: any) {
        setModerationError(
          error?.message || "Не удалось обновить данные пользователя",
        );
        return null;
      } finally {
        setSavingModerationUser(false);
      }
    },
    [updateResource],
  );

  const registerUser = useCallback(async (payload: RegisterUserPayload) => {
    try {
      setSavingModerationUser(true);
      setModerationError(null);

      const response = await api.post("api/v1/auth/register", payload);
      const created = response?.user ?? response ?? null;
      if (created) {
        updateResource<ModerationUser[]>(
          "users",
          (current) => [created, ...current],
          [],
        );
      }
      return created;
    } catch (error: any) {
      setModerationError(
        error?.message || "Не удалось зарегистрировать пользователя",
      );
      return null;
    } finally {
      setSavingModerationUser(false);
    }
  }, [updateResource]);

  const deleteUser = useCallback(async (userId: string) => {
    try {
      setSavingModerationUser(true);
      setModerationError(null);

      const response = await api.delete(`api/v1/users/${userId}`);
      updateResource<ModerationUser[]>(
        "users",
        (current) => current.filter((user) => user.id !== userId),
        [],
      );
      return response?.user ?? true;
    } catch (error: any) {
      setModerationError(error?.message || "Не удалось удалить пользователя");
      return null;
    } finally {
      setSavingModerationUser(false);
    }
  }, [updateResource]);

  return {
    users: usersEntry?.data ?? [],
    loadingModerationUsers: usersEntry?.loading ?? false,
    savingModerationUser,
    moderationError: moderationError || usersEntry?.error || null,
    getModerationUsers,
    approveUser,
    rejectUser,
    blockUser,
    registerUser,
    updateUserAdminProfile,
    deleteUser,
  };
}
