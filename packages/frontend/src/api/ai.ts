import { request } from "./index";
import { useMutation } from "@tanstack/react-query";

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
