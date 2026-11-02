import { useState } from "react";
import { api } from "../hooks/api_client";
import { storage } from "@/lib/storage";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);

      const json = await api.post("api/v1/auth/login", {
        email,
        password,
      });

      const accessToken = json?.access_token || json?.tokens?.access_token;
      const refreshToken = json?.refresh_token || json?.tokens?.refresh_token;
      const userData = json?.user;

      if (!accessToken || !userData) {
        throw new Error("Некорректный ответ сервера");
      }

      setToken(accessToken);
      setUser(userData);

      storage.set("access_token", accessToken);
      if (refreshToken) {
        storage.set("refresh_token", refreshToken);
      } else {
        storage.remove("refresh_token");
      }
      storage.setJSON("user", userData);

      return true;
    } catch (e) {
      const message =
        e?.message === "Load failed"
          ? "Не удалось подключиться к API. Для локальной разработки нужен прокси или разрешённый CORS."
          : e?.message || "Ошибка авторизации";

      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);

    storage.remove("access_token");
    storage.remove("refresh_token");
    storage.remove("user");
  };

  return {
    user,
    token,
    loading,
    error,
    login,
    logout,
    setError,
  };
}
