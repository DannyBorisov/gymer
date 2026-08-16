import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import { apiUrl } from "../utils/api";

interface ExerciseRow {
  rowIndex: number;
  date: string;
  week: number;
  workout: string;
  exercise: string;
  set: number;
  targetReps: number;
  rir: string;
  weight: string;
  repsAchieved: string;
  rirAchieved: string;
  notes: string;
}

interface Workout {
  name: string;
  exercises: ExerciseRow[];
  isComplete: boolean;
}

interface ActiveWorkout {
  programId: string;
  week: number;
  workout: Workout;
}

interface WorkoutContextType {
  // State
  activeWorkout: ActiveWorkout | null;
  workoutData: Map<number, ExerciseRow>;
  timer: number;
  isTimerRunning: boolean;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  currentExerciseIndex: number;
  currentSetIndex: number;
  completedSets: Set<number>;

  // Actions
  startWorkout: (programId: string, week: number, workout: Workout) => void;
  stopWorkout: () => Promise<void>;
  setIsTimerRunning: (running: boolean) => void;
  updateExercise: (
    rowIndex: number,
    field: "weight" | "repsAchieved" | "rirAchieved" | "notes",
    value: string,
  ) => void;
  adjustValue: (
    rowIndex: number,
    field: "weight" | "repsAchieved" | "rirAchieved",
    delta: number,
  ) => void;
  completeSet: (rowIndex: number) => void;
  setCurrentExerciseIndex: (index: number) => void;
  setCurrentSetIndex: (index: number) => void;
  saveWorkout: (includeDate?: boolean) => Promise<void>;
}

const WorkoutContext = createContext<WorkoutContextType | null>(null);

