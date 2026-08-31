import { request } from "./index";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface WeightEntry {
  date: string; // ISO date string from server
  weight: number;
}

export const profileApi = {
  weight: () => request<{ entries: WeightEntry[] }>("/api/body-weight"),
  saveWeight: (weight: string) => request<WeightEntry>("/api/body-weight", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ weight }),
  }),
};

export const profileQueryKeys = {
  weight: ["profile", "weight"] as const,
};

export function useGetBodyWeight() {
  return useQuery({ queryKey: profileQueryKeys.weight, queryFn: profileApi.weight });
}

export function useSaveBodyWeight() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (weight: string) => profileApi.saveWeight(weight),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: profileQueryKeys.weight }),
  });
}
