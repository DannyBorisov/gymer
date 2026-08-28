import { request } from "./index";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface WorkoutHistoryItem {
  id: string;
  date: string;
  name: string;
  type: "quick" | "program";
  duration?: string;
  exerciseCount: number;
  programId?: string;
}

export interface WorkoutDetail {
  date: string;
  duration: string;
  exercises: {
    name: string;
    sets: {
      exercise: string;
      set: number;
      weight: string;
      reps: string;
      rir: string;
      notes: string;
    }[];
  }[];
}

export const workoutsApi = {
  history: () => request<{ workouts: WorkoutHistoryItem[] }>("/api/workouts/history"),
  get: (id: string, type: WorkoutHistoryItem["type"], params = "") => request<WorkoutDetail>(`/api/workouts/${encodeURIComponent(id)}?type=${type}${params}`),
  quickExercises: () => request<{ exercises: string[] }>("/api/quick-workouts/exercises"),
  saveQuick: (payload: unknown) => request<void>("/api/quick-workouts/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }),
};

export const workoutQueryKeys = {
  history: ["workouts", "history"] as const,
  detail: (id: string, type: WorkoutHistoryItem["type"]) => ["workouts", "detail", type, id] as const,
  quickExercises: ["workouts", "quickExercises"] as const,
};

export function useGetWorkoutHistory() {
  return useQuery({ queryKey: workoutQueryKeys.history, queryFn: workoutsApi.history });
}

export function useGetWorkout(id: string | undefined, type: WorkoutHistoryItem["type"] | undefined, params = "") {
  return useQuery({
    queryKey: id && type ? workoutQueryKeys.detail(id, type) : ["workouts", "detail", "empty"],
    queryFn: () => workoutsApi.get(id!, type!, params),
    enabled: Boolean(id && type),
  });
}

export function useGetQuickWorkoutExercises() {
  return useQuery({ queryKey: workoutQueryKeys.quickExercises, queryFn: workoutsApi.quickExercises });
}

export function useSaveQuickWorkout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: unknown) => workoutsApi.saveQuick(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workoutQueryKeys.history }),
  });
}