export const WorkoutProvider = ({ children }: { children: ReactNode }) => {
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkout | null>(
    null,
  );
  const [workoutData, setWorkoutData] = useState<Map<number, ExerciseRow>>(
    new Map(),
  );
  const [timer, setTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [completedSets, setCompletedSets] = useState<Set<number>>(new Set());

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const timerStartRef = useRef<number>(0);

  // Wake Lock - keep screen on during workout
  useEffect(() => {
    const requestWakeLock = async () => {
      if (activeWorkout && "wakeLock" in navigator) {
        try {
          wakeLockRef.current = await navigator.wakeLock.request("screen");
        } catch (err) {
          console.log("Wake Lock error:", err);
        }
      }
    };

    const releaseWakeLock = () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    };

    if (activeWorkout) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && activeWorkout) {
        requestWakeLock();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      releaseWakeLock();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [activeWorkout]);

  // Timer effect - uses elapsed time for accuracy when backgrounded
  useEffect(() => {
    if (isTimerRunning) {
      if (timerStartRef.current === 0) {
        timerStartRef.current = Date.now() - timer * 1000;
      }

      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - timerStartRef.current) / 1000);
        setTimer(elapsed);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning]);

  const saveWorkout = useCallback(async (includeDate = false) => {
    if (!activeWorkout || workoutData.size === 0) return;

    setIsSaving(true);
    try {
      const updates = Array.from(workoutData.values()).map((row) => ({
        rowIndex: row.rowIndex,
        weight: row.weight,
        repsAchieved: row.repsAchieved,
        rirAchieved: row.rirAchieved,
        notes: row.notes,
      }));

      // Get the first row index (smallest rowIndex in workout)
      const firstRowIndex = Math.min(...Array.from(workoutData.keys()).map(k => workoutData.get(k)!.rowIndex));

      // Format date as DD/MM/YYYY
      const today = new Date();
      const completedDate = includeDate
        ? `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`
        : undefined;

      await fetch(apiUrl(`/api/programs/${activeWorkout.programId}/rows`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          updates,
          ...(includeDate && { completedDate, firstRowIndex })
        }),
      });

      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setIsSaving(false);
    }
  }, [activeWorkout, workoutData]);

  // Auto-save effect
  useEffect(() => {
    if (hasUnsavedChanges) {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(saveWorkout, 3000);
    }

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [hasUnsavedChanges, saveWorkout]);

  const startWorkout = useCallback(
    (programId: string, week: number, workout: Workout) => {
      const data = new Map<number, ExerciseRow>();
      workout.exercises.forEach((ex) => {
        data.set(ex.rowIndex, { ...ex });
      });
      setWorkoutData(data);
      setActiveWorkout({ programId, week, workout });
      setTimer(0);
      timerStartRef.current = Date.now();
      setIsTimerRunning(true);
      setCurrentExerciseIndex(0);
      setCurrentSetIndex(0);
      setCompletedSets(new Set());
    },
    [],
  );

  const stopWorkout = useCallback(async () => {
    setIsTimerRunning(false);
    timerStartRef.current = 0;
    // Only include date if all sets are complete (have weight + reps)
    const allComplete = Array.from(workoutData.values()).every(
      (row) => row.weight && row.repsAchieved
    );
    await saveWorkout(allComplete);
    setActiveWorkout(null);
    setWorkoutData(new Map());
    setTimer(0);
    setCompletedSets(new Set());
    setCurrentExerciseIndex(0);
    setCurrentSetIndex(0);
  }, [saveWorkout, workoutData]);

  const updateExercise = useCallback(
    (
      rowIndex: number,
      field: "weight" | "repsAchieved" | "rirAchieved" | "notes",
      value: string,
    ) => {
      setWorkoutData((prev) => {
        const newData = new Map(prev);
        const row = newData.get(rowIndex);
        if (row) {
          newData.set(rowIndex, { ...row, [field]: value });
        }
        return newData;
      });
      setHasUnsavedChanges(true);
    },
    [],
  );

  const adjustValue = useCallback(
    (
      rowIndex: number,
      field: "weight" | "repsAchieved" | "rirAchieved",
      delta: number,
    ) => {
      setWorkoutData((prev) => {
        const newData = new Map(prev);
        const row = newData.get(rowIndex);
        if (row) {
          const currentValue = parseFloat(row[field]) || 0;
          const newValue = Math.max(0, currentValue + delta);
          newData.set(rowIndex, { ...row, [field]: newValue.toString() });
        }
        return newData;
      });
      setHasUnsavedChanges(true);
    },
    [],
  );

  const completeSet = useCallback(
    (rowIndex: number) => {
      // Auto-fill repsAchieved with targetReps if empty
      let updatedData: Map<number, ExerciseRow> = workoutData;
      setWorkoutData((prev) => {
        const newData = new Map(prev);
        const row = newData.get(rowIndex);
        if (row && !row.repsAchieved) {
          newData.set(rowIndex, { ...row, repsAchieved: row.targetReps.toString() });
          setHasUnsavedChanges(true);
        }
        updatedData = newData;
        return newData;
      });

      setCompletedSets((prev) => new Set([...prev, rowIndex]));

      // Check if this completes all sets (all have weight + reps)
      const allSetsComplete = Array.from(updatedData.values()).every(
        (row) => row.weight && row.repsAchieved
      );

      // If all sets are now complete, save with date
      if (allSetsComplete) {
        // Use setTimeout to ensure state updates are processed
        setTimeout(() => saveWorkout(true), 100);
      }

      // Auto-advance to next set
      const exercises = Array.from(workoutData.values());
      const groupedByExercise = Object.values(
        exercises.reduce(
          (acc, ex) => {
            if (!acc[ex.exercise]) acc[ex.exercise] = [];
            acc[ex.exercise].push(ex);
            return acc;
          },
          {} as Record<string, ExerciseRow[]>,
        ),
      );

      const currentExerciseSets = groupedByExercise[currentExerciseIndex];
      if (currentSetIndex < currentExerciseSets.length - 1) {
        setCurrentSetIndex(currentSetIndex + 1);
      } else if (currentExerciseIndex < groupedByExercise.length - 1) {
        setCurrentExerciseIndex(currentExerciseIndex + 1);
        setCurrentSetIndex(0);
      }
    },
    [workoutData, currentExerciseIndex, currentSetIndex, saveWorkout],
  );

  return (
    <WorkoutContext.Provider
      value={{
        activeWorkout,
        workoutData,
        timer,
        isTimerRunning,
        isSaving,
        hasUnsavedChanges,
        currentExerciseIndex,
        currentSetIndex,
        completedSets,
        startWorkout,
        stopWorkout,
        setIsTimerRunning,
        updateExercise,
        adjustValue,
        completeSet,
        setCurrentExerciseIndex,
        setCurrentSetIndex,
        saveWorkout,
      }}
    >
      {children}
    </WorkoutContext.Provider>
  );
};

export const useWorkout = () => {
  const context = useContext(WorkoutContext);
  if (!context) {
    throw new Error("useWorkout must be used within a WorkoutProvider");
  }
  return context;
};
