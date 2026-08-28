import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { workoutsApi } from "../api";
import { type QuickExercise } from "./WorkoutContext";

// Common preset exercises
const PRESET_EXERCISES = [
  "Bench Press",
  "Squat",
  "Deadlift",
  "Overhead Press",
  "Barbell Row",
  "Pull-up",
  "Lat Pulldown",
  "Leg Press",
  "Leg Curl",
  "Leg Extension",
  "Romanian Deadlift",
  "Hip Thrust",
  "Incline Dumbbell Press",
  "Dumbbell Row",
  "Lateral Raise",
  "Face Pull",
  "Tricep Pushdown",
  "Bicep Curl",
  "Cable Fly",
  "Chest Fly",
  "Seated Calf Raise",
  "Standing Calf Raise",
  "Skull Crushers",
  "Hammer Curl",
  "Preacher Curl",
  "Cable Row",
  "T-Bar Row",
  "Front Squat",
  "Bulgarian Split Squat",
  "Lunges",
];

export interface QuickWorkoutSet {
  id: string;
  exercise: string;
  set: number;
  weight: string;
  reps: string;
  rir: string;
  notes: string;
}

interface QuickWorkoutState {
  workoutId: string;
  exercises: string[];
  sets: QuickWorkoutSet[];
  startTime: number;
}

export interface FloatingAction {
  label: string;
  handler: () => void;
  enabled: boolean;
}

interface QuickWorkoutContextType {
  // State
  isActive: boolean;
  workoutId: string | null;
  exercises: string[];
  sets: QuickWorkoutSet[];
  timer: number;
  isSaving: boolean;
  availableExercises: string[];
  isLoadingExercises: boolean;
  pendingExercises: QuickExercise[];
  floatingAction: FloatingAction | null;

  // Actions
  setPendingExercises: React.Dispatch<React.SetStateAction<QuickExercise[]>>;
  setFloatingAction: (action: FloatingAction | null) => void;
  startWorkout: () => void;
  stopWorkout: () => void;
  addExercise: (name: string) => void;
  renameExercise: (oldName: string, newName: string) => void;
  removeExercise: (name: string) => void;
  addSet: (exercise: string) => void;
  removeSet: (setId: string) => void;
  updateSet: (
    setId: string,
    field: "weight" | "reps" | "rir" | "notes",
    value: string
  ) => void;
  adjustSetValue: (
    setId: string,
    field: "weight" | "reps" | "rir",
    delta: number
  ) => void;
  completeWorkout: () => Promise<boolean>;
  discardWorkout: () => void;
  loadExercises: () => Promise<void>;
  hasRecoveryData: () => boolean;
  recoverWorkout: () => void;
  dismissRecovery: () => void;
}

const QuickWorkoutContext = createContext<QuickWorkoutContextType | null>(null);

