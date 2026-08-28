import { apiUrl, request } from "./index";
import { Capacitor } from "@capacitor/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface UserInfo {
  email: string;
  name: string;
  picture?: string;
}

export interface NativeAuthResponse {
  success: boolean;
  user: UserInfo;
  sessionToken: string;
  error?: string;
}

export async function openAuth(): Promise<void> {
  const url = apiUrl(
    `/auth/google${Capacitor.isNativePlatform() ? "?native=true" : ""}`,
  );
  if (Capacitor.isNativePlatform()) {
    const { Browser } = await import("@capacitor/browser");
    await Browser.open({ url, windowName: "_blank" });
  } else {
    window.location.assign(url);
  }
}

export const authApi = {
  status: () =>
    request<{ authenticated: boolean; user: UserInfo | null }>(
      "/api/auth/google/status",
    ),
  native: (code: string) =>
    request<NativeAuthResponse>(
      "/api/auth/google/native",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      },
    ),
  logout: () =>
    request<{ success: boolean }>("/api/auth/logout", { method: "POST" }),
  login: openAuth,
  callbackUrl: (native: boolean) =>
    apiUrl(`/auth/google${native ? "?native=true" : ""}`),
};

export const authQueryKeys = {
  status: ["auth", "status"] as const,
};

export function useGetAuthStatus() {
  return useQuery({
    queryKey: authQueryKeys.status,
    queryFn: authApi.status,
  });
}

export function useNativeAuth() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.native,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: authQueryKeys.status }),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: authQueryKeys.status }),
  });
}
