import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Trash2, ChevronRight } from "lucide-react";
import { useCreateProgram } from "../../hooks/useCreateProgram";
import type { Workout, Exercise } from "../../types/program";
import styles from "./CreateProgram.module.css";

interface ExerciseRowProps {
  exercise: Exercise;
  index: number;
  onUpdate: (field: keyof Exercise, value: string | number) => void;
  onRemove: () => void;
  canRemove: boolean;
}

const ExerciseRow = ({
  exercise,
  index,
  onUpdate,
  onRemove,
  canRemove,
}: ExerciseRowProps) => {
  return (
    <div className={styles.exerciseRow}>
      <span className={styles.exerciseIndex}>{index + 1}</span>
      <input
        type="text"
        value={exercise.name}
        onChange={(e) => onUpdate("name", e.target.value)}
        className={styles.exerciseNameInput}
        placeholder="Exercise name"
      />
      <input
        type="number"
        value={exercise.sets || ""}
        onChange={(e) => onUpdate("sets", Number(e.target.value))}
        className={styles.numberInput}
        placeholder="0"
        min={0}
      />
      <input
        type="number"
        value={exercise.reps || ""}
        onChange={(e) => onUpdate("reps", Number(e.target.value))}
        className={styles.numberInput}
        placeholder="0"
        min={0}
      />
      <input
        type="number"
        value={exercise.rir || ""}
        onChange={(e) => onUpdate("rir", Number(e.target.value))}
        className={styles.numberInput}
        placeholder="0"
        min={0}
        max={10}
      />
      <button
        type="button"
        onClick={onRemove}
        className={styles.removeBtn}
        disabled={!canRemove}
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
};

interface WorkoutSectionProps {
  workout: Workout;
  workoutIndex: number;
  onUpdateName: (name: string) => void;
  onRemove: () => void;
  onAddExercise: () => void;
  onRemoveExercise: (exerciseIndex: number) => void;
  onUpdateExercise: (exerciseIndex: number, field: keyof Exercise, value: string | number) => void;
  canRemove: boolean;
}

const WorkoutSection = ({
  workout,
  workoutIndex,
  onUpdateName,
  onRemove,
  onAddExercise,
  onRemoveExercise,
  onUpdateExercise,
  canRemove,
}: WorkoutSectionProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className={styles.workoutSection}>
      <div className={styles.workoutHeader}>
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={styles.collapseBtn}
        >
          <ChevronRight
            size={16}
            className={`${styles.chevron} ${!isCollapsed ? styles.chevronOpen : ""}`}
          />
        </button>
        <span className={styles.workoutLabel}>Day {workoutIndex + 1}</span>
        <input
          type="text"
          value={workout.name}
          onChange={(e) => onUpdateName(e.target.value)}
          className={styles.workoutNameInput}
          placeholder="Workout name"
        />
        <button
          type="button"
          onClick={onRemove}
          className={styles.removeWorkoutBtn}
          disabled={!canRemove}
        >
          <Trash2 size={14} />
        </button>
      </div>

      {!isCollapsed && (
        <div className={styles.exercisesTable}>
          <div className={styles.tableHeader}>
            <span className={styles.colNum}>#</span>
            <span className={styles.colExercise}>Exercise</span>
            <span className={styles.colSets}>Sets</span>
            <span className={styles.colReps}>Reps</span>
            <span className={styles.colRir}>RIR</span>
            <span className={styles.colAction}></span>
          </div>
          {workout.exercises.map((exercise, exerciseIndex) => (
            <ExerciseRow
              key={exerciseIndex}
              exercise={exercise}
              index={exerciseIndex}
              onUpdate={(field, value) => onUpdateExercise(exerciseIndex, field, value)}
              onRemove={() => onRemoveExercise(exerciseIndex)}
              canRemove={workout.exercises.length > 1}
            />
          ))}
          <button
            type="button"
            onClick={onAddExercise}
            className={styles.addExerciseBtn}
          >
            <Plus size={14} />
            Add Exercise
          </button>
        </div>
      )}
    </div>
  );
};

const CreateProgram = () => {
  const {
    program,
    updateProgramName,
    addWorkout,
    removeWorkout,
    updateWorkoutName,
    addExercise,
    removeExercise,
    updateExercise,
  } = useCreateProgram();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Program:", program);
  };

  return (
    <div className={styles.container}>
      <Link to="/programs" className={styles.backLink}>
        &larr; Back to Programs
      </Link>

      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Create Program</h1>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          type="text"
          value={program.name}
          onChange={(e) => updateProgramName(e.target.value)}
          className={styles.programNameInput}
          placeholder="Program name"
        />

        <div className={styles.workoutsContainer}>
          <div className={styles.workoutsHeader}>
            <span className={styles.workoutsTitle}>Workouts</span>
            <button
              type="button"
              onClick={addWorkout}
              className={styles.addWorkoutBtn}
            >
              <Plus size={14} />
              Add Day
            </button>
          </div>

          {program.workouts.map((workout, workoutIndex) => (
            <WorkoutSection
              key={workoutIndex}
              workout={workout}
              workoutIndex={workoutIndex}
              onUpdateName={(name) => updateWorkoutName(workoutIndex, name)}
              onRemove={() => removeWorkout(workoutIndex)}
              onAddExercise={() => addExercise(workoutIndex)}
              onRemoveExercise={(exerciseIndex) =>
                removeExercise(workoutIndex, exerciseIndex)
              }
              onUpdateExercise={(exerciseIndex, field, value) =>
                updateExercise(workoutIndex, exerciseIndex, field, value)
              }
              canRemove={program.workouts.length > 1}
            />
          ))}
        </div>

        <div className={styles.formActions}>
          <button type="submit" className={styles.submitButton}>
            Create Program
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateProgram;
