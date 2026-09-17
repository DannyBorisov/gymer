import { request } from "./index";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface ProgramSummary {
  id: string;
  name: string;
  createdTime?: string;
  modifiedTime?: string;
  url?: string;
}

export interface ProgramResponse<T = unknown> {
  program: T;
  name?: string;
}

// Prisma-like where clauses
export interface ExerciseWhere {
  name: string;
  set?: number; // 0-based set index
}

export interface WorkoutWhere {
  name: string;
  exercise?: ExerciseWhere;
}

export interface ProgramWhere {
  week: number;
  workout?: WorkoutWhere;
}

// Update data types
export interface SetUpdateData {
  achievedWeight?: number;
  achievedReps?: number;
  achievedRir?: string;
  notes?: string;
}

export interface WorkoutUpdateData {
  date?: string; // ISO date
  duration?: string;
}

export interface ProgramUpdateInput {
  where: ProgramWhere;
  data: SetUpdateData | WorkoutUpdateData;
}

export const programsApi = {
  list: () => request<{ programs: ProgramSummary[] }>("/api/programs"),
  get: <T = unknown>(id: string) => request<ProgramResponse<T>>(`/api/programs/${id}`),
  create: <T>(program: T) => request<{ success: boolean; program: ProgramSummary }>("/api/programs/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(program),
  }),
  update: (id: string, input: ProgramUpdateInput | ProgramUpdateInput[]) => request<{ success: boolean }>(`/api/programs/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }),
  delete: (id: string) => request<{ success: boolean }>(`/api/programs/${id}`, {
    method: "DELETE",
  }),
  copy: (id: string) => request<{ success: boolean; program: ProgramSummary }>(`/api/programs/${id}/copy`, {
    method: "POST",
  }),
  rename: (id: string, name: string) => request<{ success: boolean; program: ProgramSummary }>(`/api/programs/${id}/rename`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  }),
  addSet: (
    id: string,
    week: number,
    workoutName: string,
    exerciseName: string,
    targetReps?: number,
    targetRir?: string,
  ) =>
    request<{ success: boolean }>(`/api/programs/${id}/add-set`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ week, workoutName, exerciseName, targetReps, targetRir }),
    }),
};

export const programQueryKeys = {
  all: ["programs"] as const,
  list: ["programs", "list"] as const,
  detail: (id: string) => ["programs", "detail", id] as const,
};

export function useGetPrograms() {
  return useQuery({ queryKey: programQueryKeys.list, queryFn: programsApi.list });
}

export function useGetProgram<T = unknown>(id: string | undefined) {
  return useQuery({
    queryKey: id ? programQueryKeys.detail(id) : ["programs", "detail", "empty"],
    queryFn: () => programsApi.get<T>(id!),
    enabled: Boolean(id),
  });
}

export function useCreateProgram<T>() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (program: T) => programsApi.create(program),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: programQueryKeys.list }),
  });
}

export function useDeleteProgram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => programsApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: programQueryKeys.list }),
  });
}

export function useCopyProgram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => programsApi.copy(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: programQueryKeys.list }),
  });
}

export function useRenameProgram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => programsApi.rename(id, name),
    // Awaited so isPending stays true until the list has actually refetched —
    // otherwise the loader would disappear before the new name shows up.
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: programQueryKeys.detail(variables.id) }),
        queryClient.invalidateQueries({ queryKey: programQueryKeys.list }),
      ]);
    },
  });
}

export function useAddSet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      week,
      workoutName,
      exerciseName,
      targetReps,
      targetRir,
    }: {
      id: string;
      week: number;
      workoutName: string;
      exerciseName: string;
      targetReps?: number;
      targetRir?: string;
    }) => programsApi.addSet(id, week, workoutName, exerciseName, targetReps, targetRir),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: programQueryKeys.detail(variables.id) });
    },
  });
}

export function useUpdateProgram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: ProgramUpdateInput | ProgramUpdateInput[];
    }) => programsApi.update(id, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: programQueryKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: programQueryKeys.list });
      queryClient.invalidateQueries({ queryKey: ["workouts", "history"] });
    },
  });
}
