import { useState } from "react";
import type { Program, Workout, Exercise, Frequency } from "../types/program";
import { formatExerciseName } from "../types/shared";
import { newExerciseId, stripExerciseId, withExerciseIds } from "./exerciseId";

const createEmptyWorkout = (): Workout => ({
  name: "",
  exercises: [],
});

const initialProgram = (): Program => ({
  name: "",
  durationWeeks: 4,
  frequency: 4,
  dynamicRir: true,
  startingRir: 3,
  workouts: [createEmptyWorkout()],
});

export const useCreateProgram = () => {
  const [program, setProgram] = useState<Program>(initialProgram);

  const updateProgramName = (name: string) => {
    setProgram((prev) => ({ ...prev, name }));
  };

  const updateDuration = (durationWeeks: number) => {
    setProgram((prev) => ({ ...prev, durationWeeks }));
  };

  const updateFrequency = (frequency: Frequency) => {
    setProgram((prev) => ({ ...prev, frequency }));
  };

  const updateDynamicRir = (dynamicRir: boolean) => {
    setProgram((prev) => ({ ...prev, dynamicRir }));
  };

  const updateStartingRir = (startingRir: number) => {
    setProgram((prev) => ({ ...prev, startingRir }));
  };

  const addWorkout = () => {
    setProgram((prev) => ({
      ...prev,
      workouts: [...prev.workouts, createEmptyWorkout()],
    }));
  };

  const removeWorkout = (workoutIndex: number) => {
    setProgram((prev) => ({
      ...prev,
      workouts: prev.workouts.filter((_, i) => i !== workoutIndex),
    }));
  };

  const updateWorkoutName = (workoutIndex: number, name: string) => {
    setProgram((prev) => ({
      ...prev,
      workouts: prev.workouts.map((w, i) =>
        i === workoutIndex ? { ...w, name } : w,
      ),
    }));
  };

  const addExercises = (workoutIndex: number, exerciseNames: string[]) => {
    const newExercises: Exercise[] = exerciseNames.map((name) => ({
      id: newExerciseId(),
      name,
      sets: 3,
      reps: 10,
      rir: 2,
    }));
    setProgram((prev) => ({
      ...prev,
      workouts: prev.workouts.map((w, i) =>
        i === workoutIndex
          ? { ...w, exercises: [...w.exercises, ...newExercises] }
          : w,
      ),
    }));
  };

  const removeExercise = (workoutIndex: number, exerciseIndex: number) => {
    setProgram((prev) => ({
      ...prev,
      workouts: prev.workouts.map((w, wi) =>
        wi === workoutIndex
          ? {
              ...w,
              exercises: w.exercises.filter((_, ei) => ei !== exerciseIndex),
            }
          : w,
      ),
    }));
  };

  const updateExercise = (
    workoutIndex: number,
    exerciseIndex: number,
    field: keyof Exercise,
    value: string | number | boolean,
  ) => {
    setProgram((prev) => ({
      ...prev,
      workouts: prev.workouts.map((w, wi) =>
        wi === workoutIndex
          ? {
              ...w,
              exercises: w.exercises.map((e, ei) =>
                ei === exerciseIndex ? { ...e, [field]: value } : e,
              ),
            }
          : w,
      ),
    }));
  };

  /**
   * Move the exercise with `exerciseId` to `toIndex` within `toWorkoutIndex`
   * (`arrayMove` semantics: the index the row should occupy afterwards).
   * Handles same-session and cross-session; a no-op when the position is
   * unchanged, so it is safe to call repeatedly while dragging.
   */
  const moveExercise = (
    exerciseId: string,
    toWorkoutIndex: number,
    toIndex: number,
  ) => {
    setProgram((prev) => {
      const target = prev.workouts[toWorkoutIndex];
      if (!target) return prev;

      const fromWorkoutIndex = prev.workouts.findIndex((w) =>
        w.exercises.some((e) => e.id === exerciseId),
      );
      if (fromWorkoutIndex === -1) return prev;

      const source = prev.workouts[fromWorkoutIndex];
      const fromIndex = source.exercises.findIndex((e) => e.id === exerciseId);
      const moved = source.exercises[fromIndex];

      if (fromWorkoutIndex === toWorkoutIndex && fromIndex === toIndex) {
        return prev;
      }

      const remaining =
        fromWorkoutIndex === toWorkoutIndex
          ? target.exercises.filter((e) => e.id !== exerciseId)
          : target.exercises;

      const insertAt = Math.max(0, Math.min(toIndex, remaining.length));
      const nextTargetExercises = [
        ...remaining.slice(0, insertAt),
        moved,
        ...remaining.slice(insertAt),
      ];

      return {
        ...prev,
        workouts: prev.workouts.map((w, i) => {
          if (i === toWorkoutIndex)
            return { ...w, exercises: nextTargetExercises };
          if (i === fromWorkoutIndex && fromWorkoutIndex !== toWorkoutIndex) {
            return {
              ...w,
              exercises: w.exercises.filter((e) => e.id !== exerciseId),
            };
          }
          return w;
        }),
      };
    });
  };

  const resetProgram = () => {
    setProgram(initialProgram());
  };

  const loadProgram = (preset: Program) => {
    setProgram(withExerciseIds(preset));
  };

  // Get program with combined exercise names (name + variant) for submission
  const getProgramForSubmit = (): Program => ({
    ...program,
    workouts: program.workouts.map((w) => ({
      ...w,
      exercises: w.exercises.map((e) => ({
        ...stripExerciseId(e),
        name: formatExerciseName(e.name, e.variant),
        variant: undefined, // Remove variant field for submission
      })),
    })),
  });

  return {
    program,
    getProgramForSubmit,
    updateProgramName,
    updateDuration,
    updateFrequency,
    updateDynamicRir,
    updateStartingRir,
    addWorkout,
    removeWorkout,
    updateWorkoutName,
    addExercises,
    removeExercise,
    updateExercise,
    moveExercise,
    resetProgram,
    loadProgram,
  };
};
