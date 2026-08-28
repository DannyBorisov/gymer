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
import {
  startWorkoutLiveActivity,
  endWorkoutLiveActivity,
  updateRestTimer as updateRestTimerLiveActivity,
} from "../utils/liveActivity";
import {
  unlockAudio,
  scheduleRestTimerNotification,
  cancelRestTimerNotification,
} from "../utils/sound";

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

export interface ExerciseBest {
  weight: number;
  reps: number;
  e1rm: number;
}

export interface QuickExercise {
  name: string;
  sets: number;
  reps: number;
  rir: number;
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
  exerciseBests: Record<string, ExerciseBest>;
  isQuickWorkout: boolean;

  // Rest timer state (persisted across drawer collapse)
  restTimer: number;
  isRestTimerActive: boolean;
  restTimerStartTime: number | null;
  startRestTimer: (exerciseName: string, duration: number, announceInterval: number) => void;
  stopRestTimer: (exerciseName: string) => void;

  // Actions
  startWorkout: (
    programId: string,
    week: number,
    workout: Workout,
    program: Week[],
    programName: string
  ) => void;
  startQuickWorkout: (exercises: QuickExercise[]) => void;
  addExerciseToWorkout: (exercise: QuickExercise) => void;
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
  const [exerciseBests, setExerciseBests] = useState<Record<string, ExerciseBest>>({});
  const [isQuickWorkout, setIsQuickWorkout] = useState(false);

  // Rest timer state (persisted across drawer collapse)
  const [restTimer, setRestTimer] = useState(0);
  const [isRestTimerActive, setIsRestTimerActive] = useState(false);
  const [restTimerStartTime, setRestTimerStartTime] = useState<number | null>(null);
  const restTimerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const timerStartRef = useRef<number>(0);
  const hasUnsavedChangesRef = useRef(false);
  const workoutDataRef = useRef<ExerciseRow[]>([]);

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

