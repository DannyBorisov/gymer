import type { Program, Exercise } from "../types/program";

let counter = 0;

/** A process-unique id for a freshly added exercise. */
export const newExerciseId = (): string => `ex-${Date.now().toString(36)}-${counter++}`;

/** Ensure every exercise in the program carries a stable id (presets don't). */
export const withExerciseIds = (program: Program): Program => ({
  ...program,
  workouts: program.workouts.map((workout) => ({
    ...workout,
    exercises: workout.exercises.map((exercise) =>
      exercise.id ? exercise : { ...exercise, id: newExerciseId() },
    ),
  })),
});

/** Drop the client-only id before sending to the API. */
export const stripExerciseId = ({ id: _id, ...rest }: Exercise): Exercise => rest;
