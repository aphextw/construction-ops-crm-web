import { api } from "@/hooks/api_client";
import type { CacheEntry } from "@/store/useDataCacheStore";
import { useDataCacheStore } from "@/store/useDataCacheStore";

export type AppUser = {
  id: string;
  email: string;
  full_name: string;
  profile_photo_url?: string | null;
  status?: string;
  role?: {
    code?: string;
    display_name?: string;
  };
  company?: {
    code?: string;
    display_name?: string;
  };
};

export function useUsers() {
  const usersEntry = useDataCacheStore(
    (state) => state.resources.users as CacheEntry<AppUser[]> | undefined,
  );
  const fetchResource = useDataCacheStore((state) => state.fetchResource);

  const getUsers = async (force = false) => {
    try {
      return await fetchResource<AppUser[]>(
        "users",
        async () => {
          const response = await api.get("api/v1/users");
          return response?.users ?? [];
        },
        { force, initialData: [] },
      );
    } catch {
      return [];
    }
  };

  return {
    users: usersEntry?.data ?? [],
    loadingUsers: usersEntry?.loading ?? false,
    usersError: usersEntry?.error ?? null,
    getUsers,
  };
}
