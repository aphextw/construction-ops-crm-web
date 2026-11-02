import { useEffect, useState } from "react";

import { api } from "@/hooks/api_client";
import { storage } from "@/lib/storage";

type User = {
  id: string;
  email: string;
  role: string;
};

export function useCheckAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuth, setIsAuth] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = async () => {
    const res = await api.get("api/v1/me");
    return res?.user ?? res;
  };

  const refreshAccessToken = async () => {
    const refreshToken = storage.get("refresh_token");

    if (!refreshToken) {
      throw new Error("No refresh token");
    }

    const data = await api.post("api/v1/auth/refresh", {
      refresh_token: refreshToken,
    });

    const nextRefreshToken = data?.refresh_token ?? data?.tokens?.refresh_token;
    const nextAccessToken = data?.access_token ?? data?.tokens?.access_token;

    if (!nextAccessToken) {
      throw new Error("Refresh failed");
    }

    if (nextRefreshToken) {
      storage.set("refresh_token", nextRefreshToken);
    }

    storage.set("access_token", nextAccessToken);

    return nextAccessToken;
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        let token = storage.get("access_token");

        if (!token) {
          setIsAuth(false);
          return;
        }

        try {
          const data = await fetchMe();
          setUser(data);
          setIsAuth(true);
        } catch {
          token = await refreshAccessToken();

          if (!token) throw new Error("No token");
          const data = await fetchMe();
          setUser(data);
          setIsAuth(true);
        }
      } catch {
        setUser(null);
        setIsAuth(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  return { user, isAuth, loading };
}
