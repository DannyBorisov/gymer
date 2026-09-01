import type { RouteHandler } from "fastify";
import { getAuthSession } from "../middlewares/auth.js";
import { createGSQL } from "../dal/index.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const coachPromptPath = join(__dirname, "../prompts/workout-coach.md");
const COACH_PROMPT = readFileSync(coachPromptPath, "utf-8");

interface WorkoutTipRequest {
  programId: string;
  week: number;
  workoutName: string;
}

export const getWorkoutTip: RouteHandler<{
  Body: WorkoutTipRequest;
}> = async function (request, reply) {
  const { tokens } = getAuthSession(request);
  const { programId, week, workoutName } = request.body;

  try {
    const gsql = createGSQL(tokens, this.sheets);
    const program = await gsql.programs.find(programId);

    if (!program) {
      return reply.status(404).send({ error: "Program not found" });
    }

    // Find the current workout
    const currentWorkout = program.workouts.find(
      (w) => w.week === week && w.name === workoutName,
    );

    if (!currentWorkout) {
      return reply.status(404).send({ error: "Workout not found" });
    }

    // Helper to format exercise name with variant
    const formatExerciseName = (ex: { name: string; variant?: string }) =>
      ex.variant ? `${ex.name} (${ex.variant})` : ex.name;

    // 1. All workouts in the current week (for context on what else is planned)
    const currentWeekWorkouts = program.workouts
      .filter((w) => w.week === week)
      .map((w) => ({
        name: w.name,
        isToday: w.name === workoutName,
        completed: !!w.date,
        exercises: w.exercises.map(formatExerciseName),
      }));

    // 2. Last 4 instances of today's workout (deeper history)
    const workoutHistory = program.workouts
      .filter((w) => w.name === workoutName && w.week < week && w.date)
      .sort((a, b) => b.week - a.week)
      .slice(0, 4)
      .map((w) => ({
        week: w.week,
        date: w.date,
        exercises: w.exercises.map((ex) => ({
          name: formatExerciseName(ex),
          sets: ex.sets.map((s) => ({
            weight: s.achievedWeight,
            reps: s.achievedReps,
            rir: s.achievedRir,
            notes: s.notes,
          })),
        })),
      }));

    // 3. Most recent completed workout (what they did last, regardless of type)
    const [lastCompletedWorkout] = program.workouts
      .filter((w) => w.date && !(w.week === week && w.name === workoutName))
      .sort(
        (a, b) => new Date(b.date!).getTime() - new Date(a.date!).getTime(),
      );

    const recentWorkout = lastCompletedWorkout
      ? {
          name: lastCompletedWorkout.name,
          week: lastCompletedWorkout.week,
          date: lastCompletedWorkout.date,
          exercises: lastCompletedWorkout.exercises.map((ex) => ({
            name: formatExerciseName(ex),
            sets: ex.sets.map((s) => ({
              weight: s.achievedWeight,
              reps: s.achievedReps,
              rir: s.achievedRir,
              notes: s.notes,
            })),
          })),
        }
      : null;

    // 4. Get previous tips to avoid repetition
    const previousTips = await gsql.aiTips.findRecent(10);
    const previousTipsList = previousTips.map((t) => t.tip);

    // Build context for the AI
    const workoutContext = {
      todaysWorkout: {
        name: currentWorkout.name,
        week: currentWorkout.week,
        exercises: currentWorkout.exercises.map((ex) => ({
          name: formatExerciseName(ex),
          sets: ex.sets.map((s) => ({
            targetReps: s.targetReps,
            targetRir: s.targetRir,
          })),
        })),
      },
      currentWeekPlan: currentWeekWorkouts,
      workoutHistory,
      mostRecentSession: recentWorkout,
    };

    const userPrompt = `
USER'S WORKOUT DATA:

TODAY'S WORKOUT (Week ${week} - ${workoutName}):
${JSON.stringify(workoutContext.todaysWorkout, null, 2)}

THIS WEEK'S PLAN (shows what else they're doing this week):
${JSON.stringify(workoutContext.currentWeekPlan, null, 2)}

HISTORY OF THIS WORKOUT (last 4 times they did "${workoutName}"):
${JSON.stringify(workoutContext.workoutHistory, null, 2)}

MOST RECENT SESSION (what they did last, might affect recovery):
${JSON.stringify(workoutContext.mostRecentSession, null, 2)}

PREVIOUS TIPS GIVEN (do NOT repeat these, give something fresh):
${previousTipsList.length > 0 ? previousTipsList.map((t, i) => `${i + 1}. ${t}`).join("\n") : "None yet"}

Based on this data, provide ONE short, insightful tip for today's workout. Make sure it's different from the previous tips.
`;
    const fullPrompt = `${COACH_PROMPT}\n\n---\n\n${userPrompt}`;

    console.log(fullPrompt);

    const tip = await this.genai.generateContent(fullPrompt);
    await gsql.aiTips.create({ programName: program.name, workoutName, tip });

    return { tip };
  } catch (error) {
    this.log.error(error);
    return reply.status(500).send({ error: "Failed to generate workout tip" });
  }
};
