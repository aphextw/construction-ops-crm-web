export const API_URL = import.meta.env.DEV
  ? "/"
  : import.meta.env.VITE_API_URL || "https://test-api.example/";

let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

export async function refreshToken() {
  const refreshToken = localStorage.getItem("refresh_token");

  const res = await fetch(`${API_URL}api/v1/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      refresh_token: refreshToken,
    }),
  });

  if (res.status === 401) {
    onUnauthorized?.();
    return;
  }

  if (!res.ok) {
    throw new Error("Не удалось обновить токен");
  }

  const data = await res.json();

  const newAccess = data?.access_token || data?.tokens?.access_token;
  const newRefresh = data?.refresh_token || data?.tokens?.refresh_token;

  if (!newAccess) throw new Error("Нет access_token");

  localStorage.setItem("access_token", newAccess);

  if (newRefresh) {
    localStorage.setItem("refresh_token", newRefresh);
  }

  return newAccess;
}

export const api = {
  async request(
    url: string,
    options: RequestInit = {},
    responseType: "json" | "blob" | "text" = "json",
    retry = true,
  ) {
    const token = localStorage.getItem("access_token");

    const isFormData = options.body instanceof FormData;

    const makeRequest = async (accessToken: string | null) => {
      return fetch(`${API_URL}${url}`, {
        ...options,
        headers: {
          ...(isFormData ? {} : { "Content-Type": "application/json" }),
          ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
          accept: responseType === "blob" ? "*/*" : "application/json",
          ...(options.headers || {}),
        },
      });
    };

    console.log(url);

    let res = await makeRequest(token);

    // console.log(res);

    if (res.status === 401 && retry) {
      const newToken = await refreshToken();
      res = await makeRequest(newToken);
    }

    if (!res.ok) {
      const error = await res.text();
      throw new Error(error || "Ошибка запроса");
    }

    if (res.status === 204) {
      return null;
    }

    switch (responseType) {
      case "blob":
        return res.blob();
      case "text":
        return res.text();
      default:
        return res.json();
    }
  },

  get(url: string, responseType?: "json" | "blob" | "text") {
    return this.request(url, {}, responseType);
  },

  post(url: string, body: any) {
    return this.request(url, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  patch(url: string, body: any) {
    return this.request(url, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },

  put(url: string, body: any) {
    return this.request(url, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  },

  delete(url: string) {
    return this.request(url, {
      method: "DELETE",
    });
  },

  download(url: string) {
    return this.request(url, {}, "blob");
  },
};
