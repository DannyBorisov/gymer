import type { RouteHandler } from "fastify";
import { getAuthSession } from "../middlewares/auth.js";
import { createGSQL, prisma, AiGenerationType } from "../dal/index.js";
import type { CreateProgramInput } from "../dal/gsql/types.js";
import type {
  WorkoutTipBodyType,
  WorkoutChatBodyType,
  GenerateProgramBodyType,
  PlateauAdviceBodyType,
} from "../schemas/ai.js";
import { formatExerciseName } from "../dal/gsql/utils/parser.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const coachPromptPath = join(__dirname, "../agents/workout-coach.md");
const COACH_PROMPT = readFileSync(coachPromptPath, "utf-8");

const chatCoachPromptPath = join(__dirname, "../agents/workout-chat.md");
const CHAT_COACH_PROMPT = readFileSync(chatCoachPromptPath, "utf-8");

const programGeneratorPromptPath = join(
  __dirname,
  "../agents/program-generator.md",
);
const PROGRAM_GENERATOR_PROMPT = readFileSync(
  programGeneratorPromptPath,
  "utf-8",
);

const plateauAdvicePromptPath = join(
  __dirname,
  "../agents/plateau-advice.md",
);
const PLATEAU_ADVICE_PROMPT = readFileSync(plateauAdvicePromptPath, "utf-8");

