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

interface GenerateProgramRequest {
  durationWeeks: number;
  frequency: number;
}

interface GenerateProgramResponse {
  success: boolean;
  program: ProgramSummary;
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
