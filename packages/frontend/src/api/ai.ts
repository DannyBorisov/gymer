import { request } from "./index";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { programQueryKeys, type ProgramSummary } from "./programs";

interface WorkoutTipRequest {
  programId: string;
  week: number;
  workoutName: string;
}

interface WorkoutTipResponse {
  tip: string;
}

interface GenerateProgramRequest {
  durationWeeks: number;
  frequency: number;
}

interface GenerateProgramResponse {
  success: boolean;
  program: ProgramSummary;
}

export function useGetWorkoutTip() {
  return useMutation({
    mutationFn: (payload: WorkoutTipRequest) =>
      request<WorkoutTipResponse>("/api/ai/workout-tip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
  });
}

export function useGenerateAiProgram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: GenerateProgramRequest) =>
      request<GenerateProgramResponse>("/api/ai/generate-program", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: programQueryKeys.list });
    },
  });
}

interface PlateauAdviceRequest {
  exercise: string;
}

interface PlateauAdviceResponse {
  advice: string;
}

export function useGetPlateauAdvice() {
  return useMutation({
    mutationFn: (payload: PlateauAdviceRequest) =>
      request<PlateauAdviceResponse>("/api/ai/plateau-advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
  });
}
