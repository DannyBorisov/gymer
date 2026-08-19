import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { apiFetch } from "../utils/api";
import { formatDuration } from "../lib/time";
import { formatTodayDDMMYYYY } from "../lib/date";

export interface ExerciseRow {
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

export interface Workout {
  name: string;
  exercises: ExerciseRow[];
  isComplete: boolean;
  completedDate?: string;
  duration?: string;
}

export interface Week {
  week: number;
  workouts: Workout[];
}

export interface PreviousStats {
  week: number;
  workout: string;
  sets: { weight: string; reps: string; rir: string }[];
}

interface ActiveWorkout {
  programId: string;
  week: number;
  workout: Workout;
}

interface WorkoutContextType {
  // State
  activeWorkout: ActiveWorkout | null;
  workoutData: ExerciseRow[];
  timer: number;
  duration: number | null;
  isTimerRunning: boolean;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  currentExerciseIndex: number;
  currentSetIndex: number;
  completedSets: Set<number>;
  program: Week[];
  programName: string;
  previousStats: Record<string, PreviousStats>;

  // Actions
  startWorkout: (
    programId: string,
    week: number,
    workout: Workout,
    program: Week[],
    programName: string
  ) => void;
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
  completeWorkout: (rowIndex: number) => Promise<void>;
  setCurrentExerciseIndex: (index: number) => void;
  setCurrentSetIndex: (index: number) => void;
  saveWorkout: (includeDate?: boolean) => Promise<void>;
}

const WorkoutContext = createContext<WorkoutContextType | null>(null);

export const WorkoutProvider = ({ children }: { children: ReactNode }) => {
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkout | null>(
    null,
  );
  const [workoutData, setWorkoutData] = useState<ExerciseRow[]>([]);
  const [timer, setTimer] = useState(0);
  const [duration, setDuration] = useState<number | null>(null);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [completedSets, setCompletedSets] = useState<Set<number>>(new Set());
  const [program, setProgram] = useState<Week[]>([]);
  const [programName, setProgramName] = useState<string>("");
  const [previousStats, setPreviousStats] = useState<Record<string, PreviousStats>>({});

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const timerStartRef = useRef<number>(0);
  const hasUnsavedChangesRef = useRef(false);

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

  const saveWorkout = async (includeDate = false) => {
    if (!activeWorkout || workoutData.length === 0) return;

    setIsSaving(true);
    try {
      const updates = workoutData.map((row) => ({
        rowIndex: row.rowIndex,
        weight: row.weight,
        repsAchieved: row.repsAchieved,
        rirAchieved: row.rirAchieved,
        notes: row.notes,
      }));

      // Get the first row index (smallest rowIndex in workout) for the date
      const dateRowIndex = Math.min(...workoutData.map((r) => r.rowIndex));

      const completedDate = includeDate ? formatTodayDDMMYYYY() : undefined;
      const durationVal = includeDate ? formatDuration(timer) : undefined;

      const response = await apiFetch(`/api/programs/${activeWorkout.programId}/rows`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updates,
          ...(includeDate && { completedDate, dateRowIndex, duration: durationVal })
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Save failed:", response.status, errorText);
        return;
      }

      setHasUnsavedChanges(false);
      hasUnsavedChangesRef.current = false;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error("Failed to save:", errMsg);
      console.error("Program ID:", activeWorkout.programId);
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-save every 5 seconds during active workout
  useEffect(() => {
    if (!activeWorkout) return;

    const interval = setInterval(() => {
      if (hasUnsavedChangesRef.current) {
        saveWorkout();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [activeWorkout, saveWorkout]);

  const startWorkout = (
    programId: string,
    week: number,
    workout: Workout,
    programData: Week[],
    name: string
  ) => {
    setWorkoutData(workout.exercises.map((ex) => ({ ...ex })));
    setActiveWorkout({ programId, week, workout });
    setProgram(programData);
    setProgramName(name);
    setTimer(0);
    setDuration(null);
    timerStartRef.current = Date.now();
    setIsTimerRunning(true);
    setCurrentExerciseIndex(0);
    setCurrentSetIndex(0);
    setCompletedSets(new Set());

    // Calculate previous stats for each exercise
    const stats: Record<string, PreviousStats> = {};
    const exerciseNames = [...new Set(workout.exercises.map((e) => e.exercise))];

    for (const exerciseName of exerciseNames) {
      for (let w = week - 1; w >= 1; w--) {
        const prevWeek = programData.find((p) => p.week === w);
        if (!prevWeek) continue;

        for (const prevWorkout of prevWeek.workouts) {
          const prevExercises = prevWorkout.exercises.filter(
            (e) => e.exercise === exerciseName && e.weight && e.repsAchieved,
          );

          if (prevExercises.length > 0) {
            stats[exerciseName] = {
              week: w,
              workout: prevWorkout.name,
              sets: prevExercises.map((e) => ({
                weight: e.weight,
                reps: e.repsAchieved,
                rir: e.rirAchieved,
              })),
            };
            break;
          }
        }
        if (stats[exerciseName]) break;
      }
    }
    setPreviousStats(stats);
  };

  const stopWorkout = async () => {
    setIsTimerRunning(false);
    timerStartRef.current = 0;
    // Only save if workout is NOT complete (incomplete workouts get saved without date)
    // Complete workouts were already saved via auto-save during the workout
    const allComplete = workoutData.every(
      (row) => row.weight && row.repsAchieved
    );
    if (!allComplete) {
      await saveWorkout(false);
    }
    setActiveWorkout(null);
    setWorkoutData([]);
    setTimer(0);
    setDuration(null);
    setCompletedSets(new Set());
    setCurrentExerciseIndex(0);
    setCurrentSetIndex(0);
    setProgram([]);
    setProgramName("");
    setPreviousStats({});
  };

  const updateExercise = (
    rowIndex: number,
    field: "weight" | "repsAchieved" | "rirAchieved" | "notes",
    value: string,
  ) => {
    setWorkoutData((prev) =>
      prev.map((row) =>
        row.rowIndex === rowIndex ? { ...row, [field]: value } : row
      )
    );
    setHasUnsavedChanges(true);
    hasUnsavedChangesRef.current = true;
  };

  const adjustValue = (
    rowIndex: number,
    field: "weight" | "repsAchieved" | "rirAchieved",
    delta: number,
  ) => {
    setWorkoutData((prev) =>
      prev.map((row) => {
        if (row.rowIndex !== rowIndex) return row;
        const currentValue = parseFloat(row[field]) || 0;
        const newValue = Math.max(0, currentValue + delta);
        return { ...row, [field]: newValue.toString() };
      })
    );
    setHasUnsavedChanges(true);
    hasUnsavedChangesRef.current = true;
  };

  const completeSet = (rowIndex: number) => {
    // Build updated data synchronously first
    const newData = workoutData.map((row) =>
      row.rowIndex === rowIndex && !row.repsAchieved
        ? { ...row, repsAchieved: row.targetReps.toString() }
        : row
    );

    // Update state
    setWorkoutData(newData);
    setCompletedSets((prev) => new Set([...prev, rowIndex]));

    // Save data immediately (without date)
    const doSave = async () => {
      if (!activeWorkout) return;
      setIsSaving(true);
      try {
        const updates = newData.map((r) => ({
          rowIndex: r.rowIndex,
          weight: r.weight,
          repsAchieved: r.repsAchieved,
          rirAchieved: r.rirAchieved,
          notes: r.notes,
        }));

        await apiFetch(`/api/programs/${activeWorkout.programId}/rows`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ updates }),
        });

        setHasUnsavedChanges(false);
        hasUnsavedChangesRef.current = false;
      } catch (error) {
        console.error("Failed to save:", error);
      } finally {
        setIsSaving(false);
      }
    };
    doSave();

    // Auto-advance to next set
    const groupedByExercise = Object.values(
      workoutData.reduce(
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
  };

  const completeWorkout = async (rowIndex: number) => {
    // Build updated data synchronously first
    const newData = workoutData.map((row) =>
      row.rowIndex === rowIndex && !row.repsAchieved
        ? { ...row, repsAchieved: row.targetReps.toString() }
        : row
    );

    // Update state
    setWorkoutData(newData);
    setCompletedSets((prev) => new Set([...prev, rowIndex]));
    setDuration(timer);
    setIsTimerRunning(false);

    // Save with date
    if (!activeWorkout) return;
    setIsSaving(true);
    try {
      const updates = newData.map((r) => ({
        rowIndex: r.rowIndex,
        weight: r.weight,
        repsAchieved: r.repsAchieved,
        rirAchieved: r.rirAchieved,
        notes: r.notes,
      }));

      const firstRowIndex = Math.min(...newData.map((r) => r.rowIndex));
      const completedDate = formatTodayDDMMYYYY();
      const durationStr = formatDuration(timer);

      await apiFetch(`/api/programs/${activeWorkout.programId}/rows`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates, completedDate, dateRowIndex: firstRowIndex, duration: durationStr }),
      });

      setHasUnsavedChanges(false);
      hasUnsavedChangesRef.current = false;
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <WorkoutContext.Provider
      value={{
        activeWorkout,
        workoutData,
        timer,
        duration,
        isTimerRunning,
        isSaving,
        hasUnsavedChanges,
        currentExerciseIndex,
        currentSetIndex,
        completedSets,
        program,
        programName,
        previousStats,
        startWorkout,
        stopWorkout,
        setIsTimerRunning,
        updateExercise,
        adjustValue,
        completeSet,
        completeWorkout,
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
