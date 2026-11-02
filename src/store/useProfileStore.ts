import { create } from "zustand";

import { API_URL, api } from "@/hooks/api_client";
import { storage } from "@/lib/storage";
import { useDataCacheStore } from "@/store/useDataCacheStore";

export type UserProfile = {
  id?: string;
  full_name?: string;
  email?: string;
  profile_photo_url?: string | null;
  rating?: number;
  status?: string;
  generated_password?: string | null;
  generated_password_valid?: boolean;
  phones?: string[];
  role?: { code?: string; display_name?: string };
  company?: { code?: string; display_name?: string };
};

type ProfileResult = UserProfile | null;

type ProfileState = {
  user: UserProfile;
  loadingProfile: boolean;
  refreshing: boolean;
  photoLoading: boolean;
  savingProfile: boolean;
  avatarCacheVersion: number;
  hydrateProfile: () => Promise<UserProfile | string | null>;
  refreshProfile: () => Promise<ProfileResult>;
  syncProfile: (key?: string | null) => Promise<void>;
  resetProfile: () => void;
  uploadAvatar: (file: File | null) => Promise<ProfileResult>;
  deleteAvatar: () => Promise<ProfileResult>;
  updateProfile: (payload: Record<string, string>) => Promise<ProfileResult>;
  getAvatarUri: (avatarPath?: string | null) => string | null;
};

const PROFILE_STORAGE_KEY = "user";
const MAX_PHOTO_SIZE_BYTES = 2 * 1024 * 1024;

let hydratedToken: string | null = null;
let hydrationPromise: Promise<UserProfile | string | null> | null = null;
let profileRequest: Promise<UserProfile> | null = null;
let profileGeneration = 0;

function getStoredProfile() {
  return storage.getJSON<UserProfile | null>(PROFILE_STORAGE_KEY, null);
}

function fetchProfileOnce() {
  if (!profileRequest) {
    profileRequest = api
      .get("api/v1/me")
      .then((response) => (response?.user ?? response) as UserProfile)
      .finally(() => {
        profileRequest = null;
      });
  }

  return profileRequest;
}

