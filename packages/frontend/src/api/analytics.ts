import { request } from "./index";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface ProgressionEntry {
  date: string;
  weight: number;
  reps: number;
  sets: number;
  e1rm?: number;
}

export interface ExerciseProgression {
  exercise: string;
  entries: ProgressionEntry[];
}

export interface OneRepMaxRecord {
  date: string;
  exercise: string;
  weight: number;
}

export interface ExerciseBest {
  weight: number;
  reps: number;
  e1rm: number;
}

export const analyticsApi = {
  progression: () => request<{ exercises: ExerciseProgression[] }>("/api/analytics/progression"),
  bests: () => request<{ bests: Record<string, ExerciseBest> }>("/api/analytics/bests"),
  oneRm: () => request<{ records: OneRepMaxRecord[]; bestByExercise: OneRepMaxRecord[] }>("/api/analytics/1rm"),
  saveOneRm: (exercise: string, weight: number) => request<void>("/api/analytics/1rm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ exercise, weight }),
  }),
};

export const analyticsQueryKeys = {
  progression: ["analytics", "progression"] as const,
  bests: ["analytics", "bests"] as const,
  oneRm: ["analytics", "oneRm"] as const,
};

export function useGetAnalyticsProgression() {
  return useQuery({ queryKey: analyticsQueryKeys.progression, queryFn: analyticsApi.progression });
}

export function useGetExerciseBests() {
  return useQuery({ queryKey: analyticsQueryKeys.bests, queryFn: analyticsApi.bests });
}

export function useGetOneRepMaxRecords() {
  return useQuery({ queryKey: analyticsQueryKeys.oneRm, queryFn: analyticsApi.oneRm });
}

export function useSaveOneRepMax() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ exercise, weight }: { exercise: string; weight: number }) =>
      analyticsApi.saveOneRm(exercise, weight),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: analyticsQueryKeys.oneRm }),
  });
}
