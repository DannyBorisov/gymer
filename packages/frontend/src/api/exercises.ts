import { request } from "./index";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export type MuscleGroup =
  | "ABS"
  | "BACK"
  | "BICEPS"
  | "CHEST"
  | "LEGS"
  | "SHOULDERS"
  | "TRICEPS";

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  variant: string[];
}

export interface CreateExerciseRequest {
  name: string;
  muscleGroup: MuscleGroup;
}

export const exercisesApi = {
  list: () => request<{ exercises: Exercise[] }>("/api/exercises"),
  create: (payload: CreateExerciseRequest) =>
    request<{ exercise: Exercise }>("/api/exercises", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
};

export const exercisesQueryKeys = {
  exercises: ["exercises"] as const,
};

export function useExercises() {
  return useQuery({
    queryKey: exercisesQueryKeys.exercises,
    queryFn: exercisesApi.list,
    staleTime: Infinity,
  });
}

export function useCreateExercise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: exercisesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: exercisesQueryKeys.exercises });
    },
  });
}
