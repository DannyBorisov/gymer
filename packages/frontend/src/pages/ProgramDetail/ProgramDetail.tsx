import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  Loader2,
  ChevronLeft,
  Play,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { useWorkout, type Week, type Workout } from "../../contexts/WorkoutContext";
import { apiFetch } from "../../utils/api";
import { formatDateWithDay } from "../../lib/date";
import styles from "./ProgramDetail.module.css";

const ProgramDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeWorkout, startWorkout } = useWorkout();

  const [program, setProgram] = useState<Week[]>([]);
  const [programName, setProgramName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProgram = async () => {
      try {
        const response = await apiFetch(`/api/programs/${id}`);
        const data = await response.json();
        if (response.ok) {
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
    };
    fetchProgram();
  }, [id]);

  const handleStartWorkout = (week: number, workout: Workout) => {
    if (!id) return;
    startWorkout(id, week, workout, program, programName);
    navigate("/workout");
  };

  // Check if there's an active workout for a different program
  const isWorkoutActiveForDifferentProgram = !!(
    activeWorkout && activeWorkout.programId !== id
  );

  // If workout is active for this program, redirect to workout page
  useEffect(() => {
    if (activeWorkout && activeWorkout.programId === id) {
      navigate("/workout");
    }
  }, [activeWorkout, id, navigate]);

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
          <button onClick={() => navigate("/workout")}>
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
