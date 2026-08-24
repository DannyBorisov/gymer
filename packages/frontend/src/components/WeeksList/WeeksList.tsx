import { useNavigate } from "react-router-dom";
import { Play, CheckCircle2, Circle } from "lucide-react";
import { useWorkout, type Week, type Workout } from "../../contexts/WorkoutContext";
import { formatDateWithDay } from "../../lib/date";
import styles from "./WeeksList.module.css";

interface WeeksListProps {
  programId: string;
  programName: string;
  weeks: Week[];
  disabled?: boolean;
}

export const WeeksList = ({
  programId,
  programName,
  weeks,
  disabled = false,
}: WeeksListProps) => {
  const navigate = useNavigate();
  const { startWorkout } = useWorkout();

  const handleStartWorkout = (week: number, workout: Workout) => {
    startWorkout(programId, week, workout, weeks, programName);
    navigate("/workout");
  };

  return (
    <div className={styles.weeksList}>
      {weeks.map((week) => (
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
    </div>
  );
};
