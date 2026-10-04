import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { useSaveQuickWorkout } from "../api/workouts";
import { useGetExerciseBests } from "../api/analytics";
import {
  useUpdateProgram,
  useUpdateProgramCache,
  useAddSet,
  type ProgramUpdateInput,
} from "../api/programs";
import type {
  Workout as ApiWorkout,
  QuickWorkoutPayload,
} from "../api/workouts";
import { formatExerciseName } from "../types/shared";
import { formatDuration } from "../lib/time";
import { MIN_RECORDED_REST_SECONDS } from "../lib/constants";
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

export type SetType = "working" | "warmup";

// Internal row-based format for UI
export interface ExerciseRow {
  rowIndex: number;
  exercise: string;
  set: number;
  targetReps: number;
  rir: string;
  targetRestTime?: number;
  weight: string;
  repsAchieved: string;
  rirAchieved: string;
  achievedRestTime?: number;
  notes: string;
  setType?: SetType;
}

// Re-export API Workout type for external use
export type { Workout as ApiWorkout } from "../api/workouts";

export interface PreviousStats {
  week: number;
  workout: string;
  sets: { weight: string; reps: string; rir: string; notes?: string; restTime?: number }[];
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
  workoutName: string;
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
  allWorkouts: ApiWorkout[];
  programName: string;
  previousStats: Record<string, PreviousStats>;
  exerciseBests: Record<string, ExerciseBest>;
  isQuickWorkout: boolean;

  // Rest timer state (persisted across drawer collapse)
  restTimer: number;
  isRestTimerActive: boolean;
  restTimerStartTime: number | null;
  startRestTimer: (
    exerciseName: string,
    duration: number,
    announceInterval: number,
  ) => void;
  stopRestTimer: (exerciseName: string) => number;
  adjustRestTimer: (delta: number) => void;

  // Actions
  startWorkout: (
    programId: string,
    workout: ApiWorkout,
    allWorkouts: ApiWorkout[],
    programName: string,
  ) => void;
  startQuickWorkout: (exercises: QuickExercise[]) => void;
  addExerciseToWorkout: (exercise: QuickExercise) => void;
  addSetToExercise: (
    exerciseName: string,
    targetReps?: number,
    targetRir?: string,
  ) => Promise<void>;
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
  completeSet: (rowIndex: number, setType?: SetType) => void;
  completeWorkout: (rowIndex: number, setType?: SetType) => Promise<void>;
  setCurrentExerciseIndex: (index: number) => void;
  setCurrentSetIndex: (index: number) => void;
  saveWorkout: (includeDate?: boolean) => Promise<void>;
  swapExercise: (oldExerciseName: string, newExerciseName: string) => void;
}

const WorkoutContext = createContext<WorkoutContextType | null>(null);

// Generate set label (W1, W2 for warmups; 1, 2 for working sets)
const generateSetLabel = (
  row: ExerciseRow,
  allRows: ExerciseRow[],
): string | undefined => {
  // Only generate label if this is a warmup set or there are warmup sets for this exercise
  const exerciseRows = allRows.filter((r) => r.exercise === row.exercise);
  const hasWarmups = exerciseRows.some((r) => r.setType === "warmup");

  if (!hasWarmups) return undefined; // No label needed, sheet already has correct numbers

  if (row.setType === "warmup") {
    // Count warmup sets before this one (in row order)
    const warmupIndex =
      exerciseRows
        .filter((r) => r.setType === "warmup")
        .findIndex((r) => r.rowIndex === row.rowIndex) + 1;
    return `W${warmupIndex}`;
  } else {
    // Working set - count working sets before this one
    const workingIndex =
      exerciseRows
        .filter((r) => r.setType !== "warmup")
        .findIndex((r) => r.rowIndex === row.rowIndex) + 1;
    return String(workingIndex);
  }
};

// Rows with logged data, as Prisma-like batch updates for PATCH /api/programs/:id
const buildSetUpdates = (
  rows: ExerciseRow[],
  week: number,
  workoutName: string,
): ProgramUpdateInput[] =>
  rows
    .filter((row) => row.weight || row.repsAchieved)
    .map((row) => ({
      where: {
        week,
        workout: {
          name: workoutName,
          exercise: { name: row.exercise, set: row.set - 1 },
        },
      },
      data: {
        achievedWeight: row.weight ? parseFloat(row.weight) : undefined,
        achievedReps: row.repsAchieved
          ? parseInt(row.repsAchieved, 10)
          : undefined,
        achievedRir: row.rirAchieved || undefined,
        achievedRestTime: row.achievedRestTime,
        notes: row.notes || undefined,
        setType: row.setType,
        setLabel: generateSetLabel(row, rows),
      },
    }));

