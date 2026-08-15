import { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
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
  History,
} from "lucide-react";
import { useSettings } from "../../contexts/SettingsContext";
import { useWorkout } from "../../contexts/WorkoutContext";
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
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

const ProgramDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { weightUnit } = useSettings();
  const {
    activeWorkout,
    workoutData,
    timer,
    isTimerRunning,
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
  } = useWorkout();

  const [program, setProgram] = useState<Week[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [previousStats, setPreviousStats] = useState<
    Map<string, PreviousStats>
  >(new Map());

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
    const completedCount = completedSets.size;
    const isWorkoutComplete = completedCount === totalSets && totalSets > 0;

    const currentExercise = groupedByExercise[currentExerciseIndex];
    const currentExerciseName = currentExercise?.[0] || "";
    const currentExerciseSets = currentExercise?.[1] || [];
    const currentSet = currentExerciseSets[currentSetIndex];
    const previousSet =
      currentSetIndex > 0 ? currentExerciseSets[currentSetIndex - 1] : null;

    const isSetCompleted = currentSet && completedSets.has(currentSet.rowIndex);
    const prevStats = previousStats.get(currentExerciseName);

    return (
      <div className={styles.workoutContainer}>
        {/* Sticky header with timer */}
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

        {/* Workout complete banner */}
        {isWorkoutComplete && (
          <div className={styles.workoutCompleteBanner}>
            <Check size={24} />
            <div>
              <span className={styles.completeTitle}>Workout Complete!</span>
              <span className={styles.completeSubtitle}>All {totalSets} sets finished</span>
            </div>
          </div>
        )}

        {/* Exercise tabs */}
        <div className={styles.exerciseTabs}>
          {groupedByExercise.map(([name, sets], idx) => {
            const completedInExercise = sets.filter((s) =>
              completedSets.has(s.rowIndex),
            ).length;
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
              {completedSets.has(set.rowIndex) ? <Check size={14} /> : set.set}
            </button>
          ))}
        </div>

        {/* Current set input */}
        {currentSet && (
          <div className={`${styles.focusCard} ${isSetCompleted ? styles.focusCardDone : ''}`}>
            <div className={styles.setHeader}>
              <button
                className={styles.setNavBtn}
                onClick={() => setCurrentSetIndex(Math.max(0, currentSetIndex - 1))}
                disabled={currentSetIndex === 0}
              >
                <ChevronLeft size={20} />
              </button>
              <span className={styles.setLabel}>
                Set {currentSet.set}/{currentExerciseSets.length}
                {isSetCompleted && <Check size={14} className={styles.setDoneIcon} />}
              </span>
              <button
                className={styles.setNavBtn}
                onClick={() => setCurrentSetIndex(Math.min(currentExerciseSets.length - 1, currentSetIndex + 1))}
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
                      updateExercise(currentSet.rowIndex, "weight", stats.weight);
                    }
                    if (stats.reps) {
                      updateExercise(currentSet.rowIndex, "repsAchieved", stats.reps);
                    }
                    if (stats.rir) {
                      updateExercise(currentSet.rowIndex, "rirAchieved", stats.rir);
                    }
                  }}
                >
                  <div className={styles.prevStatsHeader}>
                    <History size={14} />
                    <span>
                      Week {prevStats.week}: {prevStats.sets[currentSetIndex].weight}
                      {weightUnit} × {prevStats.sets[currentSetIndex].reps}
                      {prevStats.sets[currentSetIndex].rir &&
                        ` @ ${prevStats.sets[currentSetIndex].rir}`}
                    </span>
                  </div>
                </button>
              )}

              {/* Copy from previous set in current workout */}
              {previousSet && workoutData.get(previousSet.rowIndex)?.weight && (
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
                  Set {previousSet.set}: {workoutData.get(previousSet.rowIndex)?.weight}
                  {weightUnit} × {workoutData.get(previousSet.rowIndex)?.repsAchieved || previousSet.targetReps}
                </button>
              )}
            </div>

            <div className={styles.inputSection}>
              {/* Weight */}
              <div className={styles.inputGroup}>
                <span className={styles.inputLabel}>Weight ({weightUnit})</span>
                <div className={styles.stepperRow}>
                  <button
                    onClick={() =>
                      adjustValue(currentSet.rowIndex, "weight", -2.5)
                    }
                    className={styles.stepperBtn}
                    aria-label="Decrease weight"
                  >
                    <Minus size={24} />
                  </button>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={workoutData.get(currentSet.rowIndex)?.weight || ""}
                    onChange={(e) =>
                      updateExercise(
                        currentSet.rowIndex,
                        "weight",
                        e.target.value,
                      )
                    }
                    placeholder="0"
                    className={styles.focusInput}
                  />
                  <button
                    onClick={() =>
                      adjustValue(currentSet.rowIndex, "weight", 2.5)
                    }
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
                    onClick={() =>
                      adjustValue(currentSet.rowIndex, "repsAchieved", -1)
                    }
                    className={styles.stepperBtn}
                    aria-label="Decrease reps"
                  >
                    <Minus size={24} />
                  </button>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={
                      workoutData.get(currentSet.rowIndex)?.repsAchieved || ""
                    }
                    onChange={(e) =>
                      updateExercise(
                        currentSet.rowIndex,
                        "repsAchieved",
                        e.target.value,
                      )
                    }
                    placeholder={currentSet.targetReps.toString()}
                    className={styles.focusInput}
                  />
                  <button
                    onClick={() =>
                      adjustValue(currentSet.rowIndex, "repsAchieved", 1)
                    }
                    className={styles.stepperBtn}
                    aria-label="Increase reps"
                  >
                    <Plus size={24} />
                  </button>
                </div>
              </div>

              {/* RIR */}
              <div className={styles.inputGroup}>
                <span className={styles.inputLabel}>RIR</span>
                <div className={styles.stepperRow}>
                  <button
                    onClick={() =>
                      adjustValue(currentSet.rowIndex, "rirAchieved", -1)
                    }
                    className={styles.stepperBtn}
                    aria-label="Decrease RIR"
                  >
                    <Minus size={24} />
                  </button>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={
                      workoutData.get(currentSet.rowIndex)?.rirAchieved || ""
                    }
                    onChange={(e) =>
                      updateExercise(
                        currentSet.rowIndex,
                        "rirAchieved",
                        e.target.value,
                      )
                    }
                    placeholder={currentSet.rir}
                    className={styles.focusInput}
                  />
                  <button
                    onClick={() =>
                      adjustValue(currentSet.rowIndex, "rirAchieved", 1)
                    }
                    className={styles.stepperBtn}
                    aria-label="Increase RIR"
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
                onChange={(e) =>
                  updateExercise(currentSet.rowIndex, "notes", e.target.value)
                }
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

            {/* End workout button */}
            <button onClick={handleStopWorkout} className={styles.endWorkoutBtn}>
              <Square size={16} />
              <span>End Workout</span>
            </button>
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
        <h1 className={styles.title}>Program</h1>
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
                        <span className={styles.workoutDate}>{workout.completedDate}</span>
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