export const getWorkoutTip: RouteHandler<{
  Body: WorkoutTipBodyType;
}> = async function (request, reply) {
  const { tokens, user } = getAuthSession(request);
  const { programId, week, workoutName } = request.body;

  try {
    const gsql = createGSQL(tokens, this.sheets);
    const program = await gsql.programs.find(programId);

    if (!program) {
      return reply.status(404).send({ error: "Program not found" });
    }

    const currentWorkout = program.workouts.find(
      (w) => w.week === week && w.name === workoutName,
    );

    if (!currentWorkout) {
      return reply.status(404).send({ error: "Workout not found" });
    }

    const fmtEx = (ex: { name: string; variant?: string }) =>
      formatExerciseName(ex.name, ex.variant);

    const currentWeekWorkouts = program.workouts
      .filter((w) => w.week === week)
      .map((w) => ({
        name: w.name,
        isToday: w.name === workoutName,
        completed: !!w.date,
        exercises: w.exercises.map(fmtEx),
      }));

    const workoutHistory = program.workouts
      .filter((w) => w.name === workoutName && w.week < week && w.date)
      .sort((a, b) => b.week - a.week)
      .slice(0, 4)
      .map((w) => ({
        week: w.week,
        date: w.date,
        exercises: w.exercises.map((ex) => ({
          name: fmtEx(ex),
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
            name: fmtEx(ex),
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
    const previousTips = user?.email
      ? await prisma.aiGenerations.findRecent(
          user.email,
          AiGenerationType.CouchCue,
          10,
        )
      : [];
    const previousTipsList = previousTips.map((t) => t.content);

    // Build context for the AI
    const workoutContext = {
      todaysWorkout: {
        name: currentWorkout.name,
        week: currentWorkout.week,
        exercises: currentWorkout.exercises.map((ex) => ({
          name: fmtEx(ex),
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

RECENT COACHING TIPS (avoid their angle and wording):
${JSON.stringify(previousTipsList, null, 2)}

Based on this data, provide ONE short, insightful tip for today's workout. Make sure it's different from the previous tips.
`;
    const fullPrompt = `${COACH_PROMPT}\n\n---\n\n${userPrompt}`;

    const tip = await this.genai.generateWorkoutTip(fullPrompt);
    if (user?.email) {
      await prisma.aiGenerations.create(user.email, {
        type: AiGenerationType.CouchCue,
        content: tip,
      });
    }

    return { tip };
  } catch (error) {
    this.log.error(error);
    return reply.status(500).send({ error: "Failed to generate workout tip" });
  }
};

export const postWorkoutChat: RouteHandler<{
  Body: WorkoutChatBodyType;
}> = async function (request, reply) {
  const {
    week,
    workoutName,
    message,
    currentExercise,
    currentSetIndex,
    workoutData,
    conversationHistory,
  } = request.body;

  try {
    // Build context from the data passed by the frontend (no Google Sheets fetch)
    // This avoids rate limits and is faster
    const sessionProgress = workoutData && workoutData.length > 0
      ? workoutData.map((d) => ({
          exercise: d.exercise,
          set: d.setIndex + 1,
          target: { reps: d.targetReps, rir: d.targetRir, restTime: d.targetRestTime },
          achieved: d.isComplete
            ? { weight: d.weight, reps: d.reps, rir: d.rir, restTime: d.restTime }
            : null,
          status: d.isComplete ? "DONE" : "PENDING",
        }))
      : [];

    // Group exercises for planned exercises section
    const exerciseGroups = new Map<string, { targetRestTime?: number; sets: Array<{ targetReps?: number; targetRir?: number }> }>();
    workoutData?.forEach((d) => {
      if (!exerciseGroups.has(d.exercise)) {
        exerciseGroups.set(d.exercise, { targetRestTime: d.targetRestTime, sets: [] });
      }
      exerciseGroups.get(d.exercise)!.sets.push({ targetReps: d.targetReps, targetRir: d.targetRir });
    });

    const contextPrompt = `
CURRENT WORKOUT: ${workoutName} (Week ${week})
${currentExercise ? `CURRENT EXERCISE: ${currentExercise}` : ""}
${currentSetIndex !== undefined ? `CURRENT SET: ${currentSetIndex + 1}` : ""}

TODAY'S SESSION PROGRESS:
${sessionProgress.length > 0
  ? sessionProgress.map((s) => {
      if (s.status === "DONE") {
        const rirDiff = s.target.rir !== undefined && s.achieved?.rir !== undefined
          ? s.achieved.rir - s.target.rir
          : null;
        const rirNote = rirDiff !== null
          ? rirDiff < 0
            ? ` (${Math.abs(rirDiff)} RIR UNDER target - weight was too heavy)`
            : rirDiff > 0
              ? ` (${rirDiff} RIR OVER target - weight was too light)`
              : " (hit target RIR)"
          : "";
        const restInfo = s.achieved?.restTime !== undefined
          ? `, rest ${s.achieved.restTime}s${s.target.restTime ? ` (target: ${s.target.restTime}s)` : ""}`
          : "";
        return `✓ ${s.exercise} Set ${s.set}: ${s.achieved?.weight}kg × ${s.achieved?.reps} @ RIR ${s.achieved?.rir}${rirNote}${restInfo} (target: ${s.target.reps} reps @ RIR ${s.target.rir})`;
      }
      const targetRestInfo = s.target.restTime ? `, rest ${s.target.restTime}s` : "";
      return `○ ${s.exercise} Set ${s.set}: PENDING (target: ${s.target.reps} reps @ RIR ${s.target.rir}${targetRestInfo})`;
    }).join("\n")
  : "No sets completed yet"}

PLANNED EXERCISES:
${Array.from(exerciseGroups.entries()).map(([name, data]) => {
  const restTime = data.targetRestTime ? ` (rest: ${data.targetRestTime}s)` : "";
  const sets = data.sets
    .map((s, i) => `Set ${i + 1}: ${s.targetReps} reps @ RIR ${s.targetRir}`)
    .join(", ");
  return `- ${name}${restTime}: ${sets}`;
}).join("\n")}
`;

    // Build conversation
    const messages = [
      { role: "system" as const, content: CHAT_COACH_PROMPT + "\n\n---\n\n" + contextPrompt },
      ...(conversationHistory || []).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: message },
    ];

    const response = await this.genai.chat(messages);

    return { response };
  } catch (error) {
    this.log.error(error);
    return reply.status(500).send({ error: "Failed to process chat message" });
  }
};

interface PlateauAdviceResponse {
  advice: string;
}

export const getPlateauAdvice: RouteHandler<{
  Body: PlateauAdviceBodyType;
}> = async function (request, reply) {
  const { tokens, user } = getAuthSession(request);
  const { exercise } = request.body;

  try {
    const gsql = createGSQL(tokens, this.sheets);
    const progression = await gsql.analytics.getProgression();
    const exerciseData = progression.find((p) => p.exercise === exercise);

    if (!exerciseData || exerciseData.entries.length === 0) {
      return reply.status(404).send({ error: "Exercise not found" });
    }

    // Most recent sessions first is easier for the model to reason about
    // as "what's happened lately", capped so the prompt stays small.
    const recentSessions = [...exerciseData.entries]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 8)
      .map((entry) => ({
        date: entry.date,
        weight: entry.weight,
        reps: entry.reps,
        sets: entry.sets,
        e1rm: entry.e1rm,
      }));

    const bodyWeightEntries = await gsql.bodyWeight.findAll({
      orderBy: { date: "desc" },
    });
    const currentBodyWeight = bodyWeightEntries[0]?.weight ?? null;

    const userPrompt = `
EXERCISE: ${exercise}

CURRENT BODY WEIGHT: ${currentBodyWeight ?? "unknown"}

RECENT SESSIONS (most recent first):
${JSON.stringify(recentSessions, null, 2)}

This exercise has plateaued — no new estimated-1RM high across the most
recent sessions. Explain briefly why, and give one concrete change to try
next session.
`;
    const fullPrompt = `${PLATEAU_ADVICE_PROMPT}\n\n${userPrompt}`;

    const result =
      await this.genai.generateProgram<PlateauAdviceResponse>(fullPrompt);
    const advice = result.advice?.trim();

    if (!advice) {
      throw new Error("Gemini returned plateau advice without text");
    }

    if (user?.email) {
      await prisma.aiGenerations.create(user.email, {
        type: AiGenerationType.PlateauAdvice,
        content: advice,
      });
    }

    return { advice };
  } catch (error) {
    this.log.error(error);
    return reply.status(500).send({ error: "Failed to generate plateau advice" });
  }
};

export const generateAiProgram: RouteHandler<{
  Body: GenerateProgramBodyType;
}> = async function (request, reply) {
  const { tokens, user } = getAuthSession(request);

  if (!user?.email) {
    return reply.status(401).send({ error: "Not authenticated" });
  }

  const { durationWeeks, frequency } = request.body ?? {};
  if (!durationWeeks || !frequency) {
    return reply
      .status(400)
      .send({ error: "durationWeeks and frequency are required" });
  }

  try {
    const onboarding = await prisma.onboarding.get(user.email);
    if (!onboarding) {
      return reply
        .status(400)
        .send({ error: "Complete onboarding before generating a program" });
    }

    const exercises = await prisma.exercises.findAll();
    const exercisesByMuscleGroup = exercises.reduce<Record<string, string[]>>(
      (acc, ex) => {
        const label = ex.variant.length
          ? `${ex.name} (${ex.variant.join(" / ")})`
          : ex.name;
        (acc[ex.muscleGroup] ??= []).push(label);
        return acc;
      },
      {},
    );

    const userPrompt = `
USER PROFILE:
${JSON.stringify(
  {
    weight: onboarding.weight,
    height: onboarding.height,
    age: onboarding.age,
    gender: onboarding.gender,
    goal: onboarding.goal,
    experienceLevel: onboarding.experienceLevel,
  },
  null,
  2,
)}

PROGRAM PARAMETERS (chosen by the user):
${JSON.stringify({ durationWeeks, frequency }, null, 2)}

AVAILABLE EXERCISES (grouped by muscle group — parentheses list available
variants; only pick exercises and variants from this catalog):
${JSON.stringify(exercisesByMuscleGroup, null, 2)}

Design a training program for this user.
`;
    const fullPrompt = `${PROGRAM_GENERATOR_PROMPT}\n\n---\n\n${userPrompt}`;

    const generated =
      await this.genai.generateProgram<CreateProgramInput>(fullPrompt);

    const gsql = createGSQL(tokens, this.sheets);
    const program = await gsql.programs.create(generated);

    await prisma.aiGenerations.create(user.email, {
      type: AiGenerationType.CreateProgram,
      content: JSON.stringify(generated),
    });

    return { success: true, program };
  } catch (error) {
    this.log.error(error);
    return reply.status(500).send({ error: "Failed to generate program" });
  }
};