// Local wall-clock as a timezone-less ISO string (YYYY-MM-DDTHH:MM:SS) so the
// backend records the user's local time, not UTC.
const localISOString = (d: Date): string => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
};

// Marks the workout complete (date + duration)
const buildCompletionUpdate = (
  week: number,
  workoutName: string,
  durationSeconds: number,
): ProgramUpdateInput => ({
  where: { week, workout: { name: workoutName } },
  data: {
    date: localISOString(new Date()),
    duration: formatDuration(durationSeconds),
  },
});

// Rows with logged data, as a POST /api/quick-workouts/save payload
const buildQuickPayload = (
  rows: ExerciseRow[],
  durationSeconds: number,
): QuickWorkoutPayload => ({
  workoutId: `quick-${Date.now()}`,
  duration: formatDuration(durationSeconds),
  date: localISOString(new Date()),
  sets: rows
    .filter((row) => row.weight || row.repsAchieved)
    .map((row) => ({
      exercise: row.exercise,
      set: row.set,
      weight: row.weight,
      reps: row.repsAchieved,
      rir: row.rirAchieved,
      notes: row.notes,
    })),
});

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
  const [allWorkouts, setAllWorkouts] = useState<ApiWorkout[]>([]);
  const [programName, setProgramName] = useState<string>("");
  const [previousStats, setPreviousStats] = useState<
    Record<string, PreviousStats>
  >({});
  const [isQuickWorkout, setIsQuickWorkout] = useState(false);

  // Server calls
  const updateProgram = useUpdateProgram(); // Full sync (Sheets + cache) - for completion
  const updateProgramCache = useUpdateProgramCache(); // Cache only - for during workout
  const addSetMutation = useAddSet();
  const saveQuickWorkout = useSaveQuickWorkout();
  // Reference data for PR detection; only fetched once a workout is active
  const { data: bestsData } = useGetExerciseBests(Boolean(activeWorkout));
  const exerciseBests: Record<string, ExerciseBest> = bestsData?.bests ?? {};

  // Rest timer state (persisted across drawer collapse)
  const [restTimer, setRestTimer] = useState(0);
  const [isRestTimerActive, setIsRestTimerActive] = useState(false);
  const [restTimerStartTime, setRestTimerStartTime] = useState<number | null>(
    null,
  );
  const restTimerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  // Store rest timer config for rescheduling on adjustment and live activity updates
  const restTimerConfigRef = useRef<{
    duration: number;
    announceInterval: number;
    exerciseName: string;
  } | null>(null);

  // Track when the last set was completed to calculate rest time
  const lastSetCompletedAtRef = useRef<number | null>(null);

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

  // Auto-save every 5 seconds during active workout (cache only - no Sheets sync)
  useEffect(() => {
    if (!activeWorkout || isQuickWorkout) return;

    const interval = setInterval(async () => {
      if (!hasUnsavedChangesRef.current || workoutDataRef.current.length === 0)
        return;

      const data = workoutDataRef.current;
      const { programId, week, workoutName } = activeWorkout;

      setIsSaving(true);
      try {
        const updates = buildSetUpdates(data, week, workoutName);
        if (updates.length > 0) {
          // Use cache-only update to avoid Sheets quota during workout
          await updateProgramCache.mutateAsync({ id: programId, input: updates });
        }
        setHasUnsavedChanges(false);
        hasUnsavedChangesRef.current = false;
      } catch (error) {
        console.error("Auto-save failed:", error);
      } finally {
        setIsSaving(false);
      }
    }, 5000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkout, isQuickWorkout]);

  const saveWorkout = async (includeDate = false) => {
    if (!activeWorkout || isQuickWorkout || workoutDataRef.current.length === 0)
      return;

    const data = workoutDataRef.current;
    const { programId, week, workoutName } = activeWorkout;

    setIsSaving(true);
    try {
      const updates = buildSetUpdates(data, week, workoutName);
      if (includeDate) {
        updates.push(buildCompletionUpdate(week, workoutName, timer));
      }
      if (updates.length > 0) {
        if (includeDate) {
          // Workout completion - full sync to Sheets
          await updateProgram.mutateAsync({ id: programId, input: updates });
        } else {
          // Intermediate save - cache only
          await updateProgramCache.mutateAsync({ id: programId, input: updates });
        }
      }
      setHasUnsavedChanges(false);
      hasUnsavedChangesRef.current = false;
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Start rest timer
  const startRestTimer = (
    exerciseName: string,
    duration: number,
    announceInterval: number,
  ) => {
    const startTime = Date.now();
    setRestTimer(0);
    setRestTimerStartTime(startTime);
    setIsRestTimerActive(true);
    restTimerConfigRef.current = { duration, announceInterval, exerciseName };
    unlockAudio();
    scheduleRestTimerNotification(duration, announceInterval, startTime);
    // Update Live Activity to show rest timer
    if (activeWorkout) {
      updateRestTimerLiveActivity(
        true,
        activeWorkout.workoutName,
        exerciseName,
        startTime,
      );
    }
  };

  // Stop rest timer, returns the timer value when stopped
  // Also saves rest time to the current set if >= 30 seconds
  const stopRestTimer = (exerciseName: string): number => {
    const stoppedAt = restTimer;
    setIsRestTimerActive(false);
    setRestTimer(0);
    setRestTimerStartTime(null);
    restTimerConfigRef.current = null;
    cancelRestTimerNotification();
    if (restTimerIntervalRef.current) {
      clearInterval(restTimerIntervalRef.current);
    }
    // Update Live Activity to hide rest timer
    if (activeWorkout) {
      updateRestTimerLiveActivity(
        false,
        activeWorkout.workoutName,
        exerciseName,
      );
    }

    // Save rest time to the last completed set that doesn't have rest time yet
    // This handles the case where user moves to next set before stopping timer
    if (stoppedAt >= MIN_RECORDED_REST_SECONDS) {
      // Find the last completed set without rest time (in row order)
      const completedSetsWithoutRest = workoutDataRef.current.filter(
        (row) => row.repsAchieved && !row.achievedRestTime,
      );
      console.log(
        "[stopRestTimer] completed sets without rest:",
        completedSetsWithoutRest.length,
      );
      // Take the last one (most recently completed), or fall back to current set
      let targetSet = completedSetsWithoutRest[completedSetsWithoutRest.length - 1];

      if (!targetSet) {
        // No completed sets without rest - fall back to current set
        const groupedByExercise = Object.values(
          workoutDataRef.current.reduce(
            (acc, ex) => {
              if (!acc[ex.exercise]) acc[ex.exercise] = [];
              acc[ex.exercise].push(ex);
              return acc;
            },
            {} as Record<string, ExerciseRow[]>,
          ),
        );
        targetSet = groupedByExercise[currentExerciseIndex]?.[currentSetIndex];
      }
      if (targetSet) {
        console.log(
          "[stopRestTimer] saving rest time to set:",
          targetSet.set,
          "time:",
          stoppedAt,
        );
        // Update the set with rest time
        const newData = workoutDataRef.current.map((row) =>
          row.rowIndex === targetSet.rowIndex
            ? { ...row, achievedRestTime: stoppedAt }
            : row,
        );
        workoutDataRef.current = newData;
        setWorkoutData(newData);

        // Save to backend (cache only during workout)
        const doSave = async () => {
          if (!activeWorkout) return;
          // Skip saving for quick workouts - they save on completion
          if (isQuickWorkout) return;

          setIsSaving(true);
          try {
            const updates = buildSetUpdates(
              newData,
              activeWorkout.week,
              activeWorkout.workoutName,
            );
            if (updates.length > 0) {
              // Use cache-only update during workout
              await updateProgramCache.mutateAsync({
                id: activeWorkout.programId,
                input: updates,
              });
            }
            setHasUnsavedChanges(false);
            hasUnsavedChangesRef.current = false;
          } catch (error) {
            console.error("Failed to save rest time:", error);
          } finally {
            setIsSaving(false);
          }
        };
        doSave();
      }
    }

    return stoppedAt;
  };

  // Adjust rest timer by delta seconds (+/- buttons)
  const adjustRestTimer = (delta: number) => {
    if (
      !isRestTimerActive ||
      !restTimerStartTime ||
      !restTimerConfigRef.current
    )
      return;
    // Adjust the start time to change the displayed elapsed time
    const newStartTime = restTimerStartTime - delta * 1000;
    setRestTimerStartTime(newStartTime);
    const newElapsed = Math.max(
      0,
      Math.floor((Date.now() - newStartTime) / 1000),
    );
    setRestTimer(newElapsed);

    // Reschedule the notification with the new start time
    const { duration, announceInterval, exerciseName } =
      restTimerConfigRef.current;
    cancelRestTimerNotification();
    scheduleRestTimerNotification(duration, announceInterval, newStartTime);

    // Update live activity with new start time
    if (activeWorkout) {
      updateRestTimerLiveActivity(
        true,
        activeWorkout.workoutName,
        exerciseName,
        newStartTime,
      );
    }
  };

  // Convert API Workout to internal ExerciseRow[] format
  const convertToExerciseRows = (workout: ApiWorkout): ExerciseRow[] => {
    const rows: ExerciseRow[] = [];
    let rowIndex = 0;

    for (const exercise of workout.exercises) {
      for (let setIdx = 0; setIdx < exercise.sets.length; setIdx++) {
        const set = exercise.sets[setIdx];
        rows.push({
          rowIndex: rowIndex++,
          // Recombine so downstream parseExerciseName() can show the variant.
          exercise: formatExerciseName(exercise.name, exercise.variant),
          set: setIdx + 1,
          targetReps: set.targetReps,
          rir: set.targetRir,
          targetRestTime: set.targetRestTime,
          weight: set.achievedWeight?.toString() || "",
          repsAchieved: set.achievedReps?.toString() || "",
          rirAchieved: set.achievedRir || "",
          achievedRestTime: set.achievedRestTime,
          notes: set.notes || "",
          setType: set.setType,
        });
      }
    }

    return rows;
  };

  const startWorkout = (
    programId: string,
    workout: ApiWorkout,
    programWorkouts: ApiWorkout[],
    name: string,
  ) => {
    const exercises = convertToExerciseRows(workout);
    workoutDataRef.current = exercises;
    setWorkoutData(exercises);
    setActiveWorkout({
      programId,
      week: workout.week,
      workoutName: workout.name,
    });
    setAllWorkouts(programWorkouts);
    setProgramName(name);
    setCurrentExerciseIndex(0);
    setCurrentSetIndex(0);

    // Check if workout was already completed (has a date)
    if (workout.date) {
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

    // Calculate previous stats for each exercise - find the last instance
    // of this exercise anywhere in the program (any workout, any week).
    // Keyed by the combined "Name (Variant)" so it matches the workout rows.
    const stats: Record<string, PreviousStats> = {};
    const currentWeek = workout.week;

    // Flatten all completed exercises across all workouts, sorted by week desc
    const allCompletedExercises: {
      week: number;
      workout: string;
      name: string;
      variant?: string;
      sets: typeof programWorkouts[0]["exercises"][0]["sets"];
    }[] = [];

    for (const w of programWorkouts) {
      if (!w.date) continue; // Only completed workouts
      // Skip current week's workouts (want previous instances only)
      if (w.week >= currentWeek) continue;

      for (const e of w.exercises) {
        const completedSets = e.sets.filter(
          (s) => s.achievedWeight !== undefined && s.achievedReps !== undefined,
        );
        if (completedSets.length > 0) {
          allCompletedExercises.push({
            week: w.week,
            workout: w.name,
            name: e.name,
            variant: e.variant,
            sets: completedSets,
          });
        }
      }
    }

    // Sort by week descending (most recent first)
    allCompletedExercises.sort((a, b) => b.week - a.week);

    for (const exercise of workout.exercises) {
      const exerciseKey = formatExerciseName(exercise.name, exercise.variant);

      // Find the most recent instance of this exercise
      const prev = allCompletedExercises.find(
        (e) => e.name === exercise.name && e.variant === exercise.variant,
      );

      if (prev) {
        stats[exerciseKey] = {
          week: prev.week,
          workout: prev.workout,
          sets: prev.sets.map((s) => ({
            weight: s.achievedWeight?.toString() || "",
            reps: s.achievedReps?.toString() || "",
            rir: s.achievedRir || "",
            notes: s.notes || undefined,
            restTime: s.achievedRestTime,
          })),
        };
      }
    }
    setPreviousStats(stats);

    // exerciseBests loads via useGetExerciseBests once activeWorkout is set

    // Reset rest tracking for new workout
    lastSetCompletedAtRef.current = null;

    // Only start Live Activity if workout is not already complete
    if (!workout.date) {
      const firstExercise = workout.exercises[0]?.name || "";
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

    workoutDataRef.current = exerciseRows;
    setWorkoutData(exerciseRows);
    setActiveWorkout({
      programId: "quick",
      week: 1,
      workoutName: "Quick Workout",
    });
    setAllWorkouts([]);
    setProgramName("Quick Workout");
    setCurrentExerciseIndex(0);
    setCurrentSetIndex(0);
    setPreviousStats({});
    setIsQuickWorkout(true);

    // exerciseBests loads via useGetExerciseBests once activeWorkout is set

    // Reset rest tracking for new workout
    lastSetCompletedAtRef.current = null;

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

    const currentMaxRowIndex = Math.max(
      ...workoutData.map((r) => r.rowIndex),
      -1,
    );
    const newRows: ExerciseRow[] = [];

    for (let setNum = 1; setNum <= exercise.sets; setNum++) {
      newRows.push({
        rowIndex: currentMaxRowIndex + setNum,
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

  // Adds one extra set to an exercise in the current program workout, for
  // this session only. Inserts a real row into the spreadsheet (server-side,
  // shifting every later row down) then mirrors it into local state right
  // after that exercise's last existing set, renumbering rowIndex so it
  // stays a contiguous sequence across the whole workout.
  const addSetToExercise = async (
    exerciseName: string,
    targetReps?: number,
    targetRir?: string,
  ) => {
    if (!activeWorkout || isQuickWorkout) return;

    const rows = workoutDataRef.current;
    const exerciseRows = rows.filter((r) => r.exercise === exerciseName);
    if (exerciseRows.length === 0) return;

    const lastRow = exerciseRows[exerciseRows.length - 1];
    const insertAt = rows.findIndex((r) => r === lastRow) + 1;

    await addSetMutation.mutateAsync({
      id: activeWorkout.programId,
      week: activeWorkout.week,
      workoutName: activeWorkout.workoutName,
      exerciseName,
      targetReps,
      targetRir,
    });

    const newRow: ExerciseRow = {
      rowIndex: -1, // placeholder, renumbered below
      exercise: exerciseName,
      set: lastRow.set + 1,
      targetReps: targetReps ?? lastRow.targetReps,
      rir: targetRir ?? lastRow.rir,
      weight: "",
      repsAchieved: "",
      rirAchieved: "",
      notes: "",
    };

    const spliced = [
      ...rows.slice(0, insertAt),
      newRow,
      ...rows.slice(insertAt),
    ];

    // Rows before the insertion point keep their old rowIndex; everything
    // from the new row onward shifts up by one. Remap completedSets (keyed
    // by rowIndex) the same way so it still points at the right rows.
    const updatedRows = spliced.map((row, idx) => ({ ...row, rowIndex: idx }));
    setCompletedSets(
      (prev) =>
        new Set(
          [...prev].map((oldRowIndex) =>
            oldRowIndex >= insertAt ? oldRowIndex + 1 : oldRowIndex,
          ),
        ),
    );

    workoutDataRef.current = updatedRows;
    setWorkoutData(updatedRows);
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
      (row) => row.weight && row.repsAchieved,
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
    setAllWorkouts([]);
    setProgramName("");
    setPreviousStats({});
    setIsQuickWorkout(false);
  };

  const updateExercise = (
    rowIndex: number,
    field: "weight" | "repsAchieved" | "rirAchieved" | "notes",
    value: string,
  ) => {
    // Update ref immediately to avoid race conditions
    workoutDataRef.current = workoutDataRef.current.map((row) =>
      row.rowIndex === rowIndex ? { ...row, [field]: value } : row,
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

  const completeSet = (rowIndex: number, setType?: SetType) => {
    // Calculate rest time since last set completion
    const now = Date.now();
    let restTime: number | undefined;
    if (lastSetCompletedAtRef.current) {
      const elapsed = Math.floor((now - lastSetCompletedAtRef.current) / 1000);
      // Only record rest time if >= minimum threshold
      if (elapsed >= MIN_RECORDED_REST_SECONDS) {
        restTime = elapsed;
      }
    }
    // Update last set completed time
    lastSetCompletedAtRef.current = now;

    // Build updated data from ref (always has latest data, avoids race conditions)
    const newData = workoutDataRef.current.map((row) => {
      if (row.rowIndex !== rowIndex) return row;
      const updates: Partial<ExerciseRow> = {};
      if (!row.repsAchieved) {
        updates.repsAchieved = row.targetReps.toString();
      }
      if (restTime !== undefined) {
        updates.achievedRestTime = restTime;
      }
      // Set the set type (warmup or working)
      if (setType !== undefined) {
        updates.setType = setType;
      }
      return { ...row, ...updates };
    });

    // Update both ref and state
    workoutDataRef.current = newData;
    setWorkoutData(newData);
    setCompletedSets((prev) => new Set([...prev, rowIndex]));

    // Save data immediately (cache only during workout)
    const doSave = async () => {
      if (!activeWorkout) return;
      setIsSaving(true);
      try {
        if (isQuickWorkout) {
          const payload = buildQuickPayload(newData, timer);
          if (payload.sets.length > 0) {
            await saveQuickWorkout.mutateAsync(payload);
          }
        } else {
          const updates = buildSetUpdates(
            newData,
            activeWorkout.week,
            activeWorkout.workoutName,
          );
          if (updates.length > 0) {
            // Use cache-only update during workout
            await updateProgramCache.mutateAsync({
              id: activeWorkout.programId,
              input: updates,
            });
          }
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

    // Auto-advance to next set (use newData to avoid stale state)
    const groupedByExercise = Object.values(
      newData.reduce(
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

  const completeWorkout = async (rowIndex: number, setType?: SetType) => {
    // Build updated data from ref (always has latest data, avoids race conditions)
    const newData = workoutDataRef.current.map((row) => {
      if (row.rowIndex !== rowIndex) return row;
      const updates: Partial<ExerciseRow> = {};
      if (!row.repsAchieved) {
        updates.repsAchieved = row.targetReps.toString();
      }
      if (setType !== undefined) {
        updates.setType = setType;
      }
      return { ...row, ...updates };
    });

    // Update both ref and state
    workoutDataRef.current = newData;
    setWorkoutData(newData);
    setCompletedSets((prev) => new Set([...prev, rowIndex]));
    setDuration(timer);
    setIsTimerRunning(false);

    // Workout is finished: stop the rest timer and tear down the Live Activity
    cancelRestTimerNotification();
    if (restTimerIntervalRef.current) {
      clearInterval(restTimerIntervalRef.current);
    }
    setIsRestTimerActive(false);
    setRestTimer(0);
    setRestTimerStartTime(null);
    endWorkoutLiveActivity();

    if (!activeWorkout) return;

    if (isQuickWorkout) {
      const payload = buildQuickPayload(newData, timer);
      if (payload.sets.length > 0) {
        setIsSaving(true);
        try {
          await saveQuickWorkout.mutateAsync(payload);
        } catch (error) {
          console.error("Failed to save quick workout:", error);
        } finally {
          setIsSaving(false);
        }
      }
    } else {
      setIsSaving(true);
      try {
        const updates = [
          ...buildSetUpdates(
            newData,
            activeWorkout.week,
            activeWorkout.workoutName,
          ),
          buildCompletionUpdate(
            activeWorkout.week,
            activeWorkout.workoutName,
            timer,
          ),
        ];

        await updateProgram.mutateAsync({
          id: activeWorkout.programId,
          input: updates,
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

  // Swap all sets of one exercise with another exercise name
  const swapExercise = (oldExerciseName: string, newExerciseName: string) => {
    workoutDataRef.current = workoutDataRef.current.map((row) =>
      row.exercise === oldExerciseName
        ? { ...row, exercise: newExerciseName }
        : row,
    );
    setWorkoutData(workoutDataRef.current);
    setHasUnsavedChanges(true);
    hasUnsavedChangesRef.current = true;
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
        allWorkouts,
        programName,
        previousStats,
        exerciseBests,
        isQuickWorkout,
        restTimer,
        isRestTimerActive,
        restTimerStartTime,
        startRestTimer,
        stopRestTimer,
        adjustRestTimer,
        startWorkout,
        startQuickWorkout,
        addExerciseToWorkout,
        addSetToExercise,
        stopWorkout,
        setIsTimerRunning,
        updateExercise,
        adjustValue,
        completeSet,
        completeWorkout,
        setCurrentExerciseIndex,
        setCurrentSetIndex,
        saveWorkout,
        swapExercise,
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
