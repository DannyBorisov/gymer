import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  Play,
  Square,
  CheckCircle2,
  Circle,
  Check,
  MessageSquare,
  Copy,
  History,
  Timer,
  X,
} from "lucide-react";
// Note: Plus/Minus icons moved to ScrollableInput component
import { useSettings } from "../../contexts/SettingsContext";
import { useWorkout } from "../../contexts/WorkoutContext";
import { ScrollableInput } from "../../components/ScrollableInput";
import { apiFetch } from "../../utils/api";
import styles from "./ProgramDetail.module.css";

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
  completedDate: string;
  duration?: string;
}

interface Week {
  week: number;
  workouts: Workout[];
}

interface PreviousStats {
  week: number;
  workout: string;
  sets: { weight: string; reps: string; rir: string }[];
}

const formatTime = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

const formatDateWithDay = (dateStr: string) => {
  // Date is in DD/MM/YYYY format
  const [day, month, year] = dateStr.split("/").map(Number);
  const date = new Date(year, month - 1, day);
  const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
  return `${dayName}, ${dateStr}`;
};

const ProgramDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { weightUnit, showRestSuggestion: restSuggestionEnabled, restTimerDuration } = useSettings();
  const {
    activeWorkout,
    workoutData,
    timer,
    duration,
    currentExerciseIndex,
    currentSetIndex,
    startWorkout,
    stopWorkout,
    updateExercise,
    adjustValue,
    completeSet,
    setCurrentExerciseIndex,
    setCurrentSetIndex,
  } = useWorkout();

  const [program, setProgram] = useState<Week[]>([]);
  const [programName, setProgramName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [previousStats, setPreviousStats] = useState<
    Map<string, PreviousStats>
  >(new Map());
  const [showSetComplete, setShowSetComplete] = useState(false);

  // Rest timer state - use timestamp for background support
  const [restTimer, setRestTimer] = useState(0);
  const [isRestTimerActive, setIsRestTimerActive] = useState(false);
  const [restTimerStartTime, setRestTimerStartTime] = useState<number | null>(null);
  const [showRestSuggestion, setShowRestSuggestion] = useState(false);
  const [triggeredForSet, setTriggeredForSet] = useState<number | null>(null);
  const [hasVibrated, setHasVibrated] = useState(false);
  const restTimerIntervalRef = useRef<ReturnType<typeof setInterval>>();
  const suggestionTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Refs for swipe and auto-scroll
  const exerciseTabsRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const minSwipeDistance = 50;

  const fetchProgram = useCallback(async () => {
    try {
      const response = await apiFetch(`/api/programs/${id}`);
      const data = await response.json();
      if (response.ok) {
        console.log(data)
        setProgram(data.program);
        setProgramName(data.name || "Program");
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

  // Handle input focus - show rest timer suggestion after delay (only once per set)
  const handleInputActivity = useCallback((currentRowIndex: number) => {
    // Don't show if disabled, already active, already showing, or already triggered for this set
    if (!restSuggestionEnabled || isRestTimerActive || showRestSuggestion || triggeredForSet === currentRowIndex) return;

    // Clear any existing timeout
    if (suggestionTimeoutRef.current) {
      clearTimeout(suggestionTimeoutRef.current);
    }

    // Show suggestion after 3 seconds
    suggestionTimeoutRef.current = setTimeout(() => {
      setShowRestSuggestion(true);
      setTriggeredForSet(currentRowIndex);
    }, 3000);
  }, [restSuggestionEnabled, isRestTimerActive, showRestSuggestion, triggeredForSet]);

  // Start rest timer (counts up) - use timestamp for background support
  const startRestTimer = useCallback(() => {
    setRestTimer(0);
    setRestTimerStartTime(Date.now());
    setIsRestTimerActive(true);
    setShowRestSuggestion(false);
    setHasVibrated(false);
    if (suggestionTimeoutRef.current) {
      clearTimeout(suggestionTimeoutRef.current);
    }
  }, []);

  // Stop/dismiss rest timer
  const stopRestTimer = useCallback(() => {
    setIsRestTimerActive(false);
    setRestTimer(0);
    setRestTimerStartTime(null);
    if (restTimerIntervalRef.current) {
      clearInterval(restTimerIntervalRef.current);
    }
  }, []);

  // Swipe gesture handlers for set navigation
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = e.touches[0].clientX;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((totalSets: number, currentIdx: number) => {
    const swipeDistance = touchStartX.current - touchEndX.current;
    if (Math.abs(swipeDistance) > minSwipeDistance) {
      if (swipeDistance > 0 && currentIdx < totalSets - 1) {
        // Swipe left - go to next set
        setCurrentSetIndex(currentIdx + 1);
      } else if (swipeDistance < 0 && currentIdx > 0) {
        // Swipe right - go to previous set
        setCurrentSetIndex(currentIdx - 1);
      }
    }
  }, [setCurrentSetIndex]);

  // Rest timer count up effect - uses timestamp for background support
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

  // Vibrate when rest timer reaches duration
  useEffect(() => {
    if (isRestTimerActive && restTimer === restTimerDuration && !hasVibrated) {
      setHasVibrated(true);
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }
    }
  }, [restTimer, restTimerDuration, isRestTimerActive, hasVibrated]);

  // Reset suggestion state when set changes
  useEffect(() => {
    setShowRestSuggestion(false);
    setTriggeredForSet(null);
    if (suggestionTimeoutRef.current) {
      clearTimeout(suggestionTimeoutRef.current);
    }
  }, [currentSetIndex, currentExerciseIndex]);

  // Auto-scroll to current exercise tab when it changes
  useEffect(() => {
    if (exerciseTabsRef.current) {
      const tabs = exerciseTabsRef.current.children;
      const activeTab = tabs[currentExerciseIndex] as HTMLElement;
      if (activeTab) {
        activeTab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [currentExerciseIndex]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (restTimerIntervalRef.current) {
        clearInterval(restTimerIntervalRef.current);
      }
      if (suggestionTimeoutRef.current) {
        clearTimeout(suggestionTimeoutRef.current);
      }
    };
  }, []);

  // Format rest timer display
  const formatRestTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Handle complete set with animation
  const handleCompleteSet = useCallback(
    (rowIndex: number) => {
      setShowSetComplete(true);
      completeSet(rowIndex);

      // Brief animation then advance
      setTimeout(() => {
        setShowSetComplete(false);
      }, 400);

      // Stop rest timer - user is done resting, moving to next set
      stopRestTimer();
    },
    [completeSet, stopRestTimer]
  );

  const handleStartWorkout = (week: number, workout: Workout) => {
    if (!id) return;
    startWorkout(id, week, workout);

    // Find previous stats for each exercise from earlier weeks
    const stats = new Map<string, PreviousStats>();
    const exerciseNames = [
      ...new Set(workout.exercises.map((e) => e.exercise)),
    ];

    for (const exerciseName of exerciseNames) {
      for (let w = week - 1; w >= 1; w--) {
        const prevWeek = program.find((p) => p.week === w);
        if (!prevWeek) continue;

        for (const prevWorkout of prevWeek.workouts) {
          const prevExercises = prevWorkout.exercises.filter(
            (e) => e.exercise === exerciseName && e.weight && e.repsAchieved,
          );

          if (prevExercises.length > 0) {
            stats.set(exerciseName, {
              week: w,
              workout: prevWorkout.name,
              sets: prevExercises.map((e) => ({
                weight: e.weight,
                reps: e.repsAchieved,
                rir: e.rirAchieved,
              })),
            });
            break;
          }
        }
        if (stats.has(exerciseName)) break;
      }
    }
    setPreviousStats(stats);
  };

  const handleStopWorkout = async () => {
    await stopWorkout();
    await fetchProgram();
  };

  const copyFromPreviousSet = (
    currentSet: ExerciseRow,
    previousSet: ExerciseRow,
  ) => {
    if (previousSet.weight) {
      updateExercise(currentSet.rowIndex, "weight", previousSet.weight);
    }
    if (previousSet.repsAchieved) {
      updateExercise(
        currentSet.rowIndex,
        "repsAchieved",
        previousSet.repsAchieved,
      );
    }
    if (previousSet.rirAchieved) {
      updateExercise(
        currentSet.rowIndex,
        "rirAchieved",
        previousSet.rirAchieved,
      );
    }
  };

  // Check if there's an active workout for a different program
  const isWorkoutActiveForDifferentProgram = !!(
    activeWorkout && activeWorkout.programId !== id
  );

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

  // Active workout view - Focus Mode (only show if workout is for this program)
  if (activeWorkout && activeWorkout.programId === id) {
    const exercises = Array.from(workoutData.values());
    const groupedByExercise = Object.entries(
      exercises.reduce(
        (acc, ex) => {
          if (!acc[ex.exercise]) acc[ex.exercise] = [];
          acc[ex.exercise].push(ex);
          return acc;
        },
        {} as Record<string, ExerciseRow[]>,
      ),
    );

    const totalSets = exercises.length;
    const completedCount = exercises.filter(
      (ex) =>
        workoutData.get(ex.rowIndex)?.weight &&
        workoutData.get(ex.rowIndex)?.repsAchieved,
    ).length;
    const isWorkoutComplete = completedCount === totalSets && totalSets > 0;

    const currentExercise = groupedByExercise[currentExerciseIndex];
    const currentExerciseName = currentExercise?.[0] || "";
    const currentExerciseSets = currentExercise?.[1] || [];
    const currentSet = currentExerciseSets[currentSetIndex];
    const previousSet =
      currentSetIndex > 0 ? currentExerciseSets[currentSetIndex - 1] : null;

    const currentSetData = currentSet
      ? workoutData.get(currentSet.rowIndex)
      : null;
    const isSetCompleted =
      currentSetData?.weight && currentSetData?.repsAchieved;
    const prevStats = previousStats.get(currentExerciseName);

    return (
      <div className={styles.workoutContainer}>
        {/* Sticky header with timer - hide timer when workout complete */}
        {!isWorkoutComplete && (
          <div className={styles.stickyHeader}>
            <div className={styles.workoutHeader}>
              <div className={styles.timerSection}>
                <span className={styles.timer}>{formatTime(timer)}</span>
                {showRestSuggestion && currentSet ? (
                  <div className={styles.restTimerSuggestion}>
                    <button
                      onClick={startRestTimer}
                      className={styles.restTimerSuggestionBtn}
                    >
                      <Timer size={16} />
                      <span>Start rest timer</span>
                    </button>
                    <button
                      onClick={() => setShowRestSuggestion(false)}
                      className={styles.restTimerDismiss}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={isRestTimerActive ? stopRestTimer : startRestTimer}
                    className={`${styles.restTimerBtn} ${isRestTimerActive ? styles.restTimerBtnActive : ''}`}
                  >
                    <Timer size={16} />
                    <span>{isRestTimerActive ? formatRestTimer(restTimer) : 'Rest'}</span>
                  </button>
                )}
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
              </div>
            </div>
          </div>
        )}

        {/* Workout complete banner */}
        {isWorkoutComplete && (
          <div className={styles.workoutCompleteBanner}>
            <Check size={24} />
            <div>
              <span className={styles.completeTitle}>Workout Complete!</span>
              <span className={styles.completeSubtitle}>
                All {totalSets} sets finished{duration !== null && ` • ${formatTime(duration)}`}
              </span>
            </div>
          </div>
        )}

        {/* Exercise tabs */}
        <div className={styles.exerciseTabsWrapper}>
          <div className={styles.exerciseTabs} ref={exerciseTabsRef}>
            {groupedByExercise.map(([name, sets], idx) => {
              const completedInExercise = sets.filter((s) => {
                const data = workoutData.get(s.rowIndex);
                return data?.weight && data?.repsAchieved;
              }).length;
              const isComplete = completedInExercise === sets.length;
              const isCurrent = idx === currentExerciseIndex;
              return (
                <button
                  key={name}
                  onClick={() => {
                    setCurrentExerciseIndex(idx);
                    setCurrentSetIndex(0);
                    setShowNotes(false);
                  }}
                  className={`${styles.exerciseTab} ${isCurrent ? styles.exerciseTabActive : ""} ${isComplete ? styles.exerciseTabDone : ""}`}
                >
                  <span className={styles.exerciseTabName}>{name}</span>
                  <span className={styles.exerciseTabCount}>
                    {completedInExercise}/{sets.length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Current exercise info */}
        <div className={styles.currentExerciseInfo}>
          <span className={styles.currentExerciseName}>
            {currentExerciseName}
          </span>
          <span className={styles.currentExerciseMeta}>
            {currentSet?.targetReps} reps @ {currentSet?.rir}
          </span>
        </div>

        {/* Set indicators */}
        <div className={styles.setIndicators}>
          {currentExerciseSets.map((set, idx) => {
            const setData = workoutData.get(set.rowIndex);
            const setIsDone = setData?.weight && setData?.repsAchieved;
            return (
              <button
                key={set.rowIndex}
                onClick={() => {
                  setCurrentSetIndex(idx);
                  setShowNotes(false);
                }}
                className={`${styles.setIndicator} ${
                  idx === currentSetIndex ? styles.setIndicatorActive : ""
                } ${setIsDone ? styles.setIndicatorDone : ""}`}
              >
                {setIsDone ? <Check size={14} /> : set.set}
              </button>
            );
          })}
        </div>

        {/* Current set input */}
        {currentSet && (
          <div
            className={`${styles.focusCard} ${isSetCompleted ? styles.focusCardDone : ""}`}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={() => handleTouchEnd(currentExerciseSets.length, currentSetIndex)}
          >
            {/* Set complete animation overlay */}
            {showSetComplete && (
              <div className={styles.setCompleteOverlay}>
                <div className={styles.setCompleteIcon}>
                  <Check size={48} strokeWidth={3} />
                </div>
              </div>
            )}
            <div className={styles.inputsCenter}>
            <div className={styles.setHeader}>
              <button
                className={styles.setNavBtn}
                onClick={() =>
                  setCurrentSetIndex(Math.max(0, currentSetIndex - 1))
                }
                disabled={currentSetIndex === 0}
              >
                <ChevronLeft size={20} />
              </button>
              <span className={styles.setLabel}>
                Set {currentSet.set}/{currentExerciseSets.length}
                {isSetCompleted && (
                  <Check size={14} className={styles.setDoneIcon} />
                )}
              </span>
              <button
                className={styles.setNavBtn}
                onClick={() =>
                  setCurrentSetIndex(
                    Math.min(
                      currentExerciseSets.length - 1,
                      currentSetIndex + 1,
                    ),
                  )
                }
                disabled={currentSetIndex === currentExerciseSets.length - 1}
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {/* Quick fill options - fixed height container to prevent layout shift */}
            <div className={styles.quickFillContainer}>
              {/* Previous session stats for this set - clickable to fill */}
              {prevStats && prevStats.sets[currentSetIndex] && (
                <button
                  className={styles.prevStats}
                  onClick={() => {
                    const stats = prevStats.sets[currentSetIndex];
                    if (stats.weight) {
                      updateExercise(
                        currentSet.rowIndex,
                        "weight",
                        stats.weight,
                      );
                    }
                    if (stats.reps) {
                      updateExercise(
                        currentSet.rowIndex,
                        "repsAchieved",
                        stats.reps,
                      );
                    }
                    if (stats.rir) {
                      updateExercise(
                        currentSet.rowIndex,
                        "rirAchieved",
                        stats.rir,
                      );
                    }
                  }}
                >
                  <div className={styles.prevStatsHeader}>
                    <History size={14} />
                    <span>
                      Week {prevStats.week}:{" "}
                      {prevStats.sets[currentSetIndex].weight}
                      {weightUnit} × {prevStats.sets[currentSetIndex].reps}
                      {prevStats.sets[currentSetIndex].rir &&
                        ` @ ${prevStats.sets[currentSetIndex].rir}`}
                    </span>
                  </div>
                </button>
              )}

              {/* Copy from previous set in current workout - hide when workout complete */}
              {!isWorkoutComplete && previousSet && workoutData.get(previousSet.rowIndex)?.weight && (
                <button
                  onClick={() =>
                    copyFromPreviousSet(
                      currentSet,
                      workoutData.get(previousSet.rowIndex)!,
                    )
                  }
                  className={styles.copyBtn}
                >
                  <Copy size={14} />
                  Set {previousSet.set}:{" "}
                  {workoutData.get(previousSet.rowIndex)?.weight}
                  {weightUnit} ×{" "}
                  {workoutData.get(previousSet.rowIndex)?.repsAchieved ||
                    previousSet.targetReps}
                </button>
              )}
            </div>

            <div className={styles.inputSection}>
              <ScrollableInput
                label={weightUnit}
                value={workoutData.get(currentSet.rowIndex)?.weight || ""}
                onChange={(val) =>
                  updateExercise(currentSet.rowIndex, "weight", val)
                }
                onAdjust={(delta) =>
                  adjustValue(currentSet.rowIndex, "weight", delta)
                }
                step={1.25}
                inputMode="decimal"
                placeholder="0"
                onInputActivity={() => handleInputActivity(currentSet.rowIndex)}
              />
              <ScrollableInput
                label="Reps"
                value={workoutData.get(currentSet.rowIndex)?.repsAchieved || ""}
                onChange={(val) =>
                  updateExercise(currentSet.rowIndex, "repsAchieved", val)
                }
                onAdjust={(delta) =>
                  adjustValue(currentSet.rowIndex, "repsAchieved", delta)
                }
                step={1}
                placeholder={currentSet.targetReps.toString()}
                onInputActivity={() => handleInputActivity(currentSet.rowIndex)}
              />
              <ScrollableInput
                label="RIR"
                value={workoutData.get(currentSet.rowIndex)?.rirAchieved || ""}
                onChange={(val) =>
                  updateExercise(currentSet.rowIndex, "rirAchieved", val)
                }
                onAdjust={(delta) =>
                  adjustValue(currentSet.rowIndex, "rirAchieved", delta)
                }
                step={1}
                placeholder={currentSet.rir}
                max={10}
              />
            </div>

            {/* Notes - show toggle during workout, show directly when complete */}
            {isWorkoutComplete ? (
              <div className={styles.notesSection}>
                <div className={styles.notesLabel}>
                  <MessageSquare size={16} />
                  <span>Notes</span>
                </div>
                <textarea
                  value={workoutData.get(currentSet.rowIndex)?.notes || ""}
                  onChange={(e) =>
                    updateExercise(currentSet.rowIndex, "notes", e.target.value)
                  }
                  placeholder="How did it feel? Any adjustments needed?"
                  className={styles.notesTextarea}
                  rows={2}
                />
              </div>
            ) : (
              <>
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
                    onChange={(e) =>
                      updateExercise(currentSet.rowIndex, "notes", e.target.value)
                    }
                    placeholder="How did it feel? Any adjustments needed?"
                    className={styles.notesTextarea}
                    rows={2}
                  />
                )}
              </>
            )}
            </div>

            <div className={styles.buttonsContainer}>
              {isWorkoutComplete && (
                <button onClick={stopWorkout} className={styles.backToProgram}>
                  Back to Program
                </button>
              )}

              {!isWorkoutComplete && (
                <>
                  <button
                    disabled={
                      !workoutData.get(currentSet.rowIndex)?.weight ||
                      !workoutData.get(currentSet.rowIndex)?.repsAchieved
                    }
                    onClick={() => handleCompleteSet(currentSet.rowIndex)}
                    className={`${styles.completeBtn} ${isSetCompleted ? styles.completeBtnDone : ""}`}
                  >
                    <Check size={24} />
                    Complete set
                  </button>

                  <button
                    onClick={handleStopWorkout}
                    className={styles.endWorkoutBtn}
                  >
                    <Square size={16} />
                    <span>End workout</span>
                  </button>
                </>
              )}
            </div>
          </div>
        )}

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
        <h1 className={styles.title}>{programName}</h1>
      </div>

      {/* Show banner if workout is active for different program */}
      {isWorkoutActiveForDifferentProgram && (
        <div className={styles.activeWorkoutBanner}>
          <span>Workout in progress</span>
          <button
            onClick={() => navigate(`/programs/${activeWorkout.programId}`)}
          >
            Return to workout
          </button>
        </div>
      )}

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
                  onClick={() => handleStartWorkout(week.week, workout)}
                  className={styles.workoutCard}
                  disabled={isWorkoutActiveForDifferentProgram}
                >
                  <div className={styles.workoutCardInfo}>
                    {workout.isComplete ? (
                      <CheckCircle2 size={18} className={styles.completeIcon} />
                    ) : (
                      <Circle size={18} className={styles.incompleteIcon} />
                    )}
                    <div className={styles.workoutCardText}>
                      <span className={styles.workoutName}>{workout.name}</span>
                      {workout.completedDate && (
                        <span className={styles.workoutDate}>
                          {formatDateWithDay(workout.completedDate)}
                          {workout.duration && ` • ${workout.duration}`}
                        </span>
                      )}
                    </div>
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
