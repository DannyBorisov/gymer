import type { RouteHandler } from "fastify";
import { getAuthSession } from "../middlewares/auth.js";
import { createGSQL } from "../dal/index.js";
import { formatDate } from "../dal/utils/dateUtils.js";
import type { CreateQuickWorkoutInput } from "../dal/types.js";

export const getExercises: RouteHandler = async function (request, reply) {
  const { tokens } = getAuthSession(request);

  try {
    const gsql = createGSQL(tokens, this.sheets);
    const exercises = await gsql.analytics.getExerciseNames();
    return { exercises };
  } catch (error) {
    this.log.error(error);
    return reply.status(500).send({ error: "Failed to fetch exercises" });
  }
};

export const saveQuickWorkout: RouteHandler<{
  Body: CreateQuickWorkoutInput;
}> = async function (request, reply) {
  const { tokens } = getAuthSession(request);
  const { workoutId, duration, sets } = request.body;

  if (!workoutId || !sets || sets.length === 0) {
    return reply.status(400).send({ error: "Missing required fields" });
  }

  try {
    const gsql = createGSQL(tokens, this.sheets);
    const workout = await gsql.quickWorkouts.create(request.body);
    return { success: true, workout };
  } catch (error) {
    this.log.error(error);
    return reply.status(500).send({ error: "Failed to save quick workout" });
  }
};

export const getWorkoutDetail: RouteHandler<{
  Params: { id: string };
  Querystring: {
    type: string;
    programId?: string;
    week?: string;
    workout?: string;
  };
}> = async function (request, reply) {
  const { tokens } = getAuthSession(request);
  const { id } = request.params;
  const { type, programId, week, workout: workoutName } = request.query;

  try {
    const gsql = createGSQL(tokens, this.sheets);

    if (type === "quick") {
      const workout = await gsql.quickWorkouts.find(id);
      if (!workout) {
        return reply.status(404).send({ error: "Quick workout not found" });
      }

      // Group sets by exercise
      const exerciseMap = new Map<string, typeof workout.sets>();
      for (const set of workout.sets) {
        if (!exerciseMap.has(set.exercise)) {
          exerciseMap.set(set.exercise, []);
        }
        exerciseMap.get(set.exercise)!.push(set);
      }

      const exercises = Array.from(exerciseMap.entries()).map(
        ([name, sets]) => ({
          name,
          sets: sets
            .sort((a, b) => a.set - b.set)
            .map((s) => ({
              exercise: s.exercise,
              set: s.set,
              weight: String(s.weight || ""),
              reps: String(s.reps || ""),
              rir: s.rir || "",
              notes: s.notes || "",
            })),
        }),
      );

      return {
        date: formatDate(workout.date),
        duration: workout.duration || "",
        exercises,
      };
    }

    if (type === "program" && programId && week && workoutName) {
      const program = await gsql.programs.find(programId);
      if (!program) {
        return reply.status(404).send({ error: "Program not found" });
      }

      const weekNum = parseInt(week, 10);
      const workout = program.workouts.find(
        (w) => w.week === weekNum && w.name === workoutName,
      );

      if (!workout) {
        return reply.status(404).send({ error: "Workout not found" });
      }

      const exercises = workout.exercises.map((ex) => ({
        name: ex.variant ? `${ex.name} (${ex.variant})` : ex.name,
        sets: ex.sets.map((s, i) => ({
          exercise: ex.variant ? `${ex.name} (${ex.variant})` : ex.name,
          set: i + 1,
          weight:
            s.achievedWeight !== undefined ? String(s.achievedWeight) : "",
          reps: s.achievedReps !== undefined ? String(s.achievedReps) : "",
          rir: s.achievedRir || "",
          notes: s.notes || "",
        })),
      }));

      return {
        date: workout.date ? formatDate(workout.date) : "",
        duration: workout.duration || "",
        exercises,
      };
    }

    return reply.status(400).send({ error: "Invalid parameters" });
  } catch (error) {
    this.log.error(error);
    return reply.status(500).send({ error: "Failed to fetch workout details" });
  }
};

export const getWorkoutHistory: RouteHandler = async function (request, reply) {
  const { tokens } = getAuthSession(request);

  try {
    const gsql = createGSQL(tokens, this.sheets);
    const programs = await gsql.programs.findAll();

    const programsPromises = programs.map(({ id }) => gsql.programs.find(id));
    const programDetails = await Promise.all(programsPromises);

    const completeWorkouts = programDetails.flatMap((pd) =>
      pd?.workouts
        .filter((w) => !!w.date)
        .sort(
          (a, b) => new Date(b.date!).getTime() - new Date(a.date!).getTime(),
        ),
    );

    console.log(completeWorkouts);

    return { workouts: completeWorkouts };
  } catch (error) {
    this.log.error(error);
    return reply.status(500).send({ error: "Failed to fetch workout history" });
  }
};
