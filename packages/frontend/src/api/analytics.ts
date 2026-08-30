import { request } from "./index";
import { useQuery } from "@tanstack/react-query";

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

export interface ExerciseBest {
  weight: number;
  reps: number;
  e1rm: number;
}

export const analyticsApi = {
  progression: () => request<{ exercises: ExerciseProgression[] }>("/api/analytics/progression"),
  bests: () => request<{ bests: Record<string, ExerciseBest> }>("/api/analytics/bests"),
};

export const analyticsQueryKeys = {
  progression: ["analytics", "progression"] as const,
  bests: ["analytics", "bests"] as const,
};

export function useGetAnalyticsProgression() {
  return useQuery({ queryKey: analyticsQueryKeys.progression, queryFn: analyticsApi.progression });
}

export function useGetExerciseBests() {
  return useQuery({ queryKey: analyticsQueryKeys.bests, queryFn: analyticsApi.bests });
}
