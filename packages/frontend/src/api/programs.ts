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
  create: <T>(program: T) => request<{ success: boolean; url?: string }>("/api/programs/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(program),
  }),
  update: (id: string, input: ProgramUpdateInput | ProgramUpdateInput[]) => request<{ success: boolean }>(`/api/programs/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
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

export function useUpdateProgram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ProgramUpdateInput }) =>
      programsApi.update(id, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: programQueryKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: programQueryKeys.list });
    },
  });
}
