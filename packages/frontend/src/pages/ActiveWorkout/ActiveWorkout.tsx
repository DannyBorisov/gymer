import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Square,
  Check,
  MessageSquare,
  Copy,
  Timer,
  Plus,
  MoreVertical,
  SkipForward,
  History,
  Clock,
  Trophy,
  TrendingUp,
} from "lucide-react";
import { useSettings } from "../../contexts/SettingsContext";
import {
  useWorkout,
  type ExerciseRow,
  type QuickExercise,
} from "../../contexts/WorkoutContext";
import { ExerciseDrawer } from "../../components/ExerciseDrawer/ExerciseDrawer";
import { SwipeableDrawer } from "../../components/SwipeableDrawer";
import { ScrollableInput } from "../../components/ScrollableInput";
import { formatTime, formatRestTimer } from "../../lib/time";
import { updateExerciseName } from "../../utils/liveActivity";
import { announceTime } from "../../utils/speech";
import { Haptics, NotificationType } from "@capacitor/haptics";
import styles from "./ActiveWorkout.module.css";
import useClickOutside from "../../hooks/useClickOutside";

const ActiveWorkout = () => {
  const navigate = useNavigate();
  const { weightUnit, restTimerDuration, restTimerAnnounceInterval } =
    useSettings();
  const {
    activeWorkout,
    workoutData,
    timer,
    duration,
    currentExerciseIndex,
    currentSetIndex,
    previousStats,
    exerciseBests,
    isQuickWorkout,
    restTimer,
    isRestTimerActive,
    startRestTimer,
    stopRestTimer,
    stopWorkout,
    updateExercise,
    adjustValue,
    completeSet,
    completeWorkout,
    setCurrentExerciseIndex,
    setCurrentSetIndex,
    addExerciseToWorkout,
  } = useWorkout();

  const [showNotes, setShowNotes] = useState(false);
  const [showSetComplete, setShowSetComplete] = useState(false);
  const [isPR, setIsPR] = useState(false);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showPreviousWorkout, setShowPreviousWorkout] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const celebratedPRExercises = useRef(new Set<string>());

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
    celebratedPRExercises.current.clear();
  }, [activeWorkout?.programId, activeWorkout?.workout.name]);

  // Wrapper to handle UI state when starting rest timer
  const handleStartRestTimer = (exerciseName: string) => {
    startRestTimer(exerciseName, restTimerDuration, restTimerAnnounceInterval);
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

  useClickOutside(moreMenuRef.current, setShowMoreMenu);

  // Update Live Activity when exercise changes
  useEffect(() => {
    if (activeWorkout && currentExerciseIndex >= 0 && !isRestTimerActive) {
      // Get exercise name from workoutData
      const exerciseNames = [...new Set(workoutData.map((e) => e.exercise))];
      const exerciseName = exerciseNames[currentExerciseIndex];
      if (exerciseName) {
        updateExerciseName(exerciseName, activeWorkout.workout.name);
      }
    }
  }, [currentExerciseIndex, activeWorkout, isRestTimerActive, workoutData]);

  // Calculate estimated 1RM using Epley formula
  const calculateE1RM = (weight: number, reps: number): number => {
    if (reps <= 0 || weight <= 0) return 0;
    if (reps === 1) return weight;
    return weight * (1 + reps / 30);
  };

  // Check for PR using estimated 1RM comparison against all-time bests
  const checkForPR = (rowIndex: number): boolean => {
    const row = workoutData.find((r) => r.rowIndex === rowIndex);
    if (!row) return false;

    const exerciseName = row.exercise;
    const exerciseBest = workoutData
      .filter((exerciseRow) => exerciseRow.exercise === exerciseName)
      .reduce((bestE1RM, exerciseRow) => {
        const weight = parseFloat(exerciseRow.weight) || 0;
        const reps = parseFloat(exerciseRow.repsAchieved) || 0;
        return Math.max(bestE1RM, calculateE1RM(weight, reps));
      }, 0);

    if (exerciseBest <= 0) return false;

    const best = exerciseBests[exerciseName];

    if (celebratedPRExercises.current.has(exerciseName)) {
      return false;
    }

    // No previous data means this is the first recorded best for the exercise.
    if (!best) {
      celebratedPRExercises.current.add(exerciseName);
      return true;
    }

    // Compare the best set in this exercise against the historical best.
    if (exerciseBest > best.e1rm) {
      celebratedPRExercises.current.add(exerciseName);
      return true;
    }

    return false;
  };

  // Handle completing a set, celebrating only at the end of an exercise.
  const handleCompleteSet = (rowIndex: number, isExerciseComplete: boolean) => {
    if (!isExerciseComplete) {
      setIsPR(false);
      setShowSetComplete(true);
      completeSet(rowIndex);
      setTimeout(() => setShowSetComplete(false), 400);
      return;
    }

    const pr = checkForPR(rowIndex);
    setIsPR(pr);
    setShowSetComplete(true);
    if (pr) {
      void Haptics.notification({ type: NotificationType.Success });
    }
    completeSet(rowIndex);

    setTimeout(
      () => {
        setShowSetComplete(false);
        setIsPR(false);
      },
      pr ? 1800 : 400,
    );
  };

  // Handle complete workout (last set)
  const handleCompleteWorkout = async (rowIndex: number) => {
    const pr = checkForPR(rowIndex);
    setIsPR(pr);
    setShowSetComplete(true);
    if (pr) {
      void Haptics.notification({ type: NotificationType.Success });
    }
    await completeWorkout(rowIndex);

    setTimeout(
      () => {
        setShowSetComplete(false);
        setIsPR(false);
      },
      pr ? 1800 : 400,
    );
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

  const copyFromLastWeek = (
    rowIndex: number,
    stats: {
      weight?: string | number;
      reps?: string | number;
      rir?: string | number;
    },
  ) => {
    if (stats.weight) {
      updateExercise(rowIndex, "weight", String(stats.weight));
    }
    if (stats.reps) {
      updateExercise(rowIndex, "repsAchieved", String(stats.reps));
    }
    if (stats.rir) {
      updateExercise(rowIndex, "rirAchieved", String(stats.rir));
    }
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
        // Total volume (weight × reps)
        const totalVolume = workoutData.reduce((sum, row) => {
          const weight = parseFloat(row.weight) || 0;
          const reps = parseFloat(row.repsAchieved) || 0;
          return sum + weight * reps;
        }, 0);

        // Count PRs using e1RM comparison
        // Track best e1RM per exercise within this workout to avoid counting multiple PRs for same exercise
        const workoutBests = new Map<string, number>();
        let prCount = 0;

        workoutData.forEach((row) => {
          const currentWeight = parseFloat(row.weight) || 0;
          const currentReps = parseFloat(row.repsAchieved) || 0;
          const currentE1RM = calculateE1RM(currentWeight, currentReps);

          if (currentE1RM <= 0) return;

          const exerciseName = row.exercise;
          const historicalBest = exerciseBests[exerciseName]?.e1rm || 0;
          const workoutBest = workoutBests.get(exerciseName) || 0;

          // Only count PR once per exercise (the best set)
          if (currentE1RM > historicalBest && currentE1RM > workoutBest) {
            if (workoutBest === 0) prCount++; // First PR for this exercise
            workoutBests.set(exerciseName, currentE1RM);
          }
        });

        // Average reps in reserve across completed sets.
        const rirsWithData = workoutData
          .map((row) => +row.rirAchieved)
          .filter((rir) => !isNaN(rir));

        const avgRir =
          rirsWithData.length > 0
            ? rirsWithData.reduce((a, b) => a + b, 0) / rirsWithData.length
            : null;
        const averageRir = avgRir !== null ? avgRir.toFixed(1) : null;

        return { totalVolume, prCount, averageRir };
      })()
    : null;

  const currentExercise = groupedByExercise[currentExerciseIndex];
  const previousExercise = groupedByExercise[currentExerciseIndex - 1];
  const currentExerciseName = currentExercise?.[0] || "";
  const currentExerciseSets = currentExercise?.[1] || [];
  const currentSet = currentExerciseSets[currentSetIndex];
  const previousSet =
    currentSetIndex > 0 ? currentExerciseSets[currentSetIndex - 1] : null;

  const currentSetData = currentSet ? getRow(currentSet.rowIndex) : null;
  const isSetCompleted = currentSetData?.weight && currentSetData?.repsAchieved;
  const prevStats = previousStats[currentExerciseName];

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
          {/* More options menu */}
          <div className={styles.moreMenuWrapper} ref={moreMenuRef}>
            <button
              className={styles.moreBtn}
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              aria-label="More options"
            >
              <MoreVertical size={20} />
            </button>
            {showMoreMenu && (
              <div className={styles.moreMenu}>
                {Object.keys(previousStats).length > 0 && (
                  <button
                    className={styles.moreMenuItem}
                    onClick={() => {
                      setShowMoreMenu(false);
                      setShowPreviousWorkout(true);
                    }}
                  >
                    <History size={16} />
                    <span>Previous workout</span>
                  </button>
                )}
                {currentSetIndex < currentExerciseSets.length - 1 && (
                  <button
                    className={styles.moreMenuItem}
                    onClick={() => {
                      setShowMoreMenu(false);
                      setCurrentSetIndex(currentSetIndex + 1);
                    }}
                  >
                    <SkipForward size={16} />
                    <span>Skip set</span>
                  </button>
                )}
                <button
                  className={`${styles.moreMenuItem} ${styles.moreMenuItemDanger}`}
                  onClick={() => {
                    setShowMoreMenu(false);
                    handleStopWorkout();
                  }}
                >
                  <Square size={16} />
                  <span>End workout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Workout complete summary */}
      {isWorkoutComplete && workoutSummary && (
        <div className={styles.workoutSummary}>
          <div className={styles.summaryHeader}>
            <Check size={28} className={styles.summaryCheck} />
            <h2 className={styles.summaryTitle}>Workout Complete!</h2>
          </div>
          <div className={styles.summaryStats}>
            <div className={styles.summaryStat}>
              <Clock size={20} />
              <div className={styles.summaryStatContent}>
                <span className={styles.summaryStatValue}>
                  {duration !== null ? formatTime(duration) : "—"}
                </span>
                <span className={styles.summaryStatLabel}>Duration</span>
              </div>
            </div>
            <div className={styles.summaryStat}>
              <TrendingUp size={20} />
              <div className={styles.summaryStatContent}>
                <span className={styles.summaryStatValue}>
                  {workoutSummary.totalVolume.toLocaleString()} {weightUnit}
                </span>
                <span className={styles.summaryStatLabel}>Total Volume</span>
              </div>
            </div>
            {workoutSummary.prCount > 0 && (
              <div className={`${styles.summaryStat} ${styles.summaryStatPr}`}>
                <Trophy size={20} />
                <div className={styles.summaryStatContent}>
                  <span className={styles.summaryStatValue}>
                    {workoutSummary.prCount} PR
                    {workoutSummary.prCount > 1 ? "s" : ""}
                  </span>
                  <span className={styles.summaryStatLabel}>
                    Personal Records
                  </span>
                </div>
              </div>
            )}
            {workoutSummary.averageRir && (
              <div className={styles.summaryStat}>
                <span className={styles.rirIcon}>RIR</span>
                <div className={styles.summaryStatContent}>
                  <span className={styles.summaryStatValue}>{workoutSummary.averageRir}</span>
                  <span className={styles.summaryStatLabel}>Avg RIR</span>
                </div>
              </div>
            )}
          </div>
          <div className={styles.summaryMeta}>{totalSets} sets completed</div>
        </div>
      )}

      {/* Exercise tabs */}
      <div className={styles.exerciseTabsWrapper}>
        <div className={styles.exerciseTabs} ref={exerciseTabsRef}>
          {groupedByExercise.map(([name, sets], idx) => {
            const completedInExercise = sets.filter((s) => {
              const data = getRow(s.rowIndex);
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

      {/* Target info */}
      {currentSet && (
        <div className={styles.targetInfo}>
          <span className={styles.targetText}>
            {currentSet.targetReps} reps @ {currentSet.rir} RIR
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
              <div
                className={`${styles.setCompleteOverlay} ${isPR ? styles.prOverlay : ""}`}
              >
                <div className={styles.setCompleteIcon}>
                  {isPR ? (
                    <>
                      <Trophy
                        size={48}
                        strokeWidth={2}
                        className={styles.prTrophy}
                      />
                      <span className={styles.prBadge}>
                        New Personal Best in <br />
                        <br />
                        {previousExercise?.[0]}!
                      </span>
                    </>
                  ) : (
                    <Check size={48} strokeWidth={3} />
                  )}
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
              </div>

              {/* Quick fill options */}
              <div className={styles.quickFillContainer}>
                {!isWorkoutComplete && prevStats?.sets[currentSetIndex] && (
                  <button
                    onClick={() =>
                      copyFromLastWeek(
                        currentSet.rowIndex,
                        prevStats.sets[currentSetIndex],
                      )
                    }
                    className={styles.quickFillBtn}
                  >
                    <History size={14} />
                    Last: {prevStats.sets[currentSetIndex].weight}
                    {weightUnit} × {prevStats.sets[currentSetIndex].reps}
                  </button>
                )}
                {!isWorkoutComplete &&
                  previousSet &&
                  getRow(previousSet.rowIndex)?.weight && (
                    <button
                      onClick={() =>
                        copyFromPreviousSet(
                          currentSet,
                          getRow(previousSet.rowIndex)!,
                        )
                      }
                      className={styles.quickFillBtn}
                    >
                      <Copy size={14} />
                      Set {previousSet.set}:{" "}
                      {getRow(previousSet.rowIndex)?.weight}
                      {weightUnit} ×{" "}
                      {getRow(previousSet.rowIndex)?.repsAchieved ||
                        previousSet.targetReps}
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
                    <MessageSquare size={16} />
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
                    <MessageSquare size={16} />
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
                <button
                  onClick={handleStopWorkout}
                  className={styles.backToProgram}
                >
                  Back to Program
                </button>
              )}

              {!isWorkoutComplete && (
                <div className={styles.mainButtonsRow}>
                  <button
                    disabled={
                      !getRow(currentSet.rowIndex)?.weight ||
                      !getRow(currentSet.rowIndex)?.repsAchieved
                    }
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
                    <Check size={24} />
                    {isLastSet
                      ? "Complete workout"
                      : currentSetIndex === currentExerciseSets.length - 1
                        ? "Complete exercise"
                        : "Complete set"}
                  </button>

                  <button
                    onClick={() =>
                      isRestTimerActive
                        ? stopRestTimer(currentExerciseName)
                        : handleStartRestTimer(currentExerciseName)
                    }
                    className={`${styles.restTimerBtn} ${isRestTimerActive ? styles.restTimerBtnActive : ""}`}
                  >
                    <Timer size={20} />
                    <span className={styles.restTimerValue}>
                      {formatRestTimer(restTimer)}
                    </span>
                  </button>
                </div>
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
      <SwipeableDrawer
        isOpen={showPreviousWorkout}
        onClose={() => setShowPreviousWorkout(false)}
        maxHeight="85vh"
        dark
      >
        <div className={styles.prevWorkoutHeader}>
          <div className={styles.prevWorkoutHeaderInfo}>
            <h2 className={styles.prevWorkoutTitle}>Previous Workout</h2>
            <div className={styles.prevWorkoutMeta}>
              <Clock size={14} />
              <span>Week {Object.values(previousStats)[0]?.week}</span>
            </div>
          </div>
        </div>
        <div className={styles.prevWorkoutContent}>
          <div className={styles.prevExerciseList}>
            {Object.entries(previousStats).map(([exerciseName, stats]) => (
              <div key={exerciseName} className={styles.prevExerciseCard}>
                <h3 className={styles.prevExerciseName}>{exerciseName}</h3>
                <div className={styles.prevSetsList}>
                  {stats.sets.map((set, idx) => (
                    <div key={idx} className={styles.prevSetRow}>
                      <span className={styles.prevSetNumber}>{idx + 1}</span>
                      <div className={styles.prevSetDetails}>
                        <span className={styles.prevSetData}>
                          {set.weight}
                          {weightUnit} × {set.reps}
                          {set.rir && (
                            <span className={styles.prevSetRir}>
                              {" "}
                              @ {set.rir} RIR
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </SwipeableDrawer>
    </div>
  );
};

export default ActiveWorkout;
