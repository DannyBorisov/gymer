import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Square,
  Check,
  Timer,
  Plus,
  MoreVertical,
  SkipForward,
  TrendingUp,
  MessageCircle,
} from "lucide-react";
import {
  HistoryIcon,
  ClockIcon,
  CrossIcon,
  BubbleIcon,
} from "../../assets/icons";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { useSettings } from "../../contexts/SettingsContext";
import {
  useWorkout,
  type ExerciseRow,
  type QuickExercise,
} from "../../contexts/WorkoutContext";
import { ExerciseDrawer } from "../../components/ExerciseDrawer/ExerciseDrawer";
import { useExercises } from "../../api/exercises";
import { SwipeableDrawer } from "../../components/SwipeableDrawer";
import {
  WorkoutDetailDrawer,
  type WorkoutDetailData,
} from "../../components/WorkoutDetailDrawer";
import { ScrollableInput } from "../../components/ScrollableInput";
import { Button } from "../../components/ui/Button";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { formatTime, formatRestTimer } from "../../lib/time";
import { MIN_RECORDED_REST_SECONDS, REST_ADJUSTMENT_SECONDS } from "../../lib/constants";
import { updateExerciseName } from "../../utils/liveActivity";
import { announceTime } from "../../utils/speech";
import { hapticLight, hapticHeavy } from "../../utils/haptics";
import { playCompletionSound } from "../../utils/sound";
import { parseExerciseName } from "../../types/shared";
import { CoachChat } from "./CoachChat";
import styles from "./ActiveWorkout.module.css";

