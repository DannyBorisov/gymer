import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Trash2, ChevronRight, Zap } from "lucide-react";
import { useCreateProgram } from "../../hooks/useCreateProgram";
import { presets } from "../../data/presets";
import type { Workout, Exercise, Frequency } from "../../types/program";
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

const frequencyOptions: { value: Frequency; label: string }[] = [
  { value: 1, label: "1x" },
  { value: 2, label: "2x" },
  { value: 3, label: "3x" },
  { value: 4, label: "4x" },
  { value: 5, label: "5x" },
  { value: 6, label: "6x" },
  { value: "every-other-day", label: "EOD" },
];

const CreateProgram = () => {
  const {
    program,
    updateProgramName,
    updateDuration,
    updateFrequency,
    updateDynamicRir,
    updateStartingRir,
    addWorkout,
    removeWorkout,
    updateWorkoutName,
    addExercise,
    removeExercise,
    updateExercise,
    loadProgram,
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

      <div className={styles.presetsSection}>
        <span className={styles.presetsLabel}>Start from a preset:</span>
        <div className={styles.presetsList}>
          {presets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => loadProgram(preset.program)}
              className={styles.presetButton}
            >
              <Zap size={14} />
              <span>{preset.name}</span>
              <span className={styles.presetDescription}>{preset.description}</span>
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          type="text"
          value={program.name}
          onChange={(e) => updateProgramName(e.target.value)}
          className={styles.programNameInput}
          placeholder="Program name"
        />

        <div className={styles.programSettings}>
          <div className={styles.settingGroup}>
            <span className={styles.settingLabel}>Duration</span>
            <div className={styles.durationInput}>
              <input
                type="number"
                value={program.durationWeeks}
                onChange={(e) => updateDuration(Number(e.target.value))}
                className={styles.durationNumber}
                min={1}
                max={52}
              />
              <span className={styles.durationUnit}>weeks</span>
            </div>
          </div>

          <div className={styles.settingDivider} />

          <div className={styles.settingGroup}>
            <span className={styles.settingLabel}>Frequency</span>
            <div className={styles.frequencyOptions}>
              {frequencyOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateFrequency(option.value)}
                  className={`${styles.frequencyOption} ${
                    program.frequency === option.value ? styles.frequencyActive : ""
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.settingDivider} />

          <div className={styles.settingGroup}>
            <span className={styles.settingLabel}>RIR Progression</span>
            <div className={styles.rirControl}>
              <button
                type="button"
                onClick={() => updateDynamicRir(!program.dynamicRir)}
                className={`${styles.rirToggle} ${program.dynamicRir ? styles.rirToggleActive : ""}`}
              >
                <span className={styles.rirToggleTrack}>
                  <span className={styles.rirToggleThumb} />
                </span>
                <span>{program.dynamicRir ? "Dynamic" : "Static"}</span>
              </button>
              {program.dynamicRir && (
                <div className={styles.rirStart}>
                  <span className={styles.rirStartLabel}>Start:</span>
                  <select
                    value={program.startingRir}
                    onChange={(e) => updateStartingRir(Number(e.target.value))}
                    className={styles.rirSelect}
                  >
                    {[4, 3, 2].map((rir) => (
                      <option key={rir} value={rir}>RIR {rir}</option>
                    ))}
                  </select>
                  <span className={styles.rirArrow}>→</span>
                  <span className={styles.rirEnd}>RIR 0</span>
                </div>
              )}
            </div>
          </div>
        </div>

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

          <div className={styles.workoutsGrid}>
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
