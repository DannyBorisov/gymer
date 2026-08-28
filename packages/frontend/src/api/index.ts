import { Capacitor, CapacitorHttp } from "@capacitor/core";

export const API_BASE = Capacitor.isNativePlatform()
  ? "https://api.gymerr.co"
  : import.meta.env.VITE_API_URL;

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("sessionToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function apiUrl(path: string): string {
  return new URL(path, API_BASE).href;
}

export async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const optionHeaders = new Headers(options.headers);
  const headers: Record<string, string> = {
    ...getAuthHeaders(),
    ...Object.fromEntries(optionHeaders.entries()),
  };
  const url = apiUrl(path);
  let response: Response;

  if (Capacitor.isNativePlatform()) {
    const nativeResponse = await CapacitorHttp.request({
      url,
      method: (options.method || "GET").toUpperCase(),
      headers,
      data: options.body,
    });
    response = new Response(JSON.stringify(nativeResponse.data), {
      status: nativeResponse.status,
      headers: nativeResponse.headers,
    });
  } else {
    response = await fetch(url, {
      ...options,
      headers,
      credentials: "include",
    });
  }

  const data = (await response.json().catch(() => null)) as T & {
    error?: string;
  };
  if (!response.ok) {
    throw new Error(data?.error || `Request failed (${response.status})`);
  }
  return data;
}

export * from "./auth";
export * from "./analytics";
export * from "./profile";
export * from "./programs";
export * from "./workouts";