export const useProfileStore = create<ProfileState>((set, get) => {
  const applyUser = (nextUser: UserProfile) => {
    const savedUser = getStoredProfile() || {};
    const resolvedUser =
      nextUser.generated_password_valid === true &&
      !nextUser.generated_password &&
      savedUser.generated_password
        ? { ...nextUser, generated_password: savedUser.generated_password }
        : nextUser;

    set({ user: resolvedUser });
    storage.setJSON(PROFILE_STORAGE_KEY, resolvedUser);
    return resolvedUser;
  };

  return {
    user: getStoredProfile() || {},
    loadingProfile: true,
    refreshing: false,
    photoLoading: false,
    savingProfile: false,
    avatarCacheVersion: 0,

    hydrateProfile: async () => {
      const token = storage.get("access_token");

      if (!token) {
        hydratedToken = null;
        set({ user: {}, loadingProfile: false });
        return null;
      }

      if (hydratedToken === token) {
        set({ loadingProfile: false });
        return get().user;
      }

      if (hydrationPromise) {
        return hydrationPromise;
      }

      const generation = profileGeneration;

      hydrationPromise = (async () => {
        try {
          const savedUser = getStoredProfile();

          if (savedUser) {
            set({ user: savedUser });
          }

          const freshUser = await fetchProfileOnce();

          if (generation !== profileGeneration) {
            return null;
          }

          const appliedUser = applyUser(freshUser);
          hydratedToken = storage.get("access_token") || token;
          return appliedUser;
        } catch (error: unknown) {
          const message =
            error instanceof Error ? error.message : String(error);

          if (!message.includes("Нет refresh токена")) {
            console.error("Ошибка загрузки профиля:", error);
          }

          return message;
        } finally {
          set({ loadingProfile: false });
          hydrationPromise = null;
        }
      })();

      return hydrationPromise;
    },

    refreshProfile: async () => {
      const generation = profileGeneration;

      try {
        set({ refreshing: true });
        const freshUser = await fetchProfileOnce();

        if (generation !== profileGeneration) {
          return null;
        }

        const appliedUser = applyUser(freshUser);
        hydratedToken = storage.get("access_token");
        return appliedUser;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);

        if (!message.includes("Нет refresh токена")) {
          console.error("Ошибка обновления профиля:", error);
        }

        return null;
      } finally {
        set({ refreshing: false });
      }
    },

    syncProfile: async (key) => {
      if (key === PROFILE_STORAGE_KEY) {
        const savedUser = getStoredProfile();

        if (savedUser) {
          set({ user: savedUser });
        }
        return;
      }

      if (key && !["access_token", "refresh_token"].includes(key)) {
        return;
      }

      const token = storage.get("access_token");

      if (!token) {
        get().resetProfile();
        return;
      }

      if (token !== hydratedToken) {
        profileGeneration += 1;
        hydratedToken = null;
        hydrationPromise = null;
        profileRequest = null;
        useDataCacheStore.getState().resetDataCache();
      }

      await get().hydrateProfile();
    },

    resetProfile: () => {
      profileGeneration += 1;
      hydratedToken = null;
      hydrationPromise = null;
      profileRequest = null;
      useDataCacheStore.getState().resetDataCache();
      set({
        user: {},
        loadingProfile: false,
        refreshing: false,
        photoLoading: false,
        savingProfile: false,
        avatarCacheVersion: 0,
      });
    },

    uploadAvatar: async (file) => {
      try {
        if (!file) return null;

        if (file.size > MAX_PHOTO_SIZE_BYTES) {
          throw new Error("Фото должно быть не больше 2 МБ");
        }

        set({ photoLoading: true });
        const formData = new FormData();
        formData.append("photo", file, file.name || "avatar.jpg");

        const response = await api.request("api/v1/me/profile-photo/upload", {
          method: "POST",
          body: formData,
        });
        const responseUser = (response?.user ?? response ?? {}) as UserProfile;
        const nextUser = { ...get().user, ...responseUser };
        const hasPhotoUrl = Object.prototype.hasOwnProperty.call(
          responseUser,
          "profile_photo_url",
        );
        const appliedUser = applyUser(nextUser);

        set((state) => ({ avatarCacheVersion: state.avatarCacheVersion + 1 }));
        return hasPhotoUrl ? appliedUser : await get().refreshProfile();
      } catch (error: unknown) {
        console.error("Ошибка загрузки фото:", error);
        return null;
      } finally {
        set({ photoLoading: false });
      }
    },

    deleteAvatar: async () => {
      try {
        set({ photoLoading: true });
        const response = await api.patch("api/v1/me/profile-photo", {
          profile_photo_url: null,
        });
        return applyUser((response?.user ?? response) as UserProfile);
      } catch (error: unknown) {
        console.error("Ошибка удаления фото:", error);
        return null;
      } finally {
        set({ photoLoading: false });
      }
    },

    updateProfile: async (payload) => {
      try {
        set({ savingProfile: true });

        if (!Object.keys(payload).length) return get().user;

        const response = await api.patch("api/v1/me", payload);
        const responseUser = (response?.user ?? response) as UserProfile;
        return applyUser({ ...get().user, ...responseUser });
      } catch (error: unknown) {
        console.error("Ошибка сохранения профиля:", error);
        return null;
      } finally {
        set({ savingProfile: false });
      }
    },

    getAvatarUri: (avatarPath = get().user.profile_photo_url) => {
      if (!avatarPath) return null;

      const fingerprint = `${encodeURIComponent(avatarPath)}-${get().avatarCacheVersion}`;

      if (
        avatarPath.startsWith("http://") ||
        avatarPath.startsWith("https://")
      ) {
        const separator = avatarPath.includes("?") ? "&" : "?";
        return `${avatarPath}${separator}v=${fingerprint}`;
      }

      const separator = avatarPath.includes("?") ? "&" : "?";
      return `${API_URL.replace(/\/$/, "")}${avatarPath}${separator}v=${fingerprint}`;
    },
  };
});
