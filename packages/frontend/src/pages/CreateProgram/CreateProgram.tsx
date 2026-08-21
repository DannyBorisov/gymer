import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus,
  Trash2,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  Loader2,
  Dumbbell,
  Calendar,
  Clock,
} from "lucide-react";
import { useCreateProgram } from "../../hooks/useCreateProgram";
import { presets } from "../../data/presets";
import { apiFetch } from "../../utils/api";
import { ExerciseDrawer } from "../../components/ExerciseDrawer/ExerciseDrawer";
import type { Workout, Exercise, Program } from "../../types/program";
import styles from "./CreateProgram.module.css";

interface ExerciseRowProps {
  exercise: Exercise;
  index: number;
  onUpdate: (field: keyof Exercise, value: string | number) => void;
  onRemove: () => void;
  onOpenDrawer: () => void;
}

const ExerciseRow = ({
  exercise,
  index,
  onUpdate,
  onRemove,
  onOpenDrawer,
}: ExerciseRowProps) => {
  return (
    <div className={styles.exerciseRow}>
      <div className={styles.exerciseHeader}>
        <span className={styles.exerciseIndex}>{index + 1}</span>
        <input
          type="text"
          value={exercise.name}
          onFocus={onOpenDrawer}
          onChange={(e) => onUpdate("name", e.target.value)}
          className={styles.exerciseNameInput}
          placeholder="Exercise name"
          readOnly
        />
        <button
          type="button"
          onClick={onRemove}
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
            onChange={(e) => onUpdate("sets", Number(e.target.value))}
            className={styles.numberInput}
            placeholder="0"
            min={0}
            inputMode="numeric"
          />
        </div>
        <div className={styles.inputGroup}>
          <label className={styles.inputLabel}>Reps</label>
          <input
            type="number"
            value={exercise.reps || ""}
            onChange={(e) => onUpdate("reps", Number(e.target.value))}
            className={styles.numberInput}
            placeholder="0"
            min={0}
            inputMode="numeric"
          />
        </div>
        <div className={styles.inputGroup}>
          <label className={styles.inputLabel}>RIR</label>
          <input
            type="number"
            value={exercise.rir || ""}
            onChange={(e) => onUpdate("rir", Number(e.target.value))}
            className={styles.numberInput}
            placeholder="0"
            min={0}
            max={10}
            inputMode="numeric"
          />
        </div>
      </div>
    </div>
  );
};

interface WorkoutSectionProps {
  workout: Workout;
  workoutIndex: number;
  onUpdateName: (name: string) => void;
  onRemove: () => void;
  onOpenAddDrawer: () => void;
  onRemoveExercise: (exerciseIndex: number) => void;
  onUpdateExercise: (
    exerciseIndex: number,
    field: keyof Exercise,
    value: string | number,
  ) => void;
  canRemove: boolean;
  onOpenEditDrawer: (exerciseIndex: number) => void;
}

const WorkoutSection = ({
  workout,
  workoutIndex,
  onUpdateName,
  onRemove,
  onOpenAddDrawer,
  onRemoveExercise,
  onUpdateExercise,
  canRemove,
  onOpenEditDrawer,
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
          {workout.exercises.length === 0 ? (
            <div className={styles.emptyExercises}>
              <p>No exercises yet</p>
            </div>
          ) : (
            <>
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
                  onUpdate={(field, value) =>
                    onUpdateExercise(exerciseIndex, field, value)
                  }
                  onRemove={() => onRemoveExercise(exerciseIndex)}
                  onOpenDrawer={() => onOpenEditDrawer(exerciseIndex)}
                />
              ))}
            </>
          )}
          <button
            type="button"
            onClick={onOpenAddDrawer}
            className={styles.addExerciseBtn}
          >
            <Plus size={14} />
            Add Exercises
          </button>
        </div>
      )}
    </div>
  );
};

const getFrequencyLabel = (frequency: Program["frequency"]) => {
  if (frequency === "every-other-day") return "Every other day";
  return `${frequency}x per week`;
};

