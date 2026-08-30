import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Play, CheckCircle2, Circle, Dumbbell, X } from "lucide-react";
import { useWorkout, type Week, type Workout } from "../../contexts/WorkoutContext";
import { SwipeableDrawer } from "../SwipeableDrawer";
import { formatDateWithDay } from "../../lib/date";
import styles from "./WeeksList.module.css";

interface WeeksListProps {
  programId: string;
  programName: string;
  weeks: Week[];
  disabled?: boolean;
}

// Days of week labels (Sun-Sat)
const DAYS = ["S", "M", "T", "W", "T", "F", "S"];

// Get day of week (0=Sun, 6=Sat) from DD/MM/YYYY string
const getDayOfWeek = (dateStr: string): number => {
  const [day, month, year] = dateStr.split("/");
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return date.getDay(); // JavaScript: 0=Sunday, 6=Saturday
};

export const WeeksList = ({
  programId,
  programName,
  weeks,
  disabled = false,
}: WeeksListProps) => {
  const navigate = useNavigate();
  const { startWorkout } = useWorkout();
  const [selectedWorkout, setSelectedWorkout] = useState<{
    week: number;
    workout: Workout;
  } | null>(null);

  const handleStartWorkout = (week: number, workout: Workout) => {
    setSelectedWorkout(null);
    startWorkout(programId, week, workout, weeks, programName);
    navigate("/workout");
  };

  // Calculate activity days for each week
  const weekActivityDays = useMemo(() => {
    const result: Record<number, boolean[]> = {};
    for (const week of weeks) {
      const days = [false, false, false, false, false, false, false];
      for (const workout of week.workouts) {
        if (workout.completedDate) {
          const dayIndex = getDayOfWeek(workout.completedDate);
          days[dayIndex] = true;
        }
      }
      result[week.week] = days;
    }
    return result;
  }, [weeks]);

  const workoutExercises = useMemo(() => {
    if (!selectedWorkout) return [];

    return Array.from(
      selectedWorkout.workout.exercises.reduce((exercises, exercise) => {
        const existing = exercises.get(exercise.exercise);
        if (existing) {
          existing.sets += 1;
        } else {
          exercises.set(exercise.exercise, {
            name: exercise.exercise,
            sets: 1,
            reps: exercise.targetReps,
            rir: exercise.rir,
          });
        }
        return exercises;
      }, new Map<string, { name: string; sets: number; reps: number; rir: string }>()),
    ).map(([, exercise]) => exercise);
  }, [selectedWorkout]);

  return (
    <div className={styles.weeksList}>
      {weeks.map((week) => (
        <div key={week.week} className={styles.weekCard}>
          <div className={styles.weekHeader}>
            <span className={styles.weekTitle}>Week {week.week}</span>
            <div className={styles.activitySquares}>
              {DAYS.map((_, idx) => (
                <div
                  key={idx}
                  className={`${styles.activitySquare} ${weekActivityDays[week.week]?.[idx] ? styles.activitySquareFilled : ""}`}
                  title={["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][idx]}
                />
              ))}
            </div>
          </div>
          <div className={styles.workoutsList}>
            {week.workouts.map((workout) => (
              <button
                key={workout.name}
                onClick={() => setSelectedWorkout({ week: week.week, workout })}
                className={styles.workoutCard}
                disabled={disabled}
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
                <span className={styles.drawerEyebrow}>Week {selectedWorkout.week}</span>
                <h2 className={styles.drawerTitle}>{selectedWorkout.workout.name}</h2>
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
                      {exercise.sets} set{exercise.sets === 1 ? "" : "s"} x {exercise.reps} reps at {exercise.rir} RIR
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              className={styles.startWorkoutButton}
              onClick={() =>
                handleStartWorkout(
                  selectedWorkout.week,
                  selectedWorkout.workout,
                )
              }
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
