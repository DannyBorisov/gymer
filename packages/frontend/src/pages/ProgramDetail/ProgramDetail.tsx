import { useState, useEffect, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Loader2, ChevronLeft, Trophy, PartyPopper } from "lucide-react";
import { useWorkout, type Week } from "../../contexts/WorkoutContext";
import { useSettings } from "../../contexts/SettingsContext";
import { WeeksList } from "../../components/WeeksList/WeeksList";
import { ExerciseDrawer } from "../../components/ExerciseDrawer/ExerciseDrawer";
import { SwipeableDrawer } from "../../components/SwipeableDrawer";
import { useGetProgram } from "../../api/programs";
import styles from "./ProgramDetail.module.css";

const ProgramDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeWorkout } = useWorkout();
  const { weightUnit } = useSettings();

  const { data: programResponse, isLoading, error } = useGetProgram<Week[]>(id);
  const program = programResponse?.program || [];
  const programName = programResponse?.name || "Program";

  // 1RM prompt state
  const [showExerciseDrawer, setShowExerciseDrawer] = useState(false);
  const [showWeightDrawer, setShowWeightDrawer] = useState(false);
  const [selected1RMExercise, setSelected1RMExercise] = useState<string | null>(
    null,
  );
  const [oneRMWeight, setOneRMWeight] = useState("");
  const [has1RMBeenPrompted, setHas1RMBeenPrompted] = useState(false);

  // Check if there's an active workout for a different program
  const isWorkoutActiveForDifferentProgram = !!(
    activeWorkout && activeWorkout.programId !== id
  );

  // Check if entire program is complete
  const isProgramComplete = useMemo(() => {
    if (program.length === 0) return false;
    return program.every((week) =>
      week.workouts.every((workout) => workout.isComplete),
    );
  }, [program]);

  // Get all unique exercises from the program for 1RM selection
  const allExercises = useMemo(() => {
    const exercises = new Set<string>();
    program.forEach((week) => {
      week.workouts.forEach((workout) => {
        workout.exercises.forEach((ex) => {
          exercises.add(ex.exercise);
        });
      });
    });
    return Array.from(exercises).sort();
  }, [program]);

  // Show 1RM prompt when program is first completed
  useEffect(() => {
    if (isProgramComplete && !has1RMBeenPrompted && !isLoading) {
      // Small delay to let the UI settle
      const timer = setTimeout(() => {
        setShowExerciseDrawer(true);
        setHas1RMBeenPrompted(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isProgramComplete, has1RMBeenPrompted, isLoading]);

  // Handle exercise selection for 1RM
  const handleExerciseSelect = (exerciseName: string) => {
    setSelected1RMExercise(exerciseName);
    setShowExerciseDrawer(false);
    setShowWeightDrawer(true);
  };

  const handleWeightDrawerClose = () => {
    setShowWeightDrawer(false);
    setSelected1RMExercise(null);
    setOneRMWeight("");
  };

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
          <p>
            {error instanceof Error ? error.message : "Failed to load program"}
          </p>
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

      {/* Program Complete Banner */}
      {isProgramComplete && (
        <div className={styles.completeBanner}>
          <div className={styles.completeBannerContent}>
            <PartyPopper size={24} />
            <div className={styles.completeBannerText}>
              <span className={styles.completeBannerTitle}>
                Program Complete!
              </span>
              <span className={styles.completeBannerSubtitle}>
                Great job finishing all {program.length} weeks
              </span>
            </div>
          </div>
          <button
            className={styles.log1RMBtn}
            onClick={() => setShowExerciseDrawer(true)}
          >
            <Trophy size={16} />
            Log 1RM
          </button>
        </div>
      )}

      <WeeksList
        programId={id!}
        programName={programName}
        weeks={program}
        disabled={isWorkoutActiveForDifferentProgram}
      />

      {/* Exercise Selection Drawer */}
      <ExerciseDrawer
        isOpen={showExerciseDrawer}
        onClose={() => setShowExerciseDrawer(false)}
        onSelect={handleExerciseSelect}
        includeOnly={allExercises}
        multiSelect={false}
      />

      {/* Weight Input Drawer */}
      <SwipeableDrawer
        isOpen={showWeightDrawer}
        onClose={handleWeightDrawerClose}
        maxHeight="50vh"
      >
        <div className={styles.weightDrawer}>
          <div className={styles.weightHeader}>
            <Trophy size={24} className={styles.weightTrophy} />
            <h2 className={styles.weightTitle}>{selected1RMExercise}</h2>
            <p className={styles.weightSubtitle}>Enter your 1RM weight</p>
          </div>

          <div className={styles.weightInputContainer}>
            <input
              type="text"
              inputMode="decimal"
              value={oneRMWeight}
              onChange={(e) => setOneRMWeight(e.target.value)}
              placeholder="0"
              className={styles.weightInput}
              autoFocus
            />
            <span className={styles.weightUnitLabel}>{weightUnit}</span>
          </div>

          <div className={styles.weightActions}>
            <button
              className={styles.weightCancelBtn}
              onClick={handleWeightDrawerClose}
            >
              Cancel
            </button>
          </div>
        </div>
      </SwipeableDrawer>
    </div>
  );
};

export default ProgramDetail;
