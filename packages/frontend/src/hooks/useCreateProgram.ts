import { useState } from "react";
import type { Program, Workout, Exercise, Frequency } from "../types/program";

const createEmptyWorkout = (): Workout => ({
  name: "",
  exercises: [],
});

const initialProgram: Program = {
  name: "",
  durationWeeks: 4,
  frequency: 4,
  dynamicRir: true,
  startingRir: 3,
  workouts: [createEmptyWorkout()],
};

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
        i === workoutIndex ? { ...w, name } : w
      ),
    }));
  };

  const addExercises = (workoutIndex: number, exerciseNames: string[]) => {
    const newExercises: Exercise[] = exerciseNames.map((name) => ({
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
          : w
      ),
    }));
  };

  const removeExercise = (workoutIndex: number, exerciseIndex: number) => {
    setProgram((prev) => ({
      ...prev,
      workouts: prev.workouts.map((w, wi) =>
        wi === workoutIndex
          ? { ...w, exercises: w.exercises.filter((_, ei) => ei !== exerciseIndex) }
          : w
      ),
    }));
  };

  const updateExercise = (
    workoutIndex: number,
    exerciseIndex: number,
    field: keyof Exercise,
    value: string | number
  ) => {
    setProgram((prev) => ({
      ...prev,
      workouts: prev.workouts.map((w, wi) =>
        wi === workoutIndex
          ? {
              ...w,
              exercises: w.exercises.map((e, ei) =>
                ei === exerciseIndex ? { ...e, [field]: value } : e
              ),
            }
          : w
      ),
    }));
  };

  const resetProgram = () => {
    setProgram(initialProgram);
  };

  const loadProgram = (preset: Program) => {
    setProgram(preset);
  };

  return {
    program,
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
    resetProgram,
    loadProgram,
  };
};
