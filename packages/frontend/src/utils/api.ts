import { Capacitor, CapacitorHttp } from '@capacitor/core';

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

// Authenticated fetch wrapper - uses native HTTP on iOS to avoid WKWebView issues
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const authHeaders = getAuthHeaders();

  // Merge headers properly
  const headers: Record<string, string> = {
    ...authHeaders,
  };

  // Handle options.headers whether it's a Headers object or plain object
  if (options.headers) {
    if (options.headers instanceof Headers) {
      options.headers.forEach((value, key) => {
        headers[key] = value;
      });
    } else {
      Object.assign(headers, options.headers);
    }
  }

  const url = apiUrl(path);
  const method = (options.method || 'GET').toUpperCase();

  // Use native HTTP on iOS/Android to avoid WKWebView fetch issues
  if (Capacitor.isNativePlatform()) {
    console.log(`[API Native] ${method} ${url}`);

    // Pass body as-is (string) to avoid Content-Length issues
    const bodyString = options.body as string | undefined;

    // Set Content-Type if we have a JSON body
    const nativeHeaders = { ...headers };
    if (bodyString && !nativeHeaders['Content-Type'] && !nativeHeaders['content-type']) {
      nativeHeaders['Content-Type'] = 'application/json; charset=utf-8';
    }

    const response = await CapacitorHttp.request({
      url,
      method,
      headers: nativeHeaders,
      data: bodyString,
    });

    // Convert CapacitorHttp response to fetch-like Response
    return new Response(JSON.stringify(response.data), {
      status: response.status,
      headers: response.headers,
    });
  }

  // Web: use regular fetch with credentials for cookie auth
  console.log(`[API Web] ${method} ${url}`);

  const fetchOptions: RequestInit = {
    ...options,
    headers,
    credentials: "include",
  };

  return fetch(url, fetchOptions);
}
