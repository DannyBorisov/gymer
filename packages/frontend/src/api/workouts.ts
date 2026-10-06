import { request } from "./index";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type SetType = "working" | "warmup";

export interface WorkoutSet {
  targetReps: number;
  targetRir: string;
  targetRestTime?: number;
  achievedWeight?: number;
  achievedReps?: number;
  achievedRir?: string;
  achievedRestTime?: number;
  notes?: string;
  setType?: SetType;
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
  programName?: string;
}

export interface QuickWorkoutSet {
  exercise: string;
  set: number;
  weight: string;
  reps: string;
  rir: string;
  notes: string;
}

export interface QuickWorkoutPayload {
  workoutId: string;
  duration: string;
  date?: string;
  sets: QuickWorkoutSet[];
}

export interface TemplateExercise {
  name: string;
  sets: number;
  reps: number;
  rir: number;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  exercises: TemplateExercise[];
  createdAt: string;
}

export const workoutsApi = {
  history: () => request<{ workouts: Workout[] }>("/api/workouts/history"),
  quickExercises: () =>
    request<{ exercises: string[] }>("/api/quick-workouts/exercises"),
  saveQuick: (payload: QuickWorkoutPayload) =>
    request<void>("/api/quick-workouts/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  templates: () =>
    request<{ templates: WorkoutTemplate[] }>("/api/workout-templates"),
  createTemplate: (data: { name: string; exercises: TemplateExercise[] }) =>
    request<{ template: WorkoutTemplate }>("/api/workout-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  deleteTemplate: (id: string) =>
    request<void>(`/api/workout-templates/${id}`, { method: "DELETE" }),
};

export const workoutQueryKeys = {
  history: ["workouts", "history"] as const,
  quickExercises: ["workouts", "quickExercises"] as const,
  templates: ["workouts", "templates"] as const,
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
    mutationFn: (payload: QuickWorkoutPayload) => workoutsApi.saveQuick(payload),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: workoutQueryKeys.history }),
  });
}

export function useGetWorkoutTemplates() {
  return useQuery({
    queryKey: workoutQueryKeys.templates,
    queryFn: workoutsApi.templates,
  });
}

export function useCreateWorkoutTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; exercises: TemplateExercise[] }) =>
      workoutsApi.createTemplate(data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: workoutQueryKeys.templates }),
  });
}

export function useDeleteWorkoutTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => workoutsApi.deleteTemplate(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: workoutQueryKeys.templates }),
  });
}
