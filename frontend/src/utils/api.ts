import { Capacitor } from '@capacitor/core';

// Use production URL when running as native app, relative URLs for web
export const API_BASE = Capacitor.isNativePlatform()
  ? 'https://gymerr.co'
  : '';

export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

// Helper to get auth headers
export function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const token = localStorage.getItem("sessionToken");
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

// Authenticated fetch wrapper
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const headers = {
    ...getAuthHeaders(),
    ...(options.headers || {}),
  };

  return fetch(apiUrl(path), {
    ...options,
    credentials: "include",
    headers,
  });
}
