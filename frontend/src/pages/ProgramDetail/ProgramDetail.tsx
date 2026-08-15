import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Square,
  CheckCircle2,
  Circle,
  Minus,
  Plus,
  Check,
  MessageSquare,
  Copy,
} from "lucide-react";
import { useSettings } from "../../contexts/SettingsContext";
import styles from "./ProgramDetail.module.css";

interface ExerciseRow {
  rowIndex: number;
  week: number;
  workout: string;
  exercise: string;
  set: number;
  targetReps: number;
  rir: string;
  weight: string;
  repsAchieved: string;
  notes: string;
}

interface Workout {
  name: string;
  exercises: ExerciseRow[];
  isComplete: boolean;
}

interface Week {
  week: number;
  workouts: Workout[];
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

const ProgramDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { weightUnit } = useSettings();
  const [program, setProgram] = useState<Week[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active workout state
  const [activeWorkout, setActiveWorkout] = useState<{
    week: number;
    workout: Workout;
  } | null>(null);
  const [workoutData, setWorkoutData] = useState<Map<number, ExerciseRow>>(
    new Map()
  );
  const [timer, setTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Focus mode state
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [completedSets, setCompletedSets] = useState<Set<number>>(new Set());
  const [showNotes, setShowNotes] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const timerStartRef = useRef<number>(0);

  // Wake Lock - keep screen on during workout
  useEffect(() => {
    const requestWakeLock = async () => {
      if (activeWorkout && 'wakeLock' in navigator) {
        try {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
        } catch (err) {
          console.log('Wake Lock error:', err);
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

    // Re-request wake lock when page becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && activeWorkout) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      releaseWakeLock();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeWorkout]);

  const fetchProgram = useCallback(async () => {
    try {
      const response = await fetch(`/api/programs/${id}`);
      const data = await response.json();

      if (response.ok) {
        setProgram(data.program);
      } else {
        setError(data.error || "Failed to fetch program");
      }
    } catch {
      setError("Network error");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProgram();
  }, [fetchProgram]);

  // Timer effect - uses elapsed time for accuracy when backgrounded
  useEffect(() => {
    if (isTimerRunning) {
      // Store when we started (accounting for any existing time)
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

  // Auto-save effect
  const saveWorkout = useCallback(async () => {
    if (!id || workoutData.size === 0) return;

    setIsSaving(true);
    try {
      const updates = Array.from(workoutData.values()).map((row) => ({
        rowIndex: row.rowIndex,
        weight: row.weight,
        repsAchieved: row.repsAchieved,
        notes: row.notes,
      }));

      await fetch(`/api/programs/${id}/rows`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });

      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setIsSaving(false);
    }
  }, [id, workoutData]);

  useEffect(() => {
    if (hasUnsavedChanges) {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(saveWorkout, 3000);
    }

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [hasUnsavedChanges, saveWorkout]);

  const startWorkout = (week: number, workout: Workout) => {
    const data = new Map<number, ExerciseRow>();
    workout.exercises.forEach((ex) => {
      data.set(ex.rowIndex, { ...ex });
    });
    setWorkoutData(data);
    setActiveWorkout({ week, workout });
    setTimer(0);
    timerStartRef.current = Date.now(); // Reset timer start
    setIsTimerRunning(true);
    setCurrentExerciseIndex(0);
    setCurrentSetIndex(0);
    setCompletedSets(new Set());
    setShowNotes(false);
  };

  const stopWorkout = async () => {
    setIsTimerRunning(false);
    timerStartRef.current = 0; // Reset timer start
    if (hasUnsavedChanges) {
      await saveWorkout();
    }
    await fetchProgram();
    setActiveWorkout(null);
    setWorkoutData(new Map());
    setTimer(0);
    setCompletedSets(new Set());
  };

  const updateExercise = (
    rowIndex: number,
    field: "weight" | "repsAchieved" | "notes",
    value: string
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
  };

  const adjustValue = (
    rowIndex: number,
    field: "weight" | "repsAchieved",
    delta: number
  ) => {
    const row = workoutData.get(rowIndex);
    if (!row) return;

    const currentValue = parseFloat(row[field]) || 0;
    const newValue = Math.max(0, currentValue + delta);
    updateExercise(rowIndex, field, newValue.toString());
  };

  const completeSet = (rowIndex: number) => {
    setCompletedSets((prev) => new Set([...prev, rowIndex]));

    // Auto-advance to next set
    const exercises = Array.from(workoutData.values());
    const groupedByExercise = Object.values(
      exercises.reduce((acc, ex) => {
        if (!acc[ex.exercise]) acc[ex.exercise] = [];
        acc[ex.exercise].push(ex);
        return acc;
      }, {} as Record<string, ExerciseRow[]>)
    );

    const currentExerciseSets = groupedByExercise[currentExerciseIndex];
    if (currentSetIndex < currentExerciseSets.length - 1) {
      setCurrentSetIndex(currentSetIndex + 1);
    } else if (currentExerciseIndex < groupedByExercise.length - 1) {
      setCurrentExerciseIndex(currentExerciseIndex + 1);
      setCurrentSetIndex(0);
    }
    setShowNotes(false);
  };

  const copyFromPreviousSet = (currentSet: ExerciseRow, previousSet: ExerciseRow) => {
    if (previousSet.weight) {
      updateExercise(currentSet.rowIndex, "weight", previousSet.weight);
    }
    if (previousSet.repsAchieved) {
      updateExercise(currentSet.rowIndex, "repsAchieved", previousSet.repsAchieved);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <Loader2 size={24} className={styles.spinner} />
          <span>Loading program...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorState}>
          <p>{error}</p>
          <Link to="/programs" className={styles.backLink}>
            Back to Programs
          </Link>
        </div>
      </div>
    );
  }

  // Active workout view - Focus Mode
  if (activeWorkout) {
    const exercises = Array.from(workoutData.values());
    const groupedByExercise = Object.entries(
      exercises.reduce((acc, ex) => {
        if (!acc[ex.exercise]) acc[ex.exercise] = [];
        acc[ex.exercise].push(ex);
        return acc;
      }, {} as Record<string, ExerciseRow[]>)
    );

    const totalSets = exercises.length;
    const completedCount = completedSets.size;

    const currentExercise = groupedByExercise[currentExerciseIndex];
    const currentExerciseName = currentExercise?.[0] || "";
    const currentExerciseSets = currentExercise?.[1] || [];
    const currentSet = currentExerciseSets[currentSetIndex];
    const previousSet = currentSetIndex > 0 ? currentExerciseSets[currentSetIndex - 1] : null;

    const isSetCompleted = currentSet && completedSets.has(currentSet.rowIndex);

    return (
      <div className={styles.container}>
        {/* Sticky header with timer and exercise info */}
        <div className={styles.stickyHeader}>
          <div className={styles.workoutHeader}>
            <div className={styles.timerSection}>
              <span className={styles.timer}>{formatTime(timer)}</span>
              <div className={styles.timerControls}>
                {isTimerRunning ? (
                  <button
                    onClick={() => setIsTimerRunning(false)}
                    className={styles.timerBtn}
                    aria-label="Pause timer"
                  >
                    <Pause size={18} />
                  </button>
                ) : (
                  <button
                    onClick={() => setIsTimerRunning(true)}
                    className={styles.timerBtn}
                    aria-label="Resume timer"
                  >
                    <Play size={18} />
                  </button>
                )}
                <button onClick={stopWorkout} className={styles.stopBtn}>
                  <Square size={16} />
                  <span>End</span>
                </button>
              </div>
            </div>
            <div className={styles.progressSection}>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${(completedCount / totalSets) * 100}%` }}
                />
              </div>
              <span className={styles.progressText}>
                {completedCount}/{totalSets}
              </span>
              {isSaving && (
                <span className={styles.savingBadge}>Saving...</span>
              )}
            </div>
          </div>

          {/* Exercise navigation */}
          <div className={styles.exerciseNav}>
            <button
              onClick={() => {
                if (currentSetIndex > 0) {
                  setCurrentSetIndex(currentSetIndex - 1);
                } else if (currentExerciseIndex > 0) {
                  setCurrentExerciseIndex(currentExerciseIndex - 1);
                  const prevExerciseSets = groupedByExercise[currentExerciseIndex - 1][1];
                  setCurrentSetIndex(prevExerciseSets.length - 1);
                }
                setShowNotes(false);
              }}
              disabled={currentExerciseIndex === 0 && currentSetIndex === 0}
              className={styles.navBtn}
              aria-label="Previous set"
            >
              <ChevronLeft size={24} />
            </button>

            <div className={styles.exerciseNavInfo}>
              <span className={styles.exerciseNavName}>{currentExerciseName}</span>
              <span className={styles.exerciseNavMeta}>
                Set {currentSetIndex + 1}/{currentExerciseSets.length} · {currentSet?.targetReps} reps @ {currentSet?.rir}
              </span>
            </div>

            <button
              onClick={() => {
                if (currentSetIndex < currentExerciseSets.length - 1) {
                  setCurrentSetIndex(currentSetIndex + 1);
                } else if (currentExerciseIndex < groupedByExercise.length - 1) {
                  setCurrentExerciseIndex(currentExerciseIndex + 1);
                  setCurrentSetIndex(0);
                }
                setShowNotes(false);
              }}
              disabled={
                currentExerciseIndex === groupedByExercise.length - 1 &&
                currentSetIndex === currentExerciseSets.length - 1
              }
              className={styles.navBtn}
              aria-label="Next set"
            >
              <ChevronRight size={24} />
            </button>
          </div>
        </div>

        {/* Set indicators */}
        <div className={styles.setIndicators}>
          {currentExerciseSets.map((set, idx) => (
            <button
              key={set.rowIndex}
              onClick={() => {
                setCurrentSetIndex(idx);
                setShowNotes(false);
              }}
              className={`${styles.setIndicator} ${
                idx === currentSetIndex ? styles.setIndicatorActive : ""
              } ${completedSets.has(set.rowIndex) ? styles.setIndicatorDone : ""}`}
            >
              {completedSets.has(set.rowIndex) ? (
                <Check size={14} />
              ) : (
                set.set
              )}
            </button>
          ))}
        </div>

        {/* Current set input */}
        {currentSet && (
          <div className={styles.focusCard}>
            <div className={styles.focusSetLabel}>
              Set {currentSet.set} of {currentExerciseSets.length}
              {isSetCompleted && (
                <span className={styles.completedBadge}>
                  <Check size={14} /> Done
                </span>
              )}
            </div>

            {/* Copy from previous */}
            {previousSet && workoutData.get(previousSet.rowIndex)?.weight && (
              <button
                onClick={() => copyFromPreviousSet(currentSet, workoutData.get(previousSet.rowIndex)!)}
                className={styles.copyBtn}
              >
                <Copy size={14} />
                Copy from Set {previousSet.set}: {workoutData.get(previousSet.rowIndex)?.weight}{weightUnit} × {workoutData.get(previousSet.rowIndex)?.repsAchieved || previousSet.targetReps}
              </button>
            )}

            <div className={styles.inputSection}>
              {/* Weight */}
              <div className={styles.inputGroup}>
                <span className={styles.inputLabel}>Weight ({weightUnit})</span>
                <div className={styles.stepperRow}>
                  <button
                    onClick={() => adjustValue(currentSet.rowIndex, "weight", -2.5)}
                    className={styles.stepperBtn}
                    aria-label="Decrease weight"
                  >
                    <Minus size={24} />
                  </button>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={workoutData.get(currentSet.rowIndex)?.weight || ""}
                    onChange={(e) => updateExercise(currentSet.rowIndex, "weight", e.target.value)}
                    placeholder="0"
                    className={styles.focusInput}
                  />
                  <button
                    onClick={() => adjustValue(currentSet.rowIndex, "weight", 2.5)}
                    className={styles.stepperBtn}
                    aria-label="Increase weight"
                  >
                    <Plus size={24} />
                  </button>
                </div>
              </div>

              {/* Reps */}
              <div className={styles.inputGroup}>
                <span className={styles.inputLabel}>Reps</span>
                <div className={styles.stepperRow}>
                  <button
                    onClick={() => adjustValue(currentSet.rowIndex, "repsAchieved", -1)}
                    className={styles.stepperBtn}
                    aria-label="Decrease reps"
                  >
                    <Minus size={24} />
                  </button>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={workoutData.get(currentSet.rowIndex)?.repsAchieved || ""}
                    onChange={(e) => updateExercise(currentSet.rowIndex, "repsAchieved", e.target.value)}
                    placeholder={currentSet.targetReps.toString()}
                    className={styles.focusInput}
                  />
                  <button
                    onClick={() => adjustValue(currentSet.rowIndex, "repsAchieved", 1)}
                    className={styles.stepperBtn}
                    aria-label="Increase reps"
                  >
                    <Plus size={24} />
                  </button>
                </div>
              </div>
            </div>

            {/* Notes toggle */}
            <button
              onClick={() => setShowNotes(!showNotes)}
              className={styles.notesToggle}
            >
              <MessageSquare size={16} />
              {showNotes ? "Hide notes" : "Add notes"}
            </button>

            {showNotes && (
              <textarea
                value={workoutData.get(currentSet.rowIndex)?.notes || ""}
                onChange={(e) => updateExercise(currentSet.rowIndex, "notes", e.target.value)}
                placeholder="How did it feel? Any adjustments needed?"
                className={styles.notesTextarea}
                rows={2}
              />
            )}

            {/* Complete button */}
            <button
              onClick={() => completeSet(currentSet.rowIndex)}
              className={`${styles.completeBtn} ${isSetCompleted ? styles.completeBtnDone : ""}`}
            >
              <Check size={24} />
              {isSetCompleted ? "Set Completed" : "Complete Set"}
            </button>
          </div>
        )}

        {/* Quick overview of all exercises */}
        <div className={styles.exerciseOverview}>
          <span className={styles.overviewTitle}>All Exercises</span>
          <div className={styles.overviewList}>
            {groupedByExercise.map(([name, sets], idx) => {
              const completedInExercise = sets.filter(s => completedSets.has(s.rowIndex)).length;
              const isCurrentExercise = idx === currentExerciseIndex;
              return (
                <button
                  key={name}
                  onClick={() => {
                    setCurrentExerciseIndex(idx);
                    setCurrentSetIndex(0);
                    setShowNotes(false);
                  }}
                  className={`${styles.overviewItem} ${isCurrentExercise ? styles.overviewItemActive : ""}`}
                >
                  <span className={styles.overviewName}>{name}</span>
                  <span className={styles.overviewSets}>
                    {completedInExercise}/{sets.length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Program overview
  return (
    <div className={styles.container}>
      <Link to="/programs" className={styles.backLink}>
        <ChevronLeft size={16} />
        Back to Programs
      </Link>

      <div className={styles.programHeader}>
        <h1 className={styles.title}>Program</h1>
      </div>

      <div className={styles.weeksList}>
        {program.map((week) => (
          <div key={week.week} className={styles.weekCard}>
            <div className={styles.weekHeader}>
              <span className={styles.weekTitle}>Week {week.week}</span>
            </div>
            <div className={styles.workoutsList}>
              {week.workouts.map((workout) => (
                <button
                  key={workout.name}
                  onClick={() => startWorkout(week.week, workout)}
                  className={styles.workoutCard}
                >
                  <div className={styles.workoutCardInfo}>
                    {workout.isComplete ? (
                      <CheckCircle2 size={18} className={styles.completeIcon} />
                    ) : (
                      <Circle size={18} className={styles.incompleteIcon} />
                    )}
                    <span className={styles.workoutName}>{workout.name}</span>
                  </div>
                  <Play size={16} className={styles.playIcon} />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProgramDetail;