const ActiveWorkout = () => {
  const navigate = useNavigate();
  const { weightUnit, restTimerAnnounceInterval } = useSettings();
  const {
    activeWorkout,
    workoutData,
    timer,
    duration,
    currentExerciseIndex,
    currentSetIndex,
    previousStats,
    isQuickWorkout,
    restTimer,
    isRestTimerActive,
    startRestTimer,
    stopRestTimer,
    adjustRestTimer,
    stopWorkout,
    updateExercise,
    adjustValue,
    completeSet,
    completeWorkout,
    setCurrentExerciseIndex,
    setCurrentSetIndex,
    addExerciseToWorkout,
    addSetToExercise,
    swapExercise,
  } = useWorkout();

  const [showNotes, setShowNotes] = useState(false);
  const [isAddingSet, setIsAddingSet] = useState(false);
  const [showAddSetDrawer, setShowAddSetDrawer] = useState(false);
  const [newSetReps, setNewSetReps] = useState("");
  const [newSetRir, setNewSetRir] = useState("");
  const [showSetComplete, setShowSetComplete] = useState(false);
  const [progressionExercise, setProgressionExercise] = useState<{
    name: string;
    type: "weight" | "reps";
    delta: number;
  } | null>(null);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showPreviousWorkout, setShowPreviousWorkout] = useState(false);
  const [showCoachChat, setShowCoachChat] = useState(false);
  const [showSwapExercise, setShowSwapExercise] = useState(false);
  const [restTimeLogged, setRestTimeLogged] = useState<number | null>(null);
  const celebratedProgressionExercises = useRef(new Set<string>());

  const { data: exercisesData } = useExercises();

  const suggestionTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Refs for swipe and auto-scroll
  const exerciseTabsRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const minSwipeDistance = 50;

  // Redirect if no active workout
  useEffect(() => {
    if (!activeWorkout) {
      navigate("/programs");
    }
  }, [activeWorkout, navigate]);

  useEffect(() => {
    celebratedProgressionExercises.current.clear();
  }, [activeWorkout?.programId, activeWorkout?.workoutName]);

  // Wrapper to handle UI state when starting rest timer
  const handleStartRestTimer = (exerciseName: string) => {
    startRestTimer(exerciseName, restTimer, restTimerAnnounceInterval);
  };

  // Swipe gesture handlers for set navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (totalSets: number, currentIdx: number) => {
    const swipeDistance = touchStartX.current - touchEndX.current;
    if (Math.abs(swipeDistance) > minSwipeDistance) {
      if (swipeDistance > 0 && currentIdx < totalSets - 1) {
        setCurrentSetIndex(currentIdx + 1);
      } else if (swipeDistance < 0 && currentIdx > 0) {
        setCurrentSetIndex(currentIdx - 1);
      }
    }
  };

  useEffect(() => {
    const isNative =
      typeof (
        window as unknown as {
          Capacitor?: { isNativePlatform?: () => boolean };
        }
      ).Capacitor?.isNativePlatform === "function" &&
      (
        window as unknown as { Capacitor: { isNativePlatform: () => boolean } }
      ).Capacitor.isNativePlatform();
    if (isNative) return;

    if (
      isRestTimerActive &&
      restTimerAnnounceInterval > 0 &&
      restTimer > 0 &&
      restTimer % restTimerAnnounceInterval === 0
    ) {
      announceTime(restTimer);
    }
  }, [restTimer, isRestTimerActive, restTimerAnnounceInterval]);

  // Auto-scroll to current exercise tab
  useEffect(() => {
    if (exerciseTabsRef.current) {
      const tabs = exerciseTabsRef.current.children;
      const activeTab = tabs[currentExerciseIndex] as HTMLElement;
      if (activeTab) {
        activeTab.scrollIntoView({
          behavior: "smooth",
          inline: "center",
          block: "nearest",
        });
      }
    }
  }, [currentExerciseIndex]);

  // Cleanup suggestion timeout on unmount
  useEffect(() => {
    return () => {
      if (suggestionTimeoutRef.current) {
        clearTimeout(suggestionTimeoutRef.current);
      }
    };
  }, []);

  // Update Live Activity when exercise changes
  useEffect(() => {
    if (activeWorkout && currentExerciseIndex >= 0 && !isRestTimerActive) {
      // Get exercise name from workoutData
      const exerciseNames = [...new Set(workoutData.map((e) => e.exercise))];
      const exerciseName = exerciseNames[currentExerciseIndex];
      if (exerciseName) {
        updateExerciseName(exerciseName, activeWorkout.workoutName);
      }
    }
  }, [currentExerciseIndex, activeWorkout, isRestTimerActive, workoutData]);

  // Check for progression (beating previous workout's weight or reps),
  // returning what actually improved so the celebration can be specific.
  const checkForProgression = (
    exerciseName: string,
  ): { type: "weight" | "reps"; delta: number } | null => {
    // Already celebrated this exercise
    if (celebratedProgressionExercises.current.has(exerciseName)) {
      return null;
    }

    const prevStats = previousStats[exerciseName];
    if (!prevStats) return null; // No previous data to compare

    // Get current exercise sets
    const currentSets = workoutData.filter((r) => r.exercise === exerciseName);

    // Check if any set shows progression
    for (let i = 0; i < currentSets.length; i++) {
      const currentSet = currentSets[i];
      const prevSet = prevStats.sets[i];
      if (!prevSet) continue;

      const currentWeight = parseFloat(currentSet.weight) || 0;
      const currentReps = parseFloat(currentSet.repsAchieved) || 0;
      const prevWeight = parseFloat(prevSet.weight) || 0;
      const prevReps = parseFloat(prevSet.reps) || 0;

      if (currentWeight > prevWeight) {
        celebratedProgressionExercises.current.add(exerciseName);
        return { type: "weight", delta: currentWeight - prevWeight };
      }
      if (currentWeight === prevWeight && currentReps > prevReps) {
        celebratedProgressionExercises.current.add(exerciseName);
        return { type: "reps", delta: currentReps - prevReps };
      }
    }

    return null;
  };

  // Shows the progression toast for a few seconds, then auto-dismisses.
  const celebrateProgression = (
    exerciseName: string,
    progression: { type: "weight" | "reps"; delta: number },
  ) => {
    setProgressionExercise({ name: exerciseName, ...progression });
    void Haptics.notification({ type: NotificationType.Success });
    setTimeout(() => setProgressionExercise(null), 5000);
  };

  // Handle completing a set, celebrating progression at the end of an exercise.
  const handleCompleteSet = (rowIndex: number, isExerciseComplete: boolean) => {
    completeSet(rowIndex);
    setShowSetComplete(true);
    setTimeout(() => setShowSetComplete(false), 1000);

    if (!isExerciseComplete) return;

    // Check progression at end of exercise
    const row = workoutData.find((r) => r.rowIndex === rowIndex);
    const progression = row ? checkForProgression(row.exercise) : null;
    if (row && progression) {
      celebrateProgression(row.exercise, progression);
    }
  };

  // Handle stopping rest timer - show toast if >= 30 seconds
  const handleStopRestTimer = () => {
    const exerciseName = currentExerciseSets[0]?.exercise || "";
    const stoppedAt = stopRestTimer(exerciseName);
    if (stoppedAt >= MIN_RECORDED_REST_SECONDS) {
      hapticHeavy();
      playCompletionSound();
      setRestTimeLogged(stoppedAt);
      setTimeout(() => setRestTimeLogged(null), 3000);
    }
  };

  // Handle complete workout (last set)
  const handleCompleteWorkout = async (rowIndex: number) => {
    setShowSetComplete(true);
    setTimeout(() => setShowSetComplete(false), 400);

    const row = workoutData.find((r) => r.rowIndex === rowIndex);
    const progression = row ? checkForProgression(row.exercise) : null;
    await completeWorkout(rowIndex);

    if (progression && row) {
      celebrateProgression(row.exercise, progression);
    }
  };

  const handleStopWorkout = async () => {
    await stopWorkout();
    if (isQuickWorkout) {
      navigate("/programs");
    } else {
      navigate(`/programs/${activeWorkout?.programId}`);
    }
  };

  const handleAddExercise = (name: string) => {
    const exercise: QuickExercise = {
      name,
      sets: 3,
      reps: 10,
      rir: 2,
    };
    addExerciseToWorkout(exercise);
    setShowAddExercise(false);
  };

  const copyFromPreviousSet = (
    currentSet: ExerciseRow,
    previousSet: ExerciseRow,
  ) => {
    void Haptics.impact({ style: ImpactStyle.Medium });
    // Use != null to allow weight of 0 (bodyweight exercises)
    if (previousSet.weight != null) {
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

  const copyFromLastWeek = (
    rowIndex: number,
    stats: {
      weight?: string | number;
      reps?: string | number;
      rir?: string | number;
    },
  ) => {
    void Haptics.impact({ style: ImpactStyle.Medium });
    // Use != null to allow weight of 0 (bodyweight exercises)
    if (stats.weight != null) updateExercise(rowIndex, "weight", String(stats.weight));
    if (stats.reps) updateExercise(rowIndex, "repsAchieved", String(stats.reps));
    if (stats.rir) updateExercise(rowIndex, "rirAchieved", String(stats.rir));
  };

  if (!activeWorkout) {
    return null;
  }

  // Helper to find row by index
  const getRow = (rowIndex: number) =>
    workoutData.find((r) => r.rowIndex === rowIndex);

  const groupedByExercise = Object.entries(
    workoutData.reduce(
      (acc, ex) => {
        if (!acc[ex.exercise]) acc[ex.exercise] = [];
        acc[ex.exercise].push(ex);
        return acc;
      },
      {} as Record<string, ExerciseRow[]>,
    ),
  );

  const totalSets = workoutData.length;
  const completedCount = workoutData.filter(
    (ex) => ex.weight && ex.repsAchieved,
  ).length;
  const isWorkoutComplete = duration !== null;

  // Calculate workout summary stats
  const workoutSummary = isWorkoutComplete
    ? (() => {
        // Count progressions from celebrated exercises
        const progressionCount = celebratedProgressionExercises.current.size;

        // Average reps in reserve across completed sets.
        const rirsWithData = workoutData
          .map((row) => +row.rirAchieved)
          .filter((rir) => !isNaN(rir));

        const avgRir =
          rirsWithData.length > 0
            ? rirsWithData.reduce((a, b) => a + b, 0) / rirsWithData.length
            : null;
        const averageRir = avgRir !== null ? avgRir.toFixed(1) : null;

        return { progressionCount, averageRir };
      })()
    : null;

  const currentExercise = groupedByExercise[currentExerciseIndex];
  const currentExerciseName = currentExercise?.[0] || "";
  const currentExerciseSets = currentExercise?.[1] || [];
  const currentSet = currentExerciseSets[currentSetIndex];
  const previousSet =
    currentSetIndex > 0 ? currentExerciseSets[currentSetIndex - 1] : null;

  const currentSetData = currentSet ? getRow(currentSet.rowIndex) : null;
  const isSetCompleted = currentSetData?.weight && currentSetData?.repsAchieved;
  const prevStats = previousStats[currentExerciseName];

  // Find muscle group of current exercise for swap filtering
  const currentExerciseMuscleGroup = (() => {
    if (!currentExerciseName || !exercisesData?.exercises) return undefined;
    const { name } = parseExerciseName(currentExerciseName);
    const nameLower = name.toLowerCase();
    // Try exact match first, then partial match
    const exercise = exercisesData.exercises.find(
      (ex) => ex.name.toLowerCase() === nameLower
    ) ?? exercisesData.exercises.find(
      (ex) => ex.name.toLowerCase().includes(nameLower) || nameLower.includes(ex.name.toLowerCase())
    );
    return exercise?.muscleGroup;
  })();

  // Target rest time for current exercise (use first set's target since it's exercise-level)
  const currentTargetRestTime = currentExerciseSets[0]?.targetRestTime;
  const isOverTargetRest = currentTargetRestTime !== undefined && restTimer > currentTargetRestTime;

  // Convert previousStats to WorkoutDetailData for shared drawer
  const previousWorkoutData: WorkoutDetailData | null = useMemo(() => {
    const entries = Object.entries(previousStats);
    if (entries.length === 0) return null;
    const week = entries[0]?.[1]?.week;
    return {
      title: "Previous Workout",
      subtitle: week ? `Week ${week}` : undefined,
      exercises: entries.map(([fullName, stats]) => {
        const { name, variant } = parseExerciseName(fullName);
        return {
          name,
          variant: variant || undefined,
          sets: stats.sets.map((s) => ({
            weight: s.weight,
            reps: s.reps,
            rir: s.rir || undefined,
            notes: s.notes,
            restTime: s.restTime,
          })),
        };
      }),
    };
  }, [previousStats]);

  const handleOpenAddSet = () => {
    if (!currentExerciseName) return;
    const lastSet = currentExerciseSets[currentExerciseSets.length - 1];
    setNewSetReps(lastSet ? String(lastSet.targetReps) : "");
    setNewSetRir(lastSet ? lastSet.rir : "");
    setShowAddSetDrawer(true);
  };

  const handleConfirmAddSet = async () => {
    if (!currentExerciseName || isAddingSet) return;
    setIsAddingSet(true);
    try {
      const reps = parseInt(newSetReps, 10);
      await addSetToExercise(
        currentExerciseName,
        isNaN(reps) ? undefined : reps,
        newSetRir.trim() || undefined,
      );
      setShowAddSetDrawer(false);
    } catch (error) {
      console.error("Failed to add set:", error);
    } finally {
      setIsAddingSet(false);
    }
  };

  // Check if all OTHER sets are complete
  const isLastSet =
    currentSet &&
    workoutData.every(
      (ex) =>
        ex.rowIndex === currentSet.rowIndex || (ex.weight && ex.repsAchieved),
    );

  return (
    <div className={styles.container}>
      {/* Header with timer and progress */}
      {!isWorkoutComplete && (
        <div className={styles.header}>
          <span className={styles.timer}>{formatTime(timer)}</span>
          <div className={styles.progress}>
            <ProgressBar
              value={completedCount}
              max={totalSets}
              className={styles.progressBar}
              fillClassName={styles.progressFill}
            />
            <span className={styles.progressText}>
              {completedCount}/{totalSets}
            </span>
          </div>
          {/* Header buttons */}
          <div className={styles.headerButtons}>
            <button
              className={styles.chatBtn}
              onClick={() => setShowCoachChat(true)}
              aria-label="Ask coach"
              title="Ask coach"
            >
              <MessageCircle size={20} />
            </button>
            <button
              className={styles.moreBtn}
              onClick={() => setShowMoreMenu(true)}
              aria-label="More options"
            >
              <MoreVertical size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Workout complete summary */}
      {isWorkoutComplete && workoutSummary && (
        <div className={styles.workoutSummary}>
          <div className={styles.summaryCheckWrapper}>
            <div className={styles.summaryCheckCircle} />
            <Check size={28} strokeWidth={3} className={styles.summaryCheck} />
          </div>
          <div className={styles.summaryHeader}>
            <h2 className={styles.summaryTitle}>Workout Complete!</h2>
            {activeWorkout?.workoutName && (
              <p className={styles.summarySubtitle}>
                {activeWorkout.workoutName}
              </p>
            )}
          </div>
          <div className={styles.summaryStats}>
            <div className={styles.summaryStat}>
              <div className={styles.summaryStatIcon}>
                <ClockIcon size={18} />
              </div>
              <div className={styles.summaryStatContent}>
                <span className={styles.summaryStatValue}>
                  {duration !== null ? formatTime(duration) : "—"}
                </span>
                <span className={styles.summaryStatLabel}>Duration</span>
              </div>
            </div>
            <div className={styles.summaryStat}>
              <div className={styles.summaryStatIcon}>
                <span className={styles.setsIcon}>#</span>
              </div>
              <div className={styles.summaryStatContent}>
                <span className={styles.summaryStatValue}>
                  {completedCount}
                </span>
                <span className={styles.summaryStatLabel}>Sets</span>
              </div>
            </div>
            {workoutSummary.averageRir !== null && (
              <div className={styles.summaryStat}>
                <div className={styles.summaryStatIcon}>
                  <span className={styles.rirIcon}>RIR</span>
                </div>
                <div className={styles.summaryStatContent}>
                  <span className={styles.summaryStatValue}>
                    {workoutSummary.averageRir}
                  </span>
                  <span className={styles.summaryStatLabel}>Avg</span>
                </div>
              </div>
            )}
            {workoutSummary.progressionCount > 0 && (
              <div
                className={`${styles.summaryStat} ${styles.summaryStatProgression}`}
              >
                <div className={styles.summaryStatIcon}>
                  <TrendingUp size={18} />
                </div>
                <div className={styles.summaryStatContent}>
                  <span className={styles.summaryStatValue}>
                    {workoutSummary.progressionCount}
                  </span>
                  <span className={styles.summaryStatLabel}>
                    PR{workoutSummary.progressionCount > 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Exercise tabs */}
      <div className={styles.exerciseTabsWrapper}>
        <div className={styles.exerciseTabs} ref={exerciseTabsRef}>
          {groupedByExercise.map(([fullName, sets], idx) => {
            const { name, variant } = parseExerciseName(fullName);
            const completedInExercise = sets.filter((s) => {
              const data = getRow(s.rowIndex);
              return data?.weight && data?.repsAchieved;
            }).length;
            const isComplete = completedInExercise === sets.length;
            const isCurrent = idx === currentExerciseIndex;
            return (
              <button
                key={fullName}
                onClick={() => {
                  setCurrentExerciseIndex(idx);
                  setCurrentSetIndex(0);
                  setShowNotes(false);
                }}
                className={`${styles.exerciseTab} ${isCurrent ? styles.exerciseTabActive : ""} ${isComplete ? styles.exerciseTabDone : ""}`}
              >
                <span className={styles.exerciseTabName}>{name}</span>
                {variant && (
                  <span className={styles.exerciseVariant}>{variant}</span>
                )}
              </button>
            );
          })}
          {!isWorkoutComplete && (
            <button
              onClick={() => setShowAddExercise(true)}
              className={styles.addExerciseTab}
            >
              <Plus size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Current exercise + target */}
      {currentSet && (
        <div className={styles.currentExercise}>
          {(() => {
            const { name, variant } = parseExerciseName(currentExerciseName);
            return (
              <button
                className={styles.currentExerciseNameBtn}
                onClick={() => !isWorkoutComplete && setShowSwapExercise(true)}
                disabled={isWorkoutComplete}
              >
                <h2 className={styles.currentExerciseName}>
                  {name}
                  {variant && (
                    <span className={styles.currentExerciseVariant}>
                      {variant}
                    </span>
                  )}
                </h2>
              </button>
            );
          })()}
          <span className={styles.targetText}>
            {currentSet.targetReps} reps @ {currentSet.rir} RIR
          </span>
        </div>
      )}

      {/* Progression notification */}
      {progressionExercise && (
        <div
          className={styles.progressionToast}
          role="status"
          aria-live="polite"
        >
          <TrendingUp size={16} className={styles.progressionToastIcon} />
          <div className={styles.tipContent}>
            <span className={styles.progressionToastLabel}>Progression</span>
            <p className={styles.tipText}>
              {parseExerciseName(progressionExercise.name).name} —{" "}
              {progressionExercise.type === "weight"
                ? `+${progressionExercise.delta}${weightUnit} heavier than last time`
                : `${progressionExercise.delta} more rep${progressionExercise.delta === 1 ? "" : "s"} than last time`}
            </p>
          </div>
          <button
            className={styles.tipClose}
            onClick={() => setProgressionExercise(null)}
            aria-label="Dismiss"
          >
            <CrossIcon size={14} />
          </button>
        </div>
      )}

      {/* Rest time logged notification */}
      {restTimeLogged !== null && (
        <div
          className={styles.restTimeToast}
          role="status"
          aria-live="polite"
        >
          <Timer size={16} className={styles.restTimeToastIcon} />
          <span className={styles.restTimeToastText}>
            Rest logged: {formatRestTimer(restTimeLogged)}
          </span>
        </div>
      )}

      {/* Main content area */}
      <div className={styles.mainContent}>
        {currentSet && (
          <div
            className={`${styles.focusCard} ${isSetCompleted ? styles.focusCardDone : ""}`}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={() =>
              handleTouchEnd(currentExerciseSets.length, currentSetIndex)
            }
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
              {/* Set dots */}
              <div className={styles.setDots}>
                {currentExerciseSets.map((set, idx) => {
                  const setData = getRow(set.rowIndex);
                  const setIsDone = setData?.weight && setData?.repsAchieved;
                  return (
                    <button
                      key={set.rowIndex}
                      onClick={() => {
                        setCurrentSetIndex(idx);
                        setShowNotes(false);
                      }}
                      className={`${styles.setDot} ${
                        idx === currentSetIndex ? styles.setDotActive : ""
                      } ${setIsDone ? styles.setDotDone : ""}`}
                      aria-label={`Set ${set.set}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
                {!isQuickWorkout && (
                  <button
                    onClick={handleOpenAddSet}
                    disabled={isAddingSet}
                    className={styles.setDotAdd}
                    aria-label="Add a set"
                  >
                    <Plus size={14} />
                  </button>
                )}
              </div>

              <div className={styles.inputSection}>
                <ScrollableInput
                  label={weightUnit}
                  value={getRow(currentSet.rowIndex)?.weight || ""}
                  onChange={(val) =>
                    updateExercise(currentSet.rowIndex, "weight", val)
                  }
                  onAdjust={(delta) =>
                    adjustValue(currentSet.rowIndex, "weight", delta)
                  }
                  step={0.25}
                  inputMode="decimal"
                  placeholder="0"
                  dark
                />
                <ScrollableInput
                  label="Reps"
                  value={getRow(currentSet.rowIndex)?.repsAchieved || ""}
                  onChange={(val) =>
                    updateExercise(currentSet.rowIndex, "repsAchieved", val)
                  }
                  onAdjust={(delta) =>
                    adjustValue(currentSet.rowIndex, "repsAchieved", delta)
                  }
                  step={1}
                  placeholder={currentSet.targetReps.toString()}
                  dark
                />
                <ScrollableInput
                  label="RIR"
                  labelInfo="Reps in Reserve — how many more reps you could have done before failure."
                  value={getRow(currentSet.rowIndex)?.rirAchieved || ""}
                  onChange={(val) =>
                    updateExercise(currentSet.rowIndex, "rirAchieved", val)
                  }
                  onAdjust={(delta) =>
                    adjustValue(currentSet.rowIndex, "rirAchieved", delta)
                  }
                  step={1}
                  placeholder={currentSet.rir}
                  max={10}
                  dark
                />
              </div>

              {/* Notes */}
              {isWorkoutComplete ? (
                <div className={styles.notesSection}>
                  <div className={styles.notesLabel}>
                    <BubbleIcon size={16} />
                    <span>Notes</span>
                  </div>
                  <textarea
                    value={getRow(currentSet.rowIndex)?.notes || ""}
                    onChange={(e) =>
                      updateExercise(
                        currentSet.rowIndex,
                        "notes",
                        e.target.value,
                      )
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
                    <BubbleIcon size={16} />
                    {showNotes ? "Hide notes" : "Add notes"}
                  </button>

                  <textarea
                    value={getRow(currentSet.rowIndex)?.notes || ""}
                    onChange={(e) =>
                      updateExercise(
                        currentSet.rowIndex,
                        "notes",
                        e.target.value,
                      )
                    }
                    placeholder="How did it feel? Any adjustments needed?"
                    className={`${styles.notesTextarea} ${!showNotes ? styles.notesHidden : ""}`}
                    rows={2}
                  />
                </>
              )}
            </div>

            <div className={styles.buttonsContainer}>
              {isWorkoutComplete && (
                <Button onClick={handleStopWorkout}>Back to Program</Button>
              )}

              {!isWorkoutComplete && (
                <>
                  {/* Secondary row: quick fill + rest timer adjust */}
                  <div className={styles.secondaryButtonsRow}>
                    {/* Quick fill buttons */}
                    {(prevStats?.sets[currentSetIndex] || (previousSet && getRow(previousSet.rowIndex)?.repsAchieved)) && (
                      <div className={styles.quickFillGroup}>
                        {prevStats?.sets[currentSetIndex] && (
                          <button
                            className={styles.quickFillBtn}
                            onClick={() =>
                              copyFromLastWeek(
                                currentSet.rowIndex,
                                prevStats.sets[currentSetIndex],
                              )
                            }
                          >
                            <HistoryIcon size={16} />
                            <span className={styles.quickFillBtnText}>
                              {prevStats.sets[currentSetIndex].weight} × {prevStats.sets[currentSetIndex].reps}
                            </span>
                          </button>
                        )}
                        {previousSet && getRow(previousSet.rowIndex)?.repsAchieved && (
                          <button
                            className={styles.quickFillBtn}
                            onClick={() =>
                              copyFromPreviousSet(
                                currentSet,
                                getRow(previousSet.rowIndex)!,
                              )
                            }
                          >
                            <span className={styles.quickFillBtnLabel}>Set {previousSet.set}</span>
                            <span className={styles.quickFillBtnText}>
                              {getRow(previousSet.rowIndex)?.weight} × {getRow(previousSet.rowIndex)?.repsAchieved}
                            </span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Rest timer adjust */}
                    {isRestTimerActive && (
                      <div className={styles.restTimerAdjust}>
                        <button
                          type="button"
                          className={styles.adjustBtn}
                          onClick={() => {
                            adjustRestTimer(-REST_ADJUSTMENT_SECONDS);
                            void hapticLight();
                          }}
                        >
                          -{REST_ADJUSTMENT_SECONDS}
                        </button>
                        <button
                          type="button"
                          className={styles.adjustBtn}
                          onClick={() => {
                            adjustRestTimer(REST_ADJUSTMENT_SECONDS);
                            void hapticLight();
                          }}
                        >
                          +{REST_ADJUSTMENT_SECONDS}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className={styles.mainButtonsRow}>
                    <Button
                      icon={<Check size={24} />}
                      disabled={!getRow(currentSet.rowIndex)?.repsAchieved}
                      onClick={() =>
                        isLastSet
                          ? handleCompleteWorkout(currentSet.rowIndex)
                          : handleCompleteSet(
                              currentSet.rowIndex,
                              currentSetIndex === currentExerciseSets.length - 1,
                            )
                      }
                      className={`${styles.completeBtn} ${isSetCompleted ? styles.completeBtnDone : ""}`}
                    >
                      {isLastSet
                        ? "Complete workout"
                        : currentSetIndex === currentExerciseSets.length - 1
                          ? "Complete exercise"
                          : "Complete set"}
                    </Button>

                    <button
                      onClick={() =>
                        isRestTimerActive
                          ? handleStopRestTimer()
                          : handleStartRestTimer(currentExerciseName)
                      }
                      className={`${styles.restTimerBtn} ${isRestTimerActive ? styles.restTimerBtnActive : ""} ${isOverTargetRest ? styles.restTimerBtnOverTarget : ""}`}
                    >
                      <Timer size={20} className={isOverTargetRest ? styles.timerIconWarning : ""} />
                      <span className={styles.restTimerValue}>
                        {formatRestTimer(restTimer)}
                        {currentTargetRestTime !== undefined && isRestTimerActive && (
                          <span className={styles.restTargetIndicator}>
                            /{formatRestTimer(currentTargetRestTime)}
                          </span>
                        )}
                      </span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add Exercise Drawer */}
      <ExerciseDrawer
        isOpen={showAddExercise}
        onClose={() => setShowAddExercise(false)}
        onSelect={handleAddExercise}
        excludeExercises={groupedByExercise.map(([name]) => name)}
      />

      {/* Previous Workout Drawer */}
      <WorkoutDetailDrawer
        isOpen={showPreviousWorkout}
        onClose={() => setShowPreviousWorkout(false)}
        data={previousWorkoutData}
        weightUnit={weightUnit}
        currentExercise={currentExerciseName}
        currentSetIndex={currentSetIndex}
        dark
      />

      {/* Add Set Drawer */}
      <SwipeableDrawer
        isOpen={showAddSetDrawer}
        onClose={() => setShowAddSetDrawer(false)}
        maxHeight="60vh"
        dark
      >
        <div className={styles.addSetDrawer}>
          <h2 className={styles.addSetTitle}>Add a set</h2>
          <p className={styles.addSetSubtitle}>{currentExerciseName}</p>

          <div className={styles.addSetInputs}>
            <ScrollableInput
              label="Reps"
              value={newSetReps}
              onChange={setNewSetReps}
              onAdjust={(delta) =>
                setNewSetReps((prev) =>
                  String(Math.max(0, (parseInt(prev, 10) || 0) + delta)),
                )
              }
              step={1}
              dark
            />
            <ScrollableInput
              label="RIR"
              labelInfo="Reps in Reserve — how many more reps you could have done before failure."
              value={newSetRir}
              onChange={setNewSetRir}
              onAdjust={(delta) =>
                setNewSetRir((prev) =>
                  String(Math.max(0, (parseInt(prev, 10) || 0) + delta)),
                )
              }
              step={1}
              max={10}
              dark
            />
          </div>

          <Button onClick={handleConfirmAddSet} disabled={isAddingSet}>
            {isAddingSet ? "Adding..." : "Add Set"}
          </Button>
        </div>
      </SwipeableDrawer>

      {/* More Options Drawer */}
      <SwipeableDrawer
        isOpen={showMoreMenu}
        onClose={() => setShowMoreMenu(false)}
        maxHeight="auto"
        dark
      >
        <div className={styles.optionsDrawer}>
          {Object.keys(previousStats).length > 0 && (
            <button
              className={styles.optionItem}
              onClick={() => {
                setShowMoreMenu(false);
                setShowPreviousWorkout(true);
              }}
            >
              <HistoryIcon size={20} />
              <span>Previous workout</span>
            </button>
          )}
          {currentSetIndex < currentExerciseSets.length - 1 && (
            <button
              className={styles.optionItem}
              onClick={() => {
                setShowMoreMenu(false);
                setCurrentSetIndex(currentSetIndex + 1);
              }}
            >
              <SkipForward size={20} />
              <span>Skip set</span>
            </button>
          )}
          <button
            className={`${styles.optionItem} ${styles.optionItemDanger}`}
            onClick={() => {
              setShowMoreMenu(false);
              handleStopWorkout();
            }}
          >
            <Square size={20} />
            <span>End workout</span>
          </button>
        </div>
      </SwipeableDrawer>

      {/* Coach Chat */}
      {activeWorkout && !isQuickWorkout && (
        <CoachChat
          isOpen={showCoachChat}
          onClose={() => setShowCoachChat(false)}
          week={activeWorkout.week}
          workoutName={activeWorkout.workoutName}
          currentExercise={currentExerciseName}
          currentSetIndex={currentSetIndex}
          workoutData={workoutData.map((row) => ({
            exercise: row.exercise,
            setIndex: row.set - 1,
            // Target values
            targetReps: row.targetReps,
            targetRir: row.rir ? parseInt(row.rir, 10) : undefined,
            targetRestTime: row.targetRestTime,
            // Achieved values
            weight: row.weight ? parseFloat(row.weight) : undefined,
            reps: row.repsAchieved ? parseInt(row.repsAchieved, 10) : undefined,
            rir: row.rirAchieved ? parseInt(row.rirAchieved, 10) : undefined,
            restTime: row.achievedRestTime,
            isComplete: !!(row.repsAchieved && parseInt(row.repsAchieved, 10) > 0),
          }))}
        />
      )}

      {/* Swap Exercise Drawer */}
      <ExerciseDrawer
        isOpen={showSwapExercise}
        onClose={() => setShowSwapExercise(false)}
        onSelect={(newName) => swapExercise(currentExerciseName, newName)}
        currentValue={currentExerciseName}
        excludeExercises={[currentExerciseName]}
        title="Swap Exercise"
        filterToMuscleGroup={currentExerciseMuscleGroup}
      />
    </div>
  );
};

export default ActiveWorkout;
