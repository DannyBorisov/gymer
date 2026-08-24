import { useMemo } from "react";
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

// Days of week labels (Mon-Sun)
const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

// Get day of week (0=Mon, 6=Sun) from DD/MM/YYYY string
const getDayOfWeek = (dateStr: string): number => {
  const [day, month, year] = dateStr.split("/");
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  // JavaScript: 0=Sunday, we want 0=Monday
  const jsDay = date.getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
};

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

  return (
    <div className={styles.weeksList}>
      {weeks.map((week) => (
        <div key={week.week} className={styles.weekCard}>
          <div className={styles.weekHeader}>
            <span className={styles.weekTitle}>Week {week.week}</span>
            <div className={styles.activitySquares}>
              {DAYS.map((day, idx) => (
                <div
                  key={idx}
                  className={`${styles.activitySquare} ${weekActivityDays[week.week]?.[idx] ? styles.activitySquareFilled : ""}`}
                  title={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][idx]}
                />
              ))}
            </div>
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
