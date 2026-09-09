import { request } from "./index";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type Goal = "LOSE_FAT" | "BUILD_MUSCLE" | "MAINTAIN" | "GAIN_STRENGTH";
export type Gender = "MALE" | "FEMALE" | "OTHER";

export interface Onboarding {
  weight: number;
  height: number;
  age: number;
  gender: Gender;
  goal: Goal;
  isComplete: boolean;
}

export type OnboardingInput = Omit<Onboarding, "isComplete">;

export const onboardingApi = {
  get: () => request<{ onboarding: Onboarding | null }>("/api/onboarding"),
  save: (data: OnboardingInput) =>
    request<{ onboarding: Onboarding }>("/api/onboarding", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, isComplete: true }),
    }),
};

export const onboardingQueryKeys = {
  onboarding: ["onboarding"] as const,
};

export function useGetOnboarding() {
  return useQuery({
    queryKey: onboardingQueryKeys.onboarding,
    queryFn: onboardingApi.get,
  });
}

export function useSaveOnboarding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: OnboardingInput) => onboardingApi.save(data),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: onboardingQueryKeys.onboarding,
      }),
  });
}
