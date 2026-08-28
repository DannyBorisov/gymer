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

export interface RowUpdate {
  rowIndex: number;
  weight: string;
  repsAchieved: string;
  rirAchieved: string;
  notes: string;
}

export const programsApi = {
  list: () => request<{ programs: ProgramSummary[] }>("/api/programs"),
  get: <T = unknown>(id: string) => request<ProgramResponse<T>>(`/api/programs/${id}`),
  create: <T>(program: T) => request<{ success: boolean; url?: string }>("/api/program/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(program),
  }),
  updateRows: (id: string, updates: RowUpdate[], completedDate?: string, dateRowIndex?: number, duration?: string) => request<void>(`/api/programs/${id}/rows`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ updates, ...(completedDate && { completedDate, dateRowIndex, duration }) }),
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

export function useUpdateProgramRows() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates, completedDate, dateRowIndex, duration }: {
      id: string;
      updates: RowUpdate[];
      completedDate?: string;
      dateRowIndex?: number;
      duration?: string;
    }) => programsApi.updateRows(id, updates, completedDate, dateRowIndex, duration),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: programQueryKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: programQueryKeys.list });
    },
  });
}
