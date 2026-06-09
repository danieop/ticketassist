"use client";

export function getAccessToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return localStorage.getItem("ticketassist_access_token") ?? "";
}

export function getAuthHeaders(extraHeaders: HeadersInit = {}) {
  const accessToken = getAccessToken();

  return {
    ...extraHeaders,
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
  };
}