  // Rest timer count up effect
  useEffect(() => {
    if (isRestTimerActive && restTimerStartTime) {
      restTimerIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - restTimerStartTime) / 1000);
        setRestTimer(elapsed);
      }, 1000);

      return () => {
        if (restTimerIntervalRef.current) {
          clearInterval(restTimerIntervalRef.current);
        }
      };
    }
  }, [isRestTimerActive, restTimerStartTime]);

  // Keep workoutDataRef in sync with state
  useEffect(() => {
    workoutDataRef.current = workoutData;
  }, [workoutData]);

  // Live Activity timer auto-updates natively - no need to send updates from app

  const saveWorkout = async (includeDate = false) => {
    if (!activeWorkout || workoutData.length === 0) return;

    // Quick workouts don't auto-save to server
    if (isQuickWorkout) return;

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

  // Start rest timer
  const startRestTimer = (exerciseName: string, duration: number, announceInterval: number) => {
    const startTime = Date.now();
    setRestTimer(0);
    setRestTimerStartTime(startTime);
    setIsRestTimerActive(true);
    unlockAudio();
    scheduleRestTimerNotification(duration, announceInterval, startTime);
    // Update Live Activity to show rest timer
    if (activeWorkout) {
      updateRestTimerLiveActivity(
        true,
        activeWorkout.workout.name,
        exerciseName,
        startTime,
      );
    }
  };

  // Stop rest timer
  const stopRestTimer = (exerciseName: string) => {
    setIsRestTimerActive(false);
    setRestTimer(0);
    setRestTimerStartTime(null);
    cancelRestTimerNotification();
    if (restTimerIntervalRef.current) {
      clearInterval(restTimerIntervalRef.current);
    }
    // Update Live Activity to hide rest timer
    if (activeWorkout) {
      updateRestTimerLiveActivity(false, activeWorkout.workout.name, exerciseName);
    }
  };

  const startWorkout = (
    programId: string,
    week: number,
    workout: Workout,
    programData: Week[],
    name: string
  ) => {
    const exercises = workout.exercises.map((ex) => ({ ...ex }));
    workoutDataRef.current = exercises;
    setWorkoutData(exercises);
    setActiveWorkout({ programId, week, workout });
    setProgram(programData);
    setProgramName(name);
    setCurrentExerciseIndex(0);
    setCurrentSetIndex(0);

    // Check if workout was already completed (based on server data, not field values)
    if (workout.isComplete || workout.completedDate) {
      // Workout already complete from server - don't start timer
      setTimer(0);
      setDuration(0); // Mark as complete
      timerStartRef.current = 0;
      setIsTimerRunning(false);
      setCompletedSets(new Set(exercises.map((ex) => ex.rowIndex)));
    } else {
      // Normal start - begin timer
      setTimer(0);
      setDuration(null);
      timerStartRef.current = Date.now();
      setIsTimerRunning(true);
      setCompletedSets(new Set());
    }

    // Calculate previous stats for each exercise from the SAME workout type only
    const stats: Record<string, PreviousStats> = {};
    const exerciseNames = [...new Set(workout.exercises.map((e) => e.exercise))];
    const currentWorkoutName = workout.name;

    for (const exerciseName of exerciseNames) {
      for (let w = week - 1; w >= 1; w--) {
        const prevWeek = programData.find((p) => p.week === w);
        if (!prevWeek) continue;

        // Only look at the same workout type (same name)
        const prevWorkout = prevWeek.workouts.find((pw) => pw.name === currentWorkoutName);
        if (!prevWorkout) continue;

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
    }
    setPreviousStats(stats);

    // Fetch exercise bests asynchronously for PR detection
    apiFetch("/api/analytics/bests")
      .then((response) => response.json() as Promise<{ bests: Record<string, ExerciseBest> }>)
      .then((data) => {
        if (data.bests) {
          setExerciseBests(data.bests);
        }
      })
      .catch(() => {
        // Silently fail - PRs just won't be detected
      });

    // Only start Live Activity if workout is not already complete
    if (!workout.isComplete && !workout.completedDate) {
      const firstExercise = workout.exercises[0]?.exercise || "";
      startWorkoutLiveActivity(workout.name, firstExercise);
    }
    setIsQuickWorkout(false);
  };

  const startQuickWorkout = (exercises: QuickExercise[]) => {
    // Convert QuickExercise[] to ExerciseRow[]
    const exerciseRows: ExerciseRow[] = [];
    let rowIndex = 0;

    exercises.forEach((ex) => {
      for (let setNum = 1; setNum <= ex.sets; setNum++) {
        exerciseRows.push({
          rowIndex: rowIndex++,
          date: "",
          week: 1,
          workout: "Quick Workout",
          exercise: ex.name,
          set: setNum,
          targetReps: ex.reps,
          rir: ex.rir.toString(),
          weight: "",
          repsAchieved: "",
          rirAchieved: "",
          notes: "",
        });
      }
    });

    const quickWorkout: Workout = {
      name: "Quick Workout",
      exercises: exerciseRows,
      isComplete: false,
    };

    workoutDataRef.current = exerciseRows;
    setWorkoutData(exerciseRows);
    setActiveWorkout({ programId: "quick", week: 1, workout: quickWorkout });
    setProgram([]);
    setProgramName("Quick Workout");
    setCurrentExerciseIndex(0);
    setCurrentSetIndex(0);
    setPreviousStats({});
    setIsQuickWorkout(true);

    // Fetch exercise bests asynchronously for PR detection
    apiFetch("/api/analytics/bests")
      .then((response) => response.json() as Promise<{ bests: Record<string, ExerciseBest> }>)
      .then((data) => {
        if (data.bests) {
          setExerciseBests(data.bests);
        }
      })
      .catch(() => {});

    // Start timer
    setTimer(0);
    setDuration(null);
    timerStartRef.current = Date.now();
    setIsTimerRunning(true);
    setCompletedSets(new Set());

    // Start Live Activity
    const firstExercise = exercises[0]?.name || "";
    startWorkoutLiveActivity("Quick Workout", firstExercise);
  };

  const addExerciseToWorkout = (exercise: QuickExercise) => {
    if (!activeWorkout) return;

    const currentMaxRowIndex = Math.max(...workoutData.map(r => r.rowIndex), -1);
    const newRows: ExerciseRow[] = [];

    for (let setNum = 1; setNum <= exercise.sets; setNum++) {
      newRows.push({
        rowIndex: currentMaxRowIndex + setNum,
        date: "",
        week: 1,
        workout: activeWorkout.workout.name,
        exercise: exercise.name,
        set: setNum,
        targetReps: exercise.reps,
        rir: exercise.rir.toString(),
        weight: "",
        repsAchieved: "",
        rirAchieved: "",
        notes: "",
      });
    }

    workoutDataRef.current = [...workoutDataRef.current, ...newRows];
    setWorkoutData(workoutDataRef.current);
  };

  const stopWorkout = async () => {
    setIsTimerRunning(false);
    timerStartRef.current = 0;

    // Stop rest timer if active
    if (isRestTimerActive) {
      cancelRestTimerNotification();
      if (restTimerIntervalRef.current) {
        clearInterval(restTimerIntervalRef.current);
      }
    }
    setIsRestTimerActive(false);
    setRestTimer(0);
    setRestTimerStartTime(null);

    // End Live Activity
    endWorkoutLiveActivity();

    // Only save if workout is NOT complete (incomplete workouts get saved without date)
    // Complete workouts were already saved via auto-save during the workout
    const allComplete = workoutData.every(
      (row) => row.weight && row.repsAchieved
    );
    if (!allComplete) {
      await saveWorkout(false);
    }
    setActiveWorkout(null);
    workoutDataRef.current = [];
    setWorkoutData([]);
    setTimer(0);
    setDuration(null);
    setCompletedSets(new Set());
    setCurrentExerciseIndex(0);
    setCurrentSetIndex(0);
    setProgram([]);
    setProgramName("");
    setPreviousStats({});
    setExerciseBests({});
    setIsQuickWorkout(false);
  };

  const updateExercise = (
    rowIndex: number,
    field: "weight" | "repsAchieved" | "rirAchieved" | "notes",
    value: string,
  ) => {
    // Update ref immediately to avoid race conditions
    workoutDataRef.current = workoutDataRef.current.map((row) =>
      row.rowIndex === rowIndex ? { ...row, [field]: value } : row
    );
    setWorkoutData(workoutDataRef.current);
    setHasUnsavedChanges(true);
    hasUnsavedChangesRef.current = true;
  };

  const adjustValue = (
    rowIndex: number,
    field: "weight" | "repsAchieved" | "rirAchieved",
    delta: number,
  ) => {
    // Update ref immediately to avoid race conditions
    workoutDataRef.current = workoutDataRef.current.map((row) => {
      if (row.rowIndex !== rowIndex) return row;
      const currentValue = parseFloat(row[field]) || 0;
      const newValue = Math.max(0, currentValue + delta);
      return { ...row, [field]: newValue.toString() };
    });
    setWorkoutData(workoutDataRef.current);
    setHasUnsavedChanges(true);
    hasUnsavedChangesRef.current = true;
  };

  const completeSet = (rowIndex: number) => {
    // Build updated data from ref (always has latest data, avoids race conditions)
    const newData = workoutDataRef.current.map((row) =>
      row.rowIndex === rowIndex && !row.repsAchieved
        ? { ...row, repsAchieved: row.targetReps.toString() }
        : row
    );

    // Update both ref and state
    workoutDataRef.current = newData;
    setWorkoutData(newData);
    setCompletedSets((prev) => new Set([...prev, rowIndex]));

    // Save data immediately
    const doSave = async () => {
      if (!activeWorkout) return;
      setIsSaving(true);
      try {
        if (isQuickWorkout) {
          // Save quick workout
          const validSets = newData.filter((s) => s.weight || s.repsAchieved);
          if (validSets.length > 0) {
            await apiFetch("/api/quick-workouts/save", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                workoutId: `quick-${Date.now()}`,
                duration: formatDuration(timer),
                sets: validSets.map((s) => ({
                  exercise: s.exercise,
                  set: s.set,
                  weight: s.weight,
                  reps: s.repsAchieved,
                  rir: s.rirAchieved,
                  notes: s.notes,
                })),
              }),
            });
          }
        } else {
          // Save program workout
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
        }

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
    // Build updated data from ref (always has latest data, avoids race conditions)
    const newData = workoutDataRef.current.map((row) =>
      row.rowIndex === rowIndex && !row.repsAchieved
        ? { ...row, repsAchieved: row.targetReps.toString() }
        : row
    );

    // Update both ref and state
    workoutDataRef.current = newData;
    setWorkoutData(newData);
    setCompletedSets((prev) => new Set([...prev, rowIndex]));
    setDuration(timer);
    setIsTimerRunning(false);

    if (!activeWorkout) return;

    const updates = newData.map((r) => ({
      rowIndex: r.rowIndex,
      weight: r.weight,
      repsAchieved: r.repsAchieved,
      rirAchieved: r.rirAchieved,
      notes: r.notes,
    }));

    if (isQuickWorkout) {
      // Save quick workout
      const validSets = newData.filter((s) => s.weight || s.repsAchieved);
      if (validSets.length > 0) {
        setIsSaving(true);
        try {
          await apiFetch("/api/quick-workouts/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              workoutId: `quick-${Date.now()}`,
              duration: formatDuration(timer),
              sets: validSets.map((s) => ({
                exercise: s.exercise,
                set: s.set,
                weight: s.weight,
                reps: s.repsAchieved,
                rir: s.rirAchieved,
                notes: s.notes,
              })),
            }),
          });
        } catch (error) {
          console.error("Failed to save quick workout:", error);
        } finally {
          setIsSaving(false);
        }
      }
    } else {
      // Save program workout with data, date, and duration in a single call
      setIsSaving(true);
      try {
        const firstRowIndex = Math.min(...newData.map((r) => r.rowIndex));
        const completedDate = formatTodayDDMMYYYY();
        const durationStr = formatDuration(timer);

        await apiFetch(`/api/programs/${activeWorkout.programId}/rows`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            updates,
            completedDate,
            dateRowIndex: firstRowIndex,
            duration: durationStr
          }),
        });

        setHasUnsavedChanges(false);
        hasUnsavedChangesRef.current = false;
      } catch (error) {
        console.error("[completeWorkout] Failed to save:", error);
      } finally {
        setIsSaving(false);
      }
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
        exerciseBests,
        isQuickWorkout,
        restTimer,
        isRestTimerActive,
        restTimerStartTime,
        startRestTimer,
        stopRestTimer,
        startWorkout,
        startQuickWorkout,
        addExerciseToWorkout,
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
