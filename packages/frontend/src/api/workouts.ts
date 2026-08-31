import { request } from "./index";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface WorkoutSet {
  targetReps: number;
  targetRir: string;
  achievedWeight?: number;
  achievedReps?: number;
  achievedRir?: string;
  notes?: string;
}

export interface WorkoutExercise {
  name: string;
  variant?: string;
  sets: WorkoutSet[];
}

export interface Workout {
  name: string;
  week: number;
  date?: string;
  duration?: string;
  exercises: WorkoutExercise[];
}

export const workoutsApi = {
  history: () => request<{ workouts: Workout[] }>("/api/workouts/history"),
  quickExercises: () =>
    request<{ exercises: string[] }>("/api/quick-workouts/exercises"),
  saveQuick: (payload: unknown) =>
    request<void>("/api/quick-workouts/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
};

export const workoutQueryKeys = {
  history: ["workouts", "history"] as const,
  quickExercises: ["workouts", "quickExercises"] as const,
};

export function useGetWorkoutHistory() {
  return useQuery({
    queryKey: workoutQueryKeys.history,
    queryFn: workoutsApi.history,
  });
}

export function useGetQuickWorkoutExercises() {
  return useQuery({
    queryKey: workoutQueryKeys.quickExercises,
    queryFn: workoutsApi.quickExercises,
  });
}

export function useSaveQuickWorkout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: unknown) => workoutsApi.saveQuick(payload),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: workoutQueryKeys.history }),
  });
}
