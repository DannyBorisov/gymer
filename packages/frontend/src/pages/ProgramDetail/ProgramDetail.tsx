import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Loader2, ChevronLeft } from "lucide-react";
import { useWorkout, type Week } from "../../contexts/WorkoutContext";
import { WeeksList } from "../../components/WeeksList/WeeksList";
import { apiFetch } from "../../utils/api";
import styles from "./ProgramDetail.module.css";

const ProgramDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeWorkout } = useWorkout();

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

      <WeeksList
        programId={id!}
        programName={programName}
        weeks={program}
        disabled={isWorkoutActiveForDifferentProgram}
      />
    </div>
  );
};

export default ProgramDetail;
