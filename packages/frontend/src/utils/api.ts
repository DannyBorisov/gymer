import { Capacitor } from '@capacitor/core';

// API base URL - from environment or defaults
// For native apps, always use the production URL
// For web, use the environment variable or default to production
const getApiBase = () => {
  if (Capacitor.isNativePlatform()) {
    return 'https://api.gymerr.co';
  }
  // Vite environment variable (set at build time)
  return import.meta.env.VITE_API_URL || 'https://api.gymerr.co';
};

export const API_BASE = getApiBase();

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

  // Don't use credentials: "include" on native - it causes issues
  // We use Bearer token auth anyway, not cookies
  const fetchOptions: RequestInit = {
    ...options,
    headers,
  };

  // Only include credentials for web (cookie-based sessions)
  if (!Capacitor.isNativePlatform()) {
    fetchOptions.credentials = "include";
  }

  return fetch(apiUrl(path), fetchOptions);
}