const STORAGE_KEY = "gymerr_quick_workout";

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export const QuickWorkoutProvider = ({ children }: { children: ReactNode }) => {
  const [isActive, setIsActive] = useState(false);
  const [workoutId, setWorkoutId] = useState<string | null>(null);
  const [exercises, setExercises] = useState<string[]>([]);
  const [sets, setSets] = useState<QuickWorkoutSet[]>([]);
  const [timer, setTimer] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [userExercises, setUserExercises] = useState<string[]>([]);
  const [isLoadingExercises, setIsLoadingExercises] = useState(false);
  const [pendingExercises, setPendingExercises] = useState<QuickExercise[]>([]);
  const [floatingAction, setFloatingAction] = useState<FloatingAction | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const timerStartRef = useRef<number>(0);

  // Merge preset exercises with user's exercises
  const availableExercises = Array.from(
    new Set([...userExercises, ...PRESET_EXERCISES])
  ).sort();

  // Wake Lock - keep screen on during workout
  useEffect(() => {
    const requestWakeLock = async () => {
      if (isActive && "wakeLock" in navigator) {
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

    if (isActive) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && isActive) {
        requestWakeLock();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      releaseWakeLock();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isActive]);

  // Timer effect - uses elapsed time for accuracy when backgrounded
  useEffect(() => {
    if (isActive && timerStartRef.current > 0) {
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
  }, [isActive]);

  // Auto-save to localStorage for crash recovery
  useEffect(() => {
    if (isActive && workoutId) {
      const state: QuickWorkoutState = {
        workoutId,
        exercises,
        sets,
        startTime: timerStartRef.current,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [isActive, workoutId, exercises, sets]);

  const hasRecoveryData = (): boolean => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved !== null;
  };

  const recoverWorkout = () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const state: QuickWorkoutState = JSON.parse(saved);
        setWorkoutId(state.workoutId);
        setExercises(state.exercises);
        setSets(state.sets);
        timerStartRef.current = state.startTime;
        setTimer(Math.floor((Date.now() - state.startTime) / 1000));
        setIsActive(true);
      } catch (err) {
        console.error("Failed to recover workout:", err);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  };

  const dismissRecovery = () => {
    localStorage.removeItem(STORAGE_KEY);
  };

  const loadExercises = async () => {
    setIsLoadingExercises(true);
    try {
      const data = await workoutsApi.quickExercises();
      setUserExercises(data.exercises || []);
    } catch (err) {
      console.error("Failed to load exercises:", err);
    } finally {
      setIsLoadingExercises(false);
    }
  };

  const startWorkout = () => {
    const id = generateId();
    setWorkoutId(id);
    setExercises([]);
    setSets([]);
    setTimer(0);
    timerStartRef.current = Date.now();
    setIsActive(true);
  };

  const stopWorkout = () => {
    setIsActive(false);
    timerStartRef.current = 0;
  };

  const addExercise = (name: string) => {
    setExercises((prev) => {
      if (prev.includes(name)) return prev;
      return [...prev, name];
    });
    // Add first set for this exercise
    setSets((prev) => {
      const existingSets = prev.filter((s) => s.exercise === name);
      if (existingSets.length === 0) {
        return [
          ...prev,
          {
            id: generateId(),
            exercise: name,
            set: 1,
            weight: "",
            reps: "",
            rir: "",
            notes: "",
          },
        ];
      }
      return prev;
    });
  };

  const renameExercise = (oldName: string, newName: string) => {
    if (!newName.trim() || oldName === newName) return;

    setExercises((prev) =>
      prev.map((e) => (e === oldName ? newName : e))
    );
    setSets((prev) =>
      prev.map((s) =>
        s.exercise === oldName ? { ...s, exercise: newName } : s
      )
    );
  };

  const removeExercise = (name: string) => {
    setExercises((prev) => prev.filter((e) => e !== name));
    setSets((prev) => prev.filter((s) => s.exercise !== name));
  };

  const addSet = (exercise: string) => {
    setSets((prev) => {
      const existingSets = prev.filter((s) => s.exercise === exercise);
      const newSetNumber = existingSets.length + 1;
      // Copy weight from previous set if available
      const prevSet = existingSets[existingSets.length - 1];
      return [
        ...prev,
        {
          id: generateId(),
          exercise,
          set: newSetNumber,
          weight: prevSet?.weight || "",
          reps: "",
          rir: "",
          notes: "",
        },
      ];
    });
  };

  const removeSet = (setId: string) => {
    setSets((prev) => {
      const setToRemove = prev.find((s) => s.id === setId);
      if (!setToRemove) return prev;

      const filtered = prev.filter((s) => s.id !== setId);

      // Renumber sets for this exercise
      let setNum = 1;
      return filtered.map((s) => {
        if (s.exercise === setToRemove.exercise) {
          return { ...s, set: setNum++ };
        }
        return s;
      });
    });
  };

  const updateSet = (
    setId: string,
    field: "weight" | "reps" | "rir" | "notes",
    value: string
  ) => {
    setSets((prev) =>
      prev.map((s) => (s.id === setId ? { ...s, [field]: value } : s))
    );
  };

  const adjustSetValue = (
    setId: string,
    field: "weight" | "reps" | "rir",
    delta: number
  ) => {
    setSets((prev) =>
      prev.map((s) => {
        if (s.id !== setId) return s;
        const currentValue = parseFloat(s[field]) || 0;
        const newValue = Math.max(0, currentValue + delta);
        return { ...s, [field]: newValue.toString() };
      })
    );
  };

  const completeWorkout = async (): Promise<boolean> => {
    if (!workoutId || sets.length === 0) return false;

    // Filter out sets with no data or no exercise name
    const validSets = sets.filter((s) => s.exercise && (s.weight || s.reps));
    if (validSets.length === 0) return false;

    setIsSaving(true);
    try {
      await workoutsApi.saveQuick({
          workoutId,
          duration: formatDuration(timer),
          sets: validSets.map((s) => ({
            exercise: s.exercise,
            set: s.set,
            weight: s.weight,
            reps: s.reps,
            rir: s.rir,
            notes: s.notes,
          })),
      });

      localStorage.removeItem(STORAGE_KEY);
      setIsActive(false);
      setWorkoutId(null);
      setExercises([]);
      setSets([]);
      setTimer(0);
      timerStartRef.current = 0;
      return true;
    } catch (err) {
      console.error("Failed to save workout:", err);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const discardWorkout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setIsActive(false);
    setWorkoutId(null);
    setExercises([]);
    setSets([]);
    setTimer(0);
    timerStartRef.current = 0;
  };

  return (
    <QuickWorkoutContext.Provider
      value={{
        isActive,
        workoutId,
        exercises,
        sets,
        timer,
        isSaving,
        availableExercises,
        isLoadingExercises,
        pendingExercises,
        setPendingExercises,
        floatingAction,
        setFloatingAction,
        startWorkout,
        stopWorkout,
        addExercise,
        renameExercise,
        removeExercise,
        addSet,
        removeSet,
        updateSet,
        adjustSetValue,
        completeWorkout,
        discardWorkout,
        loadExercises,
        hasRecoveryData,
        recoverWorkout,
        dismissRecovery,
      }}
    >
      {children}
    </QuickWorkoutContext.Provider>
  );
};

export const useQuickWorkout = () => {
  const context = useContext(QuickWorkoutContext);
  if (!context) {
    throw new Error("useQuickWorkout must be used within a QuickWorkoutProvider");
  }
  return context;
};
