import type {
  Program,
  ProgramWorkout,
  Exercise,
  Frequency,
} from "../types/program";
import type { Workout as FetchedWorkout } from "../api/workouts";

interface FetchedProgram {
  name: string;
  numberOfWeeks: number;
  workouts: FetchedWorkout[];
}

const parseRir = (rirDisplay: string): number =>
  rirDisplay.trim().toLowerCase() === "to failure"
    ? 0
    : Number(rirDisplay) || 0;

// Workout occurrences beyond the base template are suffixed " #N" by
// buildProgramRows when there are more sessions per week than distinct
// workouts (see backend ProgramModel). Stripping it collapses them back to
// one editable template per base workout name.
const baseWorkoutName = (name: string): string => name.replace(/ #\d+$/, "");

/**
 * Reconstruct the compact "template" shape (workouts -> exercises ->
 * sets/reps/RIR) that the program builder edits, from the expanded,
 * per-set-row program returned by the API. Only week 1 is used as the
 * template source, since every program this app creates repeats (and,
 * for dynamic RIR, progresses) the same template across all weeks.
 *
 * This is a best-effort reconstruction, not a lossless round-trip:
 * - `frequency` is recovered as the literal weekly session count; a program
 *   originally created with "every-other-day" (which also yields 4
 *   sessions/week) will come back as `frequency: 4` since the two are
 *   indistinguishable from the generated rows alone.
 * - `dynamicRir` is inferred by comparing each exercise's week-1 RIR
 *   against its RIR in the final week; a non-monotonic custom pattern
 *   would be flattened to a static (non-dynamic) per-exercise RIR.
 */
export function reconstructProgramTemplate(fetched: FetchedProgram): Program {
  const week1 = fetched.workouts.filter((w) => w.week === 1);
  const lastWeekNum = fetched.numberOfWeeks;
  const lastWeek = fetched.workouts.filter((w) => w.week === lastWeekNum);

  const workouts: ProgramWorkout[] = [];
  const seenBaseNames = new Set<string>();

  for (const occurrence of week1) {
    const baseName = baseWorkoutName(occurrence.name);
    if (seenBaseNames.has(baseName)) continue;
    seenBaseNames.add(baseName);

    const lastWeekOccurrence = lastWeek.find(
      (w) => baseWorkoutName(w.name) === baseName,
    );

    const exercises: Exercise[] = occurrence.exercises.map((exercise) => {
      const firstSet = exercise.sets[0];
      const startingRir = firstSet ? parseRir(firstSet.targetRir) : 0;

      const lastWeekExercise = lastWeekOccurrence?.exercises.find(
        (e) => e.name === exercise.name && e.variant === exercise.variant,
      );
      const endingRir = lastWeekExercise?.sets[0]
        ? parseRir(lastWeekExercise.sets[0].targetRir)
        : startingRir;

      const isDynamicForThisExercise =
        lastWeekNum > 1 && endingRir < startingRir;

      return {
        name: exercise.name,
        variant: exercise.variant,
        sets: exercise.sets.length,
        reps: firstSet?.targetReps ?? 0,
        rir: startingRir,
        customRir: !isDynamicForThisExercise,
      };
    });

    workouts.push({ name: baseName, exercises });
  }

  // Dynamic RIR is a program-wide setting: on if any exercise showed the
  // declining pattern, using its starting RIR as the program's shared
  // starting point (matches how a single program can only have one
  // startingRir at creation time).
  const dynamicExercise = workouts
    .flatMap((w) => w.exercises)
    .find((e) => !e.customRir);
  const dynamicRir = Boolean(dynamicExercise);
  const startingRir = dynamicExercise?.rir ?? 0;

  if (dynamicRir) {
    for (const workout of workouts) {
      for (const exercise of workout.exercises) {
        if (exercise.customRir) continue;
        exercise.customRir = undefined;
      }
    }
  }

  const sessionsPerWeek = week1.length;
  const frequency = (
    sessionsPerWeek >= 1 && sessionsPerWeek <= 6 ? sessionsPerWeek : 4
  ) as Frequency;

  return {
    name: fetched.name,
    durationWeeks: fetched.numberOfWeeks,
    frequency,
    dynamicRir,
    startingRir,
    workouts,
  };
}