const CreateProgram = () => {
  const navigate = useNavigate();
  const {
    program,
    updateProgramName,
    addWorkout,
    removeWorkout,
    updateWorkoutName,
    addExercises,
    removeExercise,
    updateExercise,
    loadProgram,
    resetProgram,
  } = useCreateProgram();

  const [mode, setMode] = useState<"templates" | "edit">("templates");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    url?: string;
    error?: string;
  } | null>(null);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"add" | "edit">("add");
  const [activeWorkoutIndex, setActiveWorkoutIndex] = useState<number>(0);
  const [activeExerciseIndex, setActiveExerciseIndex] = useState<number | null>(null);

  const handleOpenAddDrawer = (workoutIndex: number) => {
    setActiveWorkoutIndex(workoutIndex);
    setActiveExerciseIndex(null);
    setDrawerMode("add");
    setDrawerOpen(true);
  };

  const handleOpenEditDrawer = (workoutIndex: number, exerciseIndex: number) => {
    setActiveWorkoutIndex(workoutIndex);
    setActiveExerciseIndex(exerciseIndex);
    setDrawerMode("edit");
    setDrawerOpen(true);
  };

  const handleAddExercises = (names: string[]) => {
    addExercises(activeWorkoutIndex, names);
  };

  const handleUpdateExerciseName = (name: string) => {
    if (activeExerciseIndex !== null) {
      updateExercise(activeWorkoutIndex, activeExerciseIndex, "name", name);
    }
  };

  const handleSelectTemplate = (templateProgram: Program) => {
    loadProgram(templateProgram);
    setMode("edit");
  };

  const handleCreateFromScratch = () => {
    resetProgram();
    setMode("edit");
  };

  const handleBack = () => {
    setMode("templates");
    setResult(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setResult(null);

    try {
      const response = await apiFetch("/api/program/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(program),
      });

      const data = await response.json();

      if (response.ok) {
        setResult({ success: true, url: data.url });
      } else {
        setResult({
          success: false,
          error: data.error || "Failed to create program",
        });
      }
    } catch {
      setResult({ success: false, error: "Network error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get existing exercise names for current workout (to exclude from multi-select)
  const existingExerciseNames =
    program.workouts[activeWorkoutIndex]?.exercises.map((e) => e.name) || [];

  // Template Selection Screen
  if (mode === "templates") {
    return (
      <div className={styles.container}>
        <div className={styles.stickyHeader}>
          <Link to="/programs" className={styles.backLink}>
            <ChevronLeft size={16} />
            Back to Programs
          </Link>

          <div className={styles.pageHeader}>
            <h1 className={styles.title}>Choose a Template</h1>
            <p className={styles.subtitle}>
              Start with a proven program and customize it to your needs
            </p>
          </div>
        </div>

        <div className={styles.templateGrid}>
          {presets.map((preset) => (
            <div key={preset.id} className={styles.templateCard}>
              <div className={styles.templateInfo}>
                <div className={styles.templateHeader}>
                  <h2 className={styles.templateName}>{preset.program.name}</h2>
                  <p className={styles.templateDescription}>
                    {preset.description}
                  </p>
                </div>
                <div className={styles.templateMeta}>
                  <span className={styles.metaItem}>
                    <Dumbbell size={14} />
                    {preset.program.workouts.length} workouts
                  </span>
                  <span className={styles.metaItem}>
                    <Clock size={14} />
                    {getFrequencyLabel(preset.program.frequency)}
                  </span>
                  <span className={styles.metaItem}>
                    <Calendar size={14} />
                    {preset.program.durationWeeks} weeks
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleSelectTemplate(preset.program)}
                className={styles.useTemplateBtn}
              >
                Use Template
                <ChevronRight size={16} />
              </button>
            </div>
          ))}
        </div>

        <div className={styles.orDivider}>
          <span>OR</span>
        </div>

        <button
          type="button"
          onClick={handleCreateFromScratch}
          className={styles.createFromScratchBtn}
        >
          <Plus size={18} />
          Start from scratch
        </button>
      </div>
    );
  }

  // Edit Program Screen
  return (
    <div className={styles.container}>
      <button type="button" onClick={handleBack} className={styles.backLink}>
        <ChevronLeft size={16} />
        Back to Templates
      </button>

      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Customize Program</h1>
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

          <div className={styles.workoutsGrid}>
            {program.workouts.map((workout, workoutIndex) => (
              <WorkoutSection
                key={workoutIndex}
                workout={workout}
                workoutIndex={workoutIndex}
                onUpdateName={(name) => updateWorkoutName(workoutIndex, name)}
                onRemove={() => removeWorkout(workoutIndex)}
                onOpenAddDrawer={() => handleOpenAddDrawer(workoutIndex)}
                onRemoveExercise={(exerciseIndex) =>
                  removeExercise(workoutIndex, exerciseIndex)
                }
                onUpdateExercise={(exerciseIndex, field, value) =>
                  updateExercise(workoutIndex, exerciseIndex, field, value)
                }
                canRemove={program.workouts.length > 1}
                onOpenEditDrawer={(exerciseIndex) =>
                  handleOpenEditDrawer(workoutIndex, exerciseIndex)
                }
              />
            ))}
          </div>
        </div>

        <div className={styles.formActions}>
          {result?.success ? (
            <div className={styles.successMessage}>
              <span>Program created!</span>
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.sheetLink}
              >
                Open in Google Sheets
                <ExternalLink size={14} />
              </a>
              <button
                type="button"
                onClick={() => navigate("/")}
                className={styles.goBackBtn}
              >
                Go to Programs
              </button>
            </div>
          ) : (
            <>
              {result?.error && (
                <span className={styles.errorMessage}>{result.error}</span>
              )}
              <button
                type="submit"
                className={styles.submitButton}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className={styles.spinner} />
                    Creating...
                  </>
                ) : (
                  "Create Program"
                )}
              </button>
            </>
          )}
        </div>
      </form>

      {/* Exercise Drawer */}
      <ExerciseDrawer
        isOpen={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setActiveExerciseIndex(null);
        }}
        onSelect={handleUpdateExerciseName}
        onSelectMultiple={drawerMode === "add" ? handleAddExercises : undefined}
        multiSelect={drawerMode === "add"}
        currentValue={
          activeExerciseIndex !== null
            ? program.workouts[activeWorkoutIndex]?.exercises[activeExerciseIndex]?.name
            : ""
        }
        excludeExercises={drawerMode === "add" ? existingExerciseNames : []}
      />
    </div>
  );
};

export default CreateProgram;
