import { request } from "./index";
import { useQuery } from "@tanstack/react-query";

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

export const exercisesApi = {
  list: () => request<{ exercises: Exercise[] }>("/api/exercises"),
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
