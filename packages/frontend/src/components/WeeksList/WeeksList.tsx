import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Play, CheckCircle2, Circle, Dumbbell, X } from "lucide-react";
import { SwipeableDrawer } from "../SwipeableDrawer";
import { useWorkout } from "../../contexts/WorkoutContext";
import { formatDateWithDay } from "../../lib/date";
import type { Workout } from "../../api/workouts";
import styles from "./WeeksList.module.css";

interface WeeksListProps {
  programId: string;
  programName: string;
  workouts: Workout[];
  disabled?: boolean;
}

// Days of week labels (Sun-Sat)
const DAYS = ["S", "M", "T", "W", "T", "F", "S"];

// Get day of week (0=Sun, 6=Sat) from ISO date string
const getDayOfWeek = (dateStr: string): number => {
  const date = new Date(dateStr);
  return date.getDay();
};

export const WeeksList = ({
  programId,
  programName,
  workouts,
  disabled = false,
}: WeeksListProps) => {
  const navigate = useNavigate();
  const { startWorkout } = useWorkout();
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);

  const handleStartWorkout = (workout: Workout) => {
    setSelectedWorkout(null);
    startWorkout(programId, workout, workouts, programName);
    navigate("/workout");
  };

  const handleWorkoutClick = (workout: Workout) => {
    if (workout.date) {
      // Completed workout - go directly to workout page
      handleStartWorkout(workout);
    } else {
      // Incomplete workout - show exercise preview drawer
      setSelectedWorkout(workout);
    }
  };

  // Group workouts by week
  const groupedByWeek = useMemo(() => {
    const groups = new Map<number, Workout[]>();
    for (const workout of workouts) {
      const existing = groups.get(workout.week) || [];
      existing.push(workout);
      groups.set(workout.week, existing);
    }
    return groups;
  }, [workouts]);

  const sortedWeeks = useMemo(() => {
    return [...groupedByWeek.keys()].sort((a, b) => a - b);
  }, [groupedByWeek]);

  // Calculate activity days for each week
  const weekActivityDays = useMemo(() => {
    const result: Record<number, boolean[]> = {};
    for (const [week, weekWorkouts] of groupedByWeek) {
      const days = [false, false, false, false, false, false, false];
      for (const workout of weekWorkouts) {
        if (workout.date) {
          const dayIndex = getDayOfWeek(workout.date);
          days[dayIndex] = true;
        }
      }
      result[week] = days;
    }
    return result;
  }, [groupedByWeek]);

  const workoutExercises = useMemo(() => {
    if (!selectedWorkout) return [];

    return Array.from(
      selectedWorkout.exercises.reduce((exercises, exercise) => {
        const existing = exercises.get(exercise.name);
        if (existing) {
          existing.totalSets += exercise.sets.length;
        } else {
          exercises.set(exercise.name, {
            name: exercise.name,
            totalSets: exercise.sets.length,
            reps: exercise.sets[0]?.targetReps || 0,
            rir: exercise.sets[0]?.targetRir || "0",
          });
        }
        return exercises;
      }, new Map<string, { name: string; totalSets: number; reps: number; rir: string }>()),
    ).map(([, exercise]) => exercise);
  }, [selectedWorkout]);

  // Format duration for display
  const formatDuration = (duration: string) => {
    if (duration.includes(":")) {
      const parts = duration.split(":");
      if (parts.length === 3) {
        const hours = parseInt(parts[0], 10);
        const mins = parseInt(parts[1], 10);
        if (hours > 0) return `${hours}h ${mins}m`;
        return `${mins}m`;
      }
    }
    return duration;
  };

  return (
    <div className={styles.weeksList}>
      {sortedWeeks.map((week) => (
        <div key={week} className={styles.weekCard}>
          <div className={styles.weekHeader}>
            <span className={styles.weekTitle}>Week {week}</span>
            <div className={styles.activitySquares}>
              {DAYS.map((_, idx) => (
                <div
                  key={idx}
                  className={`${styles.activitySquare} ${weekActivityDays[week]?.[idx] ? styles.activitySquareFilled : ""}`}
                  title={["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][idx]}
                />
              ))}
            </div>
          </div>
          <div className={styles.workoutsList}>
            {groupedByWeek.get(week)?.map((workout) => (
              <button
                key={workout.name}
                onClick={() => handleWorkoutClick(workout)}
                className={styles.workoutCard}
                disabled={disabled}
              >
                <div className={styles.workoutCardInfo}>
                  {workout.date ? (
                    <CheckCircle2 size={18} className={styles.completeIcon} />
                  ) : (
                    <Circle size={18} className={styles.incompleteIcon} />
                  )}
                  <div className={styles.workoutCardText}>
                    <span className={styles.workoutName}>{workout.name}</span>
                    {workout.date && (
                      <span className={styles.workoutDate}>
                        {formatDateWithDay(workout.date)}
                        {workout.duration &&
                          ` • ${formatDuration(workout.duration)}`}
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

      <SwipeableDrawer
        isOpen={selectedWorkout !== null}
        onClose={() => setSelectedWorkout(null)}
        maxHeight="100vh"
        dark
      >
        {selectedWorkout && (
          <div className={styles.workoutDrawer}>
            <div className={styles.drawerHeader}>
              <div>
                <span className={styles.drawerEyebrow}>
                  Week {selectedWorkout.week}
                </span>
                <h2 className={styles.drawerTitle}>{selectedWorkout.name}</h2>
              </div>
              <button
                type="button"
                className={styles.drawerClose}
                onClick={() => setSelectedWorkout(null)}
                aria-label="Close workout preview"
              >
                <X size={20} />
              </button>
            </div>

            <div className={styles.exercisePreviewList}>
              {workoutExercises.map((exercise, index) => (
                <div key={exercise.name} className={styles.exercisePreview}>
                  <span className={styles.exerciseNumber}>{index + 1}</span>
                  <div className={styles.exerciseDetails}>
                    <span className={styles.exerciseName}>{exercise.name}</span>
                    <span className={styles.exerciseMeta}>
                      {exercise.totalSets} set
                      {exercise.totalSets === 1 ? "" : "s"} x {exercise.reps}{" "}
                      reps at {exercise.rir} RIR
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              className={styles.startWorkoutButton}
              onClick={() => handleStartWorkout(selectedWorkout)}
            >
              <Dumbbell size={19} />
              Start Workout
              <Play size={17} fill="currentColor" />
            </button>
          </div>
        )}
      </SwipeableDrawer>
    </div>
  );
};
