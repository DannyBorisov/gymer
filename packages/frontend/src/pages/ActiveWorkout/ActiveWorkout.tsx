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
import { updateRestTimer, updateExerciseName } from "../../utils/liveActivity";
import {
  unlockAudio,
  scheduleRestTimerNotification,
  cancelRestTimerNotification,
} from "../../utils/sound";
import { announceTime } from "../../utils/speech";
import styles from "../ProgramDetail/ProgramDetail.module.css";

const ActiveWorkout = () => {
  const navigate = useNavigate();
  const {
    weightUnit,
    showRestSuggestion: restSuggestionEnabled,
    restTimerDuration,
    restTimerAnnounceInterval,
  } = useSettings();
  const {
    activeWorkout,
    workoutData,
    timer,
    duration,
    currentExerciseIndex,
    currentSetIndex,
    previousStats,
    isQuickWorkout,
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
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showPreviousWorkout, setShowPreviousWorkout] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Rest timer state
  const [restTimer, setRestTimer] = useState(0);
  const [isRestTimerActive, setIsRestTimerActive] = useState(false);
  const [restTimerStartTime, setRestTimerStartTime] = useState<number | null>(
    null,
  );
  const [showRestSuggestion, setShowRestSuggestion] = useState(false);
  const [triggeredForSet, setTriggeredForSet] = useState<number | null>(null);
  const restTimerIntervalRef = useRef<ReturnType<typeof setInterval>>();
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

  // Handle input focus - show rest timer suggestion after delay
  const handleInputActivity = (currentRowIndex: number) => {
    if (
      !restSuggestionEnabled ||
      isRestTimerActive ||
      showRestSuggestion ||
      triggeredForSet === currentRowIndex
    )
      return;

    if (suggestionTimeoutRef.current) {
      clearTimeout(suggestionTimeoutRef.current);
    }

    suggestionTimeoutRef.current = setTimeout(() => {
      setShowRestSuggestion(true);
      setTriggeredForSet(currentRowIndex);
    }, 3000);
  };

  // Start rest timer
  const startRestTimer = (exerciseName: string) => {
    const startTime = Date.now();
    setRestTimer(0);
    setRestTimerStartTime(startTime);
    setIsRestTimerActive(true);
    setShowRestSuggestion(false);
    unlockAudio(); // Unlock audio on iOS for notification sound
    // Schedule background notification with same startTime for sync
    scheduleRestTimerNotification(
      restTimerDuration,
      restTimerAnnounceInterval,
      startTime,
    );
    if (suggestionTimeoutRef.current) {
      clearTimeout(suggestionTimeoutRef.current);
    }
    // Update Live Activity to show rest timer with same start time
    if (activeWorkout) {
      updateRestTimer(
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
    cancelRestTimerNotification(); // Cancel background notification
    if (restTimerIntervalRef.current) {
      clearInterval(restTimerIntervalRef.current);
    }
    // Update Live Activity to hide rest timer
    if (activeWorkout) {
      updateRestTimer(false, activeWorkout.workout.name, exerciseName);
    }
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

  // Voice announcement at intervals during rest timer (web only - native handles its own)
  useEffect(() => {
    // Native plugin handles announcements on iOS/Android
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

  // Reset suggestion state when set changes
  useEffect(() => {
    setShowRestSuggestion(false);
    setTriggeredForSet(null);
    if (suggestionTimeoutRef.current) {
      clearTimeout(suggestionTimeoutRef.current);
    }
  }, [currentSetIndex, currentExerciseIndex]);

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

  // Cleanup on unmount
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

  // Close more menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        moreMenuRef.current &&
        !moreMenuRef.current.contains(event.target as Node)
      ) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  // Handle complete set with animation
  const handleCompleteSet = (rowIndex: number) => {
    setShowSetComplete(true);
    completeSet(rowIndex);

    setTimeout(() => {
      setShowSetComplete(false);
    }, 400);
  };

  // Handle complete workout (last set)
  const handleCompleteWorkout = async (rowIndex: number) => {
    setShowSetComplete(true);
    await completeWorkout(rowIndex);

    setTimeout(() => {
      setShowSetComplete(false);
    }, 400);
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

  const currentExercise = groupedByExercise[currentExerciseIndex];
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
    <div className={styles.workoutContainer}>
      {/* Sticky header with timer */}
      {!isWorkoutComplete && (
        <div className={styles.stickyHeader}>
          <div className={styles.workoutHeader}>
            <div className={styles.timerSection}>
              <span className={styles.timer}>{formatTime(timer)}</span>
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
                        className={styles.moreMenuItemNeutral}
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
                        className={styles.moreMenuItemNeutral}
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
                      className={styles.moreMenuItem}
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
              All {totalSets} sets finished
              {duration !== null && ` • ${formatTime(duration)}`}
            </span>
          </div>
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

      {/* Current exercise info */}
      <div className={styles.currentExerciseInfo}>
        <span className={styles.currentExerciseName}>
          {currentExerciseName}
        </span>
        <span className={styles.currentExerciseMeta}>
          {currentSet?.targetReps} reps @ {currentSet?.rir} RIR
        </span>
      </div>

      {/* Current set input */}
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
                  className={styles.lastWeekBtn}
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
                    className={styles.copyBtn}
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
                onInputActivity={() => handleInputActivity(currentSet.rowIndex)}
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
                onInputActivity={() => handleInputActivity(currentSet.rowIndex)}
                target={currentSet.targetReps}
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
                target={currentSet.rir}
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

                <textarea
                  value={getRow(currentSet.rowIndex)?.notes || ""}
                  onChange={(e) =>
                    updateExercise(currentSet.rowIndex, "notes", e.target.value)
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
                      : handleCompleteSet(currentSet.rowIndex)
                  }
                  className={`${styles.completeBtn} ${isSetCompleted ? styles.completeBtnDone : ""}`}
                >
                  <Check size={24} />
                  {isLastSet ? "Complete workout" : "Complete set"}
                </button>

                <button
                  onClick={() =>
                    isRestTimerActive
                      ? stopRestTimer(currentExerciseName)
                      : startRestTimer(currentExerciseName)
                  }
                  className={`${styles.restTimerRoundBtn} ${isRestTimerActive ? styles.restTimerRoundBtnActive : ""}`}
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
