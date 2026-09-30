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

export interface AnalyticsSummary {
  strengthChange: {
    percentChange: number;
    periodWeeks: number;
    direction: "up" | "down" | "stable";
  };
  volumeChange: {
    percentChange: number;
    periodWeeks: number;
    direction: "up" | "down" | "stable";
  };
  consistency: {
    workoutsThisWeek: number;
    workoutsThisMonth: number;
  };
}

export interface RepPR {
  weight: number;
  date: string;
}

export interface ExerciseRecords {
  exercise: string;
  records: {
    e1rm: { value: number; date: string; weight: number; reps: number };
    maxWeight: { value: number; date: string; reps: number };
    repPRs: Record<number, RepPR>;
  };
  recentPRs: Array<{
    type: "e1rm" | "weight" | "reps";
    value: number;
    date: string;
    description: string;
  }>;
}

export interface MuscleGroupVolumeEntry {
  muscleGroup: string;
  sets: number;
  volume: number;
}

export interface MuscleGroupVolume {
  period: "week" | "month";
  groups: MuscleGroupVolumeEntry[];
}

export interface WeeklyHistoryEntry {
  weekStart: string;
  workoutsCompleted: number;
}

export interface WorkoutConsistency {
  totalWorkouts: number;
  workoutsThisWeek: number;
  workoutsThisMonth: number;
  streak: number;
  weeklyHistory: WeeklyHistoryEntry[];
}

export interface MuscleRecoveryEntry {
  muscleGroup: string;
  fatiguePercent: number;
  hoursToRecovery: number;
  lastTrained: string | null;
  sets: number;
}

export const analyticsApi = {
  progression: () => request<{ exercises: ExerciseProgression[] }>("/api/analytics/progression"),
  bests: () => request<{ bests: Record<string, ExerciseBest> }>("/api/analytics/bests"),
  summary: () => request<{ summary: AnalyticsSummary }>("/api/analytics/summary"),
  records: () => request<{ records: ExerciseRecords[] }>("/api/analytics/records"),
  consistency: () => request<{ consistency: WorkoutConsistency }>("/api/analytics/consistency"),
  volume: (period: "week" | "month" = "week") =>
    request<{ volume: MuscleGroupVolume }>(`/api/analytics/volume?period=${period}`),
  recovery: () => request<{ recovery: MuscleRecoveryEntry[] }>("/api/analytics/recovery"),
};

export const analyticsQueryKeys = {
  progression: ["analytics", "progression"] as const,
  bests: ["analytics", "bests"] as const,
  summary: ["analytics", "summary"] as const,
  records: ["analytics", "records"] as const,
  consistency: ["analytics", "consistency"] as const,
  volume: (period: "week" | "month") => ["analytics", "volume", period] as const,
  recovery: ["analytics", "recovery"] as const,
};

export function useGetAnalyticsProgression(enabled = true) {
  return useQuery({ queryKey: analyticsQueryKeys.progression, queryFn: analyticsApi.progression, enabled });
}

export function useGetExerciseBests(enabled = true) {
  return useQuery({
    queryKey: analyticsQueryKeys.bests,
    queryFn: analyticsApi.bests,
    enabled,
  });
}

export function useGetAnalyticsSummary(enabled = true) {
  return useQuery({
    queryKey: analyticsQueryKeys.summary,
    queryFn: analyticsApi.summary,
    enabled,
  });
}

export function useGetPersonalRecords() {
  return useQuery({
    queryKey: analyticsQueryKeys.records,
    queryFn: analyticsApi.records,
  });
}

export function useGetWorkoutConsistency() {
  return useQuery({
    queryKey: analyticsQueryKeys.consistency,
    queryFn: analyticsApi.consistency,
  });
}

export function useGetMuscleGroupVolume(period: "week" | "month" = "week", enabled = true) {
  return useQuery({
    queryKey: analyticsQueryKeys.volume(period),
    queryFn: () => analyticsApi.volume(period),
    enabled,
  });
}

export function useGetMuscleRecovery(enabled = true) {
  return useQuery({
    queryKey: analyticsQueryKeys.recovery,
    queryFn: analyticsApi.recovery,
    enabled,
  });
}
