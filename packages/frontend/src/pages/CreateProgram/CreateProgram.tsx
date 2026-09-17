import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Dumbbell,
  Calendar,
  Clock,
  Gauge,
  ListChecks,
} from "lucide-react";
import { DndContext, DragOverlay, closestCorners } from "@dnd-kit/core";
import { useCreateProgram } from "../../hooks/useCreateProgram";
import { useQuickWorkout } from "../../contexts/QuickWorkoutContext";
import { useSettings } from "../../contexts/SettingsContext";
import { useCreateProgram as useCreateProgramMutation } from "../../api/programs";
import { presets } from "../../data/presets";
import { ExerciseDrawer } from "../../components/ExerciseDrawer/ExerciseDrawer";
import { InfoTooltip } from "../../components/InfoTooltip/InfoTooltip";
import type { Program } from "../../types/program";
import { WorkoutSection } from "./components/WorkoutSection";
import { ExerciseRow } from "./components/ExerciseRow";
import { useExerciseDnd } from "./dnd/useExerciseDnd";
import styles from "./CreateProgram.module.css";

const getFrequencyLabel = (frequency: Program["frequency"]) => {
  if (frequency === "every-other-day") return "Every other day";
  return `${frequency}x per week`;
};

const CreateProgram = () => {
  const navigate = useNavigate();
  const {
    program,
    getProgramForSubmit,
    updateProgramName,
    updateDuration,
    updateFrequency,
    updateDynamicRir,
    updateStartingRir,
    addWorkout,
    removeWorkout,
    updateWorkoutName,
    addExercises,
    removeExercise,
    updateExercise,
    moveExercise,
    loadProgram,
    resetProgram,
  } = useCreateProgram();

  const exerciseDnd = useExerciseDnd({ program, moveExercise });
  const { setFloatingAction } = useQuickWorkout();
  const { setActiveProgram } = useSettings();
  const createProgram = useCreateProgramMutation<Program>();

  const [mode, setMode] = useState<"templates" | "edit">("templates");
  const [result, setResult] = useState<{
    success: boolean;
    error?: string;
  } | null>(null);

  const formRef = useRef<HTMLFormElement>(null);
  const isSubmitting = createProgram.isPending;
  const isProgramReady =
    program.name.trim() !== "" &&
    program.workouts.every(
      (workout) =>
        workout.name.trim() !== "" && workout.exercises.length > 0,
    );
  const isSubmittingRef = useRef(isSubmitting);
  isSubmittingRef.current = isSubmitting;

  // Set up floating action when in edit mode
  useEffect(() => {
    if (mode === "edit" && !result?.success) {
      setFloatingAction({
        label: "Create Program",
        enabled: !isSubmitting && isProgramReady,
        handler: () => {
          if (!isSubmittingRef.current && formRef.current) {
            formRef.current.requestSubmit();
          }
        },
      });
    } else {
      setFloatingAction(null);
    }

    return () => {
      setFloatingAction(null);
    };
  }, [mode, isSubmitting, isProgramReady, result?.success, setFloatingAction]);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"add" | "edit">("add");
  const [activeWorkoutIndex, setActiveWorkoutIndex] = useState<number>(0);
  const [activeExerciseIndex, setActiveExerciseIndex] = useState<number | null>(
    null,
  );

  const handleOpenAddDrawer = (workoutIndex: number) => {
    setActiveWorkoutIndex(workoutIndex);
    setActiveExerciseIndex(null);
    setDrawerMode("add");
    setDrawerOpen(true);
  };

  const handleOpenEditDrawer = (
    workoutIndex: number,
    exerciseIndex: number,
  ) => {
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
    setResult(null);

    try {
      const data = await createProgram.mutateAsync(getProgramForSubmit());
      setActiveProgram({ id: data.program.id, name: data.program.name });
      navigate("/programs", { replace: true });
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Failed to create program",
      });
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
            <h1 className={styles.title}>Create your program</h1>
            <p className={styles.subtitle}>
              Start with a proven split, then tailor every session to your goals.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCreateFromScratch}
          className={styles.createFromScratchBtn}
        >
          <Plus size={18} />
          Start from scratch
        </button>

        <div className={styles.orDivider}>
          <span>OR</span>
        </div>

        <div className={styles.sectionIntro}>
          <span className={styles.sectionEyebrow}>Start faster</span>
          <h2>Choose a template</h2>
          <p>Every detail stays editable after you select one.</p>
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
                    {preset.program.workouts.length} sessions
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
      </div>
    );
  }

  // Edit Program Screen
  return (
    <div className={`${styles.container} ${styles.builderContainer}`}>
      <button type="button" onClick={handleBack} className={styles.backLink}>
        <ChevronLeft size={16} />
        Back to Templates
      </button>

      <div className={styles.editHeader}>
        <div>
          <span className={styles.sectionEyebrow}>Program builder</span>
          <h1 className={styles.title}>Customize your plan</h1>
          <p className={styles.subtitle}>
            Set the schedule, then add the exercises for each session.
          </p>
        </div>
        <div className={styles.progressPill}>
          <ListChecks size={16} />
          <span>
            {program.workouts.filter((workout) => workout.exercises.length > 0)
              .length}
            /{program.workouts.length} sessions ready
          </span>
        </div>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className={styles.form}>
        <section className={styles.detailsCard}>
          <div className={styles.cardHeading}>
            <div>
              <h2>Program details</h2>
              <p>Choose a name and training rhythm.</p>
            </div>
          </div>
          <label className={styles.nameField}>
            <span>Program name</span>
            <input
              type="text"
              value={program.name}
              onChange={(e) => updateProgramName(e.target.value)}
              className={styles.programNameInput}
              placeholder="e.g. Summer Strength"
            />
          </label>

          <div className={styles.programSettings}>
            <div className={styles.settingGroup}>
              <label className={styles.settingLabel}>
                <Calendar size={14} />
                Duration
              </label>
              <input
                type="number"
                value={program.durationWeeks}
                onChange={(e) => updateDuration(Number(e.target.value))}
                className={styles.settingInput}
                min={1}
                max={52}
                inputMode="numeric"
              />
              <span className={styles.fieldHint}>weeks</span>
            </div>
            <div className={styles.settingGroup}>
              <label className={styles.settingLabel}>
                <Clock size={14} />
                Frequency
              </label>
              <select
                value={program.frequency}
                onChange={(e) => {
                  const val = e.target.value;
                  updateFrequency(
                    val === "every-other-day"
                      ? val
                      : (Number(val) as 1 | 2 | 3 | 4 | 5 | 6),
                  );
                }}
                className={styles.settingSelect}
              >
                <option value={1}>1x per week</option>
                <option value={2}>2x per week</option>
                <option value={3}>3x per week</option>
                <option value={4}>4x per week</option>
                <option value={5}>5x per week</option>
                <option value={6}>6x per week</option>
                <option value="every-other-day">Every other day</option>
              </select>
            </div>
            <div className={styles.settingGroup}>
              <label className={styles.settingLabel}>
                <Gauge size={14} />
                Effort target
                <InfoTooltip
                  label="What is RIR?"
                  text="RIR (Reps in Reserve) is how many more reps you could have done before failure. Lower RIR means training closer to failure."
                />
              </label>
              <select
                value={
                  program.dynamicRir ? `dynamic-${program.startingRir}` : "manual"
                }
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "manual") {
                    updateDynamicRir(false);
                  } else {
                    updateDynamicRir(true);
                    updateStartingRir(Number(val.split("-")[1]));
                  }
                }}
                className={styles.settingSelect}
              >
                <option value="manual">Set each exercise</option>
                <option value="dynamic-4">Progress 4 → 1 RIR</option>
                <option value="dynamic-3">Progress 3 → 0 RIR</option>
                <option value="dynamic-2">Progress 2 → 0 RIR</option>
              </select>
            </div>
          </div>
        </section>

        <div className={styles.workoutsContainer}>
          <div className={styles.workoutsHeader}>
            <div>
              <span className={styles.workoutsTitle}>Training sessions</span>
              <p className={styles.workoutsDescription}>
                Name each session and add the exercises you want to perform.
              </p>
            </div>
            <button
              type="button"
              onClick={addWorkout}
              className={styles.addWorkoutBtn}
            >
              <Plus size={14} />
              Add Session
            </button>
          </div>

          <DndContext
            sensors={exerciseDnd.sensors}
            collisionDetection={closestCorners}
            onDragStart={exerciseDnd.onDragStart}
            onDragOver={exerciseDnd.onDragOver}
            onDragEnd={exerciseDnd.onDragEnd}
            onDragCancel={exerciseDnd.onDragCancel}
          >
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
                  showRir={!program.dynamicRir}
                  dynamicRir={program.dynamicRir}
                />
              ))}
            </div>

            <DragOverlay>
              {exerciseDnd.activeExercise ? (
                <div className={styles.dragOverlay}>
                  <ExerciseRow
                    exercise={exerciseDnd.activeExercise}
                    index={0}
                    onUpdate={() => {}}
                    onRemove={() => {}}
                    onOpenDrawer={() => {}}
                    showRir={!program.dynamicRir}
                    dynamicRir={program.dynamicRir}
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>

        <div className={styles.formActions}>
          {result?.error && (
            <span className={styles.errorMessage}>{result.error}</span>
          )}
          {!isProgramReady && (
            <span className={styles.formHint}>
              Add a program name, session names, and at least one exercise
              to each session.
            </span>
          )}
          <button
            type="submit"
            className={styles.submitButton}
            disabled={isSubmitting || !isProgramReady}
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
        </div>
      </form>

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
            ? program.workouts[activeWorkoutIndex]?.exercises[
                activeExerciseIndex
              ]?.name
            : ""
        }
        excludeExercises={drawerMode === "add" ? existingExerciseNames : []}
      />
    </div>
  );
};

export default CreateProgram;
