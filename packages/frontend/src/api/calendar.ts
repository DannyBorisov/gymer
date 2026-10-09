import { request } from "./index";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface CalendarNote {
  id: string;
  date: string; // YYYY-MM-DD
  note: string;
}

export const calendarApi = {
  getNotes: (year: number, month: number) =>
    request<{ notes: CalendarNote[] }>(`/api/calendar/notes?year=${year}&month=${month}`),
  saveNote: (date: string, note: string) =>
    request<{ note: CalendarNote }>("/api/calendar/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, note }),
    }),
  deleteNote: (date: string) =>
    request<{ success: boolean }>(`/api/calendar/notes/${date}`, {
      method: "DELETE",
    }),
};

export const calendarQueryKeys = {
  notes: (year: number, month: number) => ["calendar", "notes", year, month] as const,
};

export function useGetCalendarNotes(year: number, month: number) {
  return useQuery({
    queryKey: calendarQueryKeys.notes(year, month),
    queryFn: () => calendarApi.getNotes(year, month),
  });
}

export function useSaveCalendarNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ date, note }: { date: string; note: string }) =>
      calendarApi.saveNote(date, note),
    onSuccess: (_, { date }) => {
      const [year, month] = date.split("-").map(Number);
      queryClient.invalidateQueries({ queryKey: calendarQueryKeys.notes(year, month) });
    },
  });
}

export function useDeleteCalendarNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (date: string) => calendarApi.deleteNote(date),
    onSuccess: (_, date) => {
      const [year, month] = date.split("-").map(Number);
      queryClient.invalidateQueries({ queryKey: calendarQueryKeys.notes(year, month) });
    },
  });
}
