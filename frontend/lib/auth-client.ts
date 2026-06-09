"use client";

import { apiBaseUrl } from "./workflow-api";

type AuthResponse = {
  accessToken?: string;
  refreshToken?: string;
  user?: {
    role?: string;
  };
};

let refreshPromise: Promise<string | null> | null = null;

function setCookie(name: string, value: string, maxAgeSeconds = 2_592_000) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; samesite=lax`;
}

function clearSession() {
  localStorage.removeItem("ticketassist_access_token");
  localStorage.removeItem("ticketassist_refresh_token");
  localStorage.removeItem("ticketassist_token");
  localStorage.removeItem("ticketassist_user");
  document.cookie = "ticketassist_access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  document.cookie = "ticketassist_user_role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
}

function saveTokenPair(data: Required<Pick<AuthResponse, "accessToken" | "refreshToken">> & Pick<AuthResponse, "user">) {
  localStorage.setItem("ticketassist_access_token", data.accessToken);
  localStorage.setItem("ticketassist_refresh_token", data.refreshToken);
  localStorage.setItem("ticketassist_token", data.accessToken);
  setCookie("ticketassist_access_token", data.accessToken);

  if (data.user?.role) {
    setCookie("ticketassist_user_role", data.user.role);
  }
}

export function getAccessToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return localStorage.getItem("ticketassist_access_token") ?? "";
}

export function getAuthHeaders(extraHeaders: HeadersInit = {}) {
  const accessToken = getAccessToken();
  const headers = new Headers(extraHeaders);

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  return headers;
}

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem("ticketassist_refresh_token");

  if (!refreshToken) {
    return null;
  }

  const response = await fetch(`${apiBaseUrl}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken })
  });

  if (!response.ok) {
    clearSession();
    return null;
  }

  const data = (await response.json()) as AuthResponse;

  if (!data.accessToken || !data.refreshToken) {
    clearSession();
    return null;
  }

  saveTokenPair({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    user: data.user
  });

  return data.accessToken;
}

async function getFreshAccessToken() {
  refreshPromise ??= refreshAccessToken().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const response = await fetch(input, {
    ...init,
    headers: getAuthHeaders(init.headers)
  });

  if (response.status !== 401) {
    return response;
  }

  const refreshedToken = await getFreshAccessToken();

  if (!refreshedToken) {
    return response;
  }

  return fetch(input, {
    ...init,
    headers: getAuthHeaders({
      ...Object.fromEntries(new Headers(init.headers).entries()),
      Authorization: `Bearer ${refreshedToken}`
    })
  });
}
