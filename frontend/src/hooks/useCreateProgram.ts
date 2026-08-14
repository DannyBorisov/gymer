import { useState } from "react";
import type { Program, Workout, Exercise } from "../types/program";

const createEmptyExercise = (): Exercise => ({
  name: "",
  sets: 0,
  reps: 0,
  rir: 0,
});

const createEmptyWorkout = (): Workout => ({
  name: "",
  exercises: [createEmptyExercise()],
});

const initialProgram: Program = {
  name: "",
  workouts: [createEmptyWorkout()],
};

export const useCreateProgram = () => {
  const [program, setProgram] = useState<Program>(initialProgram);

  const updateProgramName = (name: string) => {
    setProgram((prev) => ({ ...prev, name }));
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

  const addExercise = (workoutIndex: number) => {
    setProgram((prev) => ({
      ...prev,
      workouts: prev.workouts.map((w, i) =>
        i === workoutIndex
          ? { ...w, exercises: [...w.exercises, createEmptyExercise()] }
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

  return {
    program,
    updateProgramName,
    addWorkout,
    removeWorkout,
    updateWorkoutName,
    addExercise,
    removeExercise,
    updateExercise,
    resetProgram,
  };
};
