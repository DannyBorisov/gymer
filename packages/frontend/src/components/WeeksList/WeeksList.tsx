import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Play, CheckCircle2, Circle, Dumbbell } from "lucide-react";
import { useWorkout } from "../../contexts/WorkoutContext";
import { formatDateWithDay } from "../../lib/date";
import { parseExerciseName } from "../../types/shared";
import type { Workout } from "../../api/workouts";
import styles from "./WeeksList.module.css";

interface WeeksListProps {
  programId: string;
  programName: string;
  workouts: Workout[];
  disabled?: boolean;
}

const getExercisesForWorkout = (workout: Workout) => {
  const exercises: Record<
    string,
    { name: string; totalSets: number; reps: number; rir: string }
  > = {};
  for (const exercise of workout.exercises) {
    const existing = exercises[exercise.name];
    if (existing) {
      existing.totalSets += exercise.sets.length;
    } else {
      exercises[exercise.name] = {
        name: exercise.name,
        totalSets: exercise.sets.length,
        reps: exercise.sets[0]?.targetReps || 0,
        rir: exercise.sets[0]?.targetRir || "0",
      };
    }
  }
  return Object.values(exercises);
};

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

export const WeeksList = ({
  programId,
  programName,
  workouts,
  disabled = false,
}: WeeksListProps) => {
  const navigate = useNavigate();
  const { startWorkout } = useWorkout();

  const handleStartWorkout = (workout: Workout) => {
    startWorkout(programId, workout, workouts, programName);
    navigate("/workout");
  };

  // Group workouts by week
  const groupedByWeek = useMemo(() => {
    const groups: Record<number, Workout[]> = {};
    for (const workout of workouts) {
      groups[workout.week] = [...(groups[workout.week] || []), workout];
    }
    return groups;
  }, [workouts]);

  const sortedWeeks = useMemo(() => {
    return Object.keys(groupedByWeek)
      .map(Number)
      .sort((a, b) => a - b);
  }, [groupedByWeek]);

  const [selectedWeek, setSelectedWeek] = useState<number | null>(
    sortedWeeks[0] ?? null,
  );
  const activeWeek =
    selectedWeek !== null && groupedByWeek[selectedWeek]
      ? selectedWeek
      : (sortedWeeks[0] ?? null);

  const weekWorkouts = activeWeek !== null ? groupedByWeek[activeWeek] || [] : [];

  return (
    <div className={styles.weeksList}>
      <div className={styles.weekPills}>
        {sortedWeeks.map((week) => (
          <button
            key={week}
            type="button"
            className={`${styles.weekPill} ${week === activeWeek ? styles.weekPillActive : ""}`}
            onClick={() => setSelectedWeek(week)}
          >
            Week {week}
          </button>
        ))}
      </div>

      <div className={styles.weekWorkouts}>
        {weekWorkouts.map((workout) => {
          const exercises = getExercisesForWorkout(workout);
          return (
            <div key={workout.name} className={styles.dayCard}>
              <div className={styles.dayHeader}>
                <div className={styles.dayHeaderInfo}>
                  {workout.date ? (
                    <CheckCircle2 size={18} className={styles.completeIcon} />
                  ) : (
                    <Circle size={18} className={styles.incompleteIcon} />
                  )}
                  <div className={styles.dayHeaderText}>
                    <span className={styles.dayName}>{workout.name}</span>
                    {workout.date && (
                      <span className={styles.workoutDate}>
                        {formatDateWithDay(workout.date)}
                        {workout.duration &&
                          ` • ${formatDuration(workout.duration)}`}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className={styles.exercisePreviewList}>
                {exercises.map((exercise, index) => {
                  const { name, variant } = parseExerciseName(exercise.name);
                  return (
                    <div key={exercise.name} className={styles.exercisePreview}>
                      <span className={styles.exerciseNumber}>{index + 1}</span>
                      <div className={styles.exerciseDetails}>
                        <span className={styles.exerciseName}>
                          <span className={styles.exerciseNameText}>{name}</span>
                          {variant && (
                            <span className={styles.exerciseVariant}>{variant}</span>
                          )}
                        </span>
                        <span className={styles.exerciseMeta}>
                          {exercise.totalSets} set
                          {exercise.totalSets === 1 ? "" : "s"} x {exercise.reps}{" "}
                          reps at {exercise.rir} RIR
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                className={styles.startWorkoutButton}
                onClick={() => handleStartWorkout(workout)}
                disabled={disabled}
              >
                <Dumbbell size={19} />
                {workout.date ? "View Workout" : "Start Workout"}
                <Play size={17} fill="currentColor" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
