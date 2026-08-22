import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, ChevronLeft } from "lucide-react";
import { ExerciseDrawer } from "../../components/ExerciseDrawer/ExerciseDrawer";
import { useQuickWorkout } from "../../contexts/QuickWorkoutContext";
import { useWorkout } from "../../contexts/WorkoutContext";
import styles from "./QuickWorkout.module.css";

const QuickWorkout = () => {
  const navigate = useNavigate();
  const { pendingExercises: exercises, setPendingExercises: setExercises, setFloatingAction } = useQuickWorkout();
  const { startQuickWorkout } = useWorkout();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Use ref to avoid stale closure in handler
  const exercisesRef = useRef(exercises);
  exercisesRef.current = exercises;

  // Set up floating action for the nav button
  useEffect(() => {
    setFloatingAction({
      label: "Start Workout",
      enabled: exercisesRef.current.length > 0,
      handler: () => {
        if (exercisesRef.current.length > 0) {
          startQuickWorkout(exercisesRef.current);
          setExercises([]);
          navigate("/workout");
        }
      },
    });

    return () => {
      setFloatingAction(null);
    };
  }, [setFloatingAction, startQuickWorkout, setExercises, navigate]);

  // Update enabled state when exercises change
  useEffect(() => {
    setFloatingAction({
      label: "Start Workout",
      enabled: exercises.length > 0,
      handler: () => {
        if (exercisesRef.current.length > 0) {
          startQuickWorkout(exercisesRef.current);
          setExercises([]);
          navigate("/workout");
        }
      },
    });
  }, [exercises.length, setFloatingAction, startQuickWorkout, setExercises, navigate]);

  const handleAddExercises = (names: string[]) => {
    const newExercises = names.map((name) => ({
      name,
      sets: 3,
      reps: 10,
      rir: 2,
    }));
    setExercises((prev) => [...prev, ...newExercises]);
  };

  const handleUpdateExerciseName = (name: string) => {
    if (editingIndex !== null) {
      setExercises((prev) =>
        prev.map((ex, i) => (i === editingIndex ? { ...ex, name } : ex))
      );
    }
    setEditingIndex(null);
  };

  const handleRemoveExercise = (index: number) => {
    setExercises((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateExercise = (
    index: number,
    field: "sets" | "reps" | "rir",
    value: number
  ) => {
    setExercises((prev) =>
      prev.map((ex, i) => (i === index ? { ...ex, [field]: value } : ex))
    );
  };

  const openAddDrawer = () => {
    setEditingIndex(null);
    setDrawerOpen(true);
  };

  const openEditDrawer = (index: number) => {
    setEditingIndex(index);
    setDrawerOpen(true);
  };

  const existingExerciseNames = exercises.map((e) => e.name);

  return (
    <div className={styles.container}>
      <button onClick={() => navigate("/start-workout")} className={styles.backLink}>
        <ChevronLeft size={16} />
        Back
      </button>

      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Quick Workout</h1>
        <p className={styles.subtitle}>Build your workout, then start training</p>
      </div>

      {/* Exercises Section */}
      <div className={styles.exercisesContainer}>
        <div className={styles.exercisesHeader}>
          <span className={styles.exercisesTitle}>Exercises</span>
          <button onClick={openAddDrawer} className={styles.addExerciseBtn}>
            <Plus size={14} />
            Add Exercises
          </button>
        </div>

        {exercises.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No exercises yet. Add exercises to build your workout.</p>
          </div>
        ) : (
          <div className={styles.exercisesTable}>
            {exercises.map((exercise, index) => (
              <div key={`${exercise.name}-${index}`} className={styles.exerciseRow}>
                <div className={styles.exerciseHeader}>
                  <span className={styles.exerciseIndex}>{index + 1}</span>
                  <input
                    type="text"
                    value={exercise.name}
                    onFocus={() => openEditDrawer(index)}
                    readOnly
                    className={styles.exerciseNameInput}
                    placeholder="Exercise name"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveExercise(index)}
                    className={styles.removeBtn}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className={styles.exerciseInputs}>
                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>Sets</label>
                    <input
                      type="number"
                      value={exercise.sets || ""}
                      onChange={(e) =>
                        handleUpdateExercise(index, "sets", Number(e.target.value))
                      }
                      className={styles.numberInput}
                      placeholder="0"
                      min={1}
                      inputMode="numeric"
                    />
                  </div>
                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>Reps</label>
                    <input
                      type="number"
                      value={exercise.reps || ""}
                      onChange={(e) =>
                        handleUpdateExercise(index, "reps", Number(e.target.value))
                      }
                      className={styles.numberInput}
                      placeholder="0"
                      min={1}
                      inputMode="numeric"
                    />
                  </div>
                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>RIR</label>
                    <input
                      type="number"
                      value={exercise.rir || ""}
                      onChange={(e) =>
                        handleUpdateExercise(index, "rir", Number(e.target.value))
                      }
                      className={styles.numberInput}
                      placeholder="0"
                      min={0}
                      max={10}
                      inputMode="numeric"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Exercise Drawer */}
      <ExerciseDrawer
        isOpen={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setEditingIndex(null);
        }}
        onSelect={handleUpdateExerciseName}
        onSelectMultiple={editingIndex === null ? handleAddExercises : undefined}
        multiSelect={editingIndex === null}
        currentValue={editingIndex !== null ? exercises[editingIndex]?.name : ""}
        excludeExercises={editingIndex === null ? existingExerciseNames : []}
      />
    </div>
  );
};

export default QuickWorkout;
