import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Plus, Loader2 } from "lucide-react";
import {
  ChevronLeftIcon,
  CalendarFullIcon,
  SyncIcon,
  SparklesOutlineIcon,
} from "../../assets/icons";
import { DndContext, DragOverlay, closestCorners } from "@dnd-kit/core";
import { useCreateProgram } from "../../hooks/useCreateProgram";
import { reconstructProgramTemplate } from "../../hooks/programEdit";
import { useQuickWorkout } from "../../contexts/QuickWorkoutContext";
import { useSettings } from "../../contexts/SettingsContext";
import { Input } from "../../components/Input/Input";
import { Select } from "../../components/Select/Select";
import {
  useCreateProgram as useCreateProgramMutation,
  useEditProgram,
  useGetProgram,
} from "../../api/programs";
import { useGenerateAiProgram } from "../../api/ai";
import { presets } from "../../data/presets";
import { ExerciseDrawer } from "../../components/ExerciseDrawer/ExerciseDrawer";
import type { Program } from "../../types/program";
import type { Workout as FetchedWorkout } from "../../api/workouts";
import { WorkoutSection } from "./components/WorkoutSection";
import { ExerciseRow } from "./components/ExerciseRow";
import { useExerciseDnd } from "./dnd/useExerciseDnd";
import styles from "./CreateProgram.module.css";

interface FetchedProgram {
  name: string;
  numberOfWeeks: number;
  workouts: FetchedWorkout[];
}

const getFrequencyLabel = (frequency: Program["frequency"]) => {
  if (frequency === "every-other-day") return "Every other day";
  return `${frequency}x per week`;
};

const CreateProgram = () => {
  const navigate = useNavigate();
  const { id: editingProgramId } = useParams<{ id: string }>();
  const isEditingExisting = Boolean(editingProgramId);

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
  const editProgram = useEditProgram<Program>();
  const generateProgram = useGenerateAiProgram();
  const { data: existingProgramResponse, isLoading: isLoadingExisting } =
    useGetProgram<FetchedProgram>(editingProgramId);

  const [mode, setMode] = useState<"templates" | "ai" | "edit">(
    isEditingExisting ? "edit" : "templates",
  );
  const [aiFrequency, setAiFrequency] = useState(4);
  const [aiDurationWeeks, setAiDurationWeeks] = useState(8);
  const [result, setResult] = useState<{
    success: boolean;
    error?: string;
  } | null>(null);
  const [hasLoadedExisting, setHasLoadedExisting] = useState(false);

  // Load the fetched program into the builder once, when editing an
  // existing program — not on every refetch, so in-progress edits aren't
  // clobbered by a background query invalidation.
  useEffect(() => {
    if (!isEditingExisting || hasLoadedExisting) return;
    const fetched = existingProgramResponse?.program;
    if (!fetched) return;

    loadProgram(reconstructProgramTemplate(fetched));
    setHasLoadedExisting(true);
  }, [isEditingExisting, hasLoadedExisting, existingProgramResponse, loadProgram]);

  const formRef = useRef<HTMLFormElement>(null);
  const isSubmitting = createProgram.isPending || editProgram.isPending;
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
        label: isEditingExisting ? "Save Changes" : "Create Program",
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
  }, [
    mode,
    isSubmitting,
    isProgramReady,
    result?.success,
    isEditingExisting,
    setFloatingAction,
  ]);

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

  const handleGenerateWithAi = () => {
    generateProgram.mutate(
      { durationWeeks: aiDurationWeeks, frequency: aiFrequency },
      {
        onSuccess: (data) => {
          setActiveProgram({ id: data.program.id, name: data.program.name });
          navigate("/programs", { replace: true });
        },
      },
    );
  };

  const handleBack = () => {
    if (mode === "ai") {
      setMode("templates");
      return;
    }
    if (isEditingExisting && editingProgramId) {
      navigate(`/programs/${editingProgramId}`);
      return;
    }
    setMode("templates");
    setResult(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);

    try {
      if (isEditingExisting && editingProgramId) {
        const data = await editProgram.mutateAsync({
          id: editingProgramId,
          program: getProgramForSubmit(),
        });
        setActiveProgram({ id: data.program.id, name: data.program.name });
        navigate(`/programs/${editingProgramId}`, { replace: true });
      } else {
        const data = await createProgram.mutateAsync(getProgramForSubmit());
        setActiveProgram({ id: data.program.id, name: data.program.name });
        navigate("/programs", { replace: true });
      }
    } catch (error) {
      setResult({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : isEditingExisting
              ? "Failed to save changes"
              : "Failed to create program",
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
        <Link to="/programs" className={styles.backLink}>
          <ChevronLeftIcon size={16} />
          Programs
        </Link>

        <div className={styles.pageHeader}>
          <h1 className={styles.title}>New Program</h1>
          <p className={styles.subtitle}>Pick a template or start fresh</p>
        </div>

        <button
          type="button"
          onClick={() => setMode("ai")}
          className={styles.generateAiBtn}
        >
          <SparklesOutlineIcon size={18} />
          Generate with AI
        </button>

        <button
          type="button"
          onClick={handleCreateFromScratch}
          className={styles.createFromScratchBtn}
        >
          <Plus size={18} />
          Start from scratch
        </button>

        <div className={styles.orDivider}>
          <span>or pick a template</span>
        </div>

        <div className={styles.templateGrid}>
          {presets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleSelectTemplate(preset.program)}
              className={styles.templateCard}
            >
              <div className={styles.templateInfo}>
                <h2 className={styles.templateName}>{preset.program.name}</h2>
                <p className={styles.templateDescription}>
                  {preset.description}
                </p>
                <div className={styles.templateMeta}>
                  <span className={styles.metaItem}>
                    {preset.program.workouts.length} sessions
                  </span>
                  <span className={styles.metaItem}>
                    {getFrequencyLabel(preset.program.frequency)}
                  </span>
                  <span className={styles.metaItem}>
                    {preset.program.durationWeeks} weeks
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // AI Generation Screen
  if (mode === "ai") {
    return (
      <div className={styles.container}>
        <button type="button" onClick={handleBack} className={styles.backLink}>
          <ChevronLeftIcon size={16} />
          Back
        </button>

        <div className={styles.pageHeader}>
          <h1 className={styles.title}>AI Program</h1>
          <p className={styles.subtitle}>Pick a training rhythm</p>
        </div>

        <div className={styles.programSettings}>
          <div className={styles.settingGroup}>
            <Input
              label="Duration"
              icon={<CalendarFullIcon size={16} />}
              type="number"
              value={aiDurationWeeks}
              onChange={(e) => setAiDurationWeeks(Number(e.target.value))}
              min={1}
              max={52}
              inputMode="numeric"
              suffix="weeks"
            />
          </div>
          <div className={styles.settingGroup}>
            <Select
              label="Frequency"
              icon={<SyncIcon size={16} />}
              value={aiFrequency}
              onChange={(e) => setAiFrequency(Number(e.target.value))}
              options={[
                { value: "1", label: "1x/week" },
                { value: "2", label: "2x/week" },
                { value: "3", label: "3x/week" },
                { value: "4", label: "4x/week" },
                { value: "5", label: "5x/week" },
                { value: "6", label: "6x/week" },
              ]}
            />
          </div>
        </div>

        <div className={styles.formActions}>
          {generateProgram.isError && (
            <span className={styles.errorMessage}>
              Something went wrong. Try again.
            </span>
          )}
          <button
            type="button"
            onClick={handleGenerateWithAi}
            className={styles.submitButton}
            disabled={generateProgram.isPending}
          >
            {generateProgram.isPending ? (
              <>
                <Loader2 size={16} className={styles.spinner} />
                Generating...
              </>
            ) : (
              "Generate"
            )}
          </button>
        </div>
      </div>
    );
  }

  // Edit Program Screen
  if (isEditingExisting && isLoadingExisting && !hasLoadedExisting) {
    return (
      <div className={`${styles.container} ${styles.builderContainer}`}>
        <div className={styles.loadingState}>
          <Loader2 size={24} className={styles.spinner} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <button type="button" onClick={handleBack} className={styles.backLink}>
        <ChevronLeftIcon size={16} />
        {isEditingExisting ? "Back to Program" : "Back"}
      </button>

      <div className={styles.pageHeader}>
        <h1 className={styles.title}>
          {isEditingExisting ? "Edit Program" : "New Program"}
        </h1>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className={styles.form}>
        {/* Program Name */}
        <Input
          label="Program name"
          type="text"
          value={program.name}
          onChange={(e) => updateProgramName(e.target.value)}
          placeholder="e.g. Summer Strength"
        />

        {/* Duration & Frequency */}
        <div className={styles.programSettings}>
          <div className={styles.settingGroup}>
            <Input
              label="Duration"
              icon={<CalendarFullIcon size={16} />}
              type="number"
              value={program.durationWeeks}
              onChange={(e) => updateDuration(Number(e.target.value))}
              min={1}
              max={52}
              inputMode="numeric"
              suffix="weeks"
            />
          </div>
          <div className={styles.settingGroup}>
            <Select
              label="Frequency"
              icon={<SyncIcon size={16} />}
              value={program.frequency}
              onChange={(e) => {
                const val = e.target.value;
                updateFrequency(
                  val === "every-other-day"
                    ? val
                    : (Number(val) as 1 | 2 | 3 | 4 | 5 | 6),
                );
              }}
              options={[
                { value: "1", label: "1x/week" },
                { value: "2", label: "2x/week" },
                { value: "3", label: "3x/week" },
                { value: "4", label: "4x/week" },
                { value: "5", label: "5x/week" },
                { value: "6", label: "6x/week" },
                { value: "every-other-day", label: "Every other day" },
              ]}
            />
          </div>
        </div>

        {/* Effort Target (RIR) */}
        <Select
          label="Effort Target"
          labelInfo="RIR = Reps in Reserve. Lower = closer to failure."
          value={
            program.dynamicRir
              ? `dynamic-${program.startingRir}`
              : "manual"
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
          options={[
            { value: "manual", label: "Set per exercise" },
            { value: "dynamic-4", label: "Progress 4 → 1 RIR" },
            { value: "dynamic-3", label: "Progress 3 → 0 RIR" },
            { value: "dynamic-2", label: "Progress 2 → 0 RIR" },
          ]}
        />

        {/* Sessions */}
        <div className={styles.workoutsContainer}>
          <div className={styles.workoutsHeader}>
            <span className={styles.workoutsTitle}>Sessions</span>
            <button
              type="button"
              onClick={addWorkout}
              className={styles.addWorkoutBtn}
            >
              <Plus size={14} />
              Add
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
                  onUpdateName={(name) =>
                    updateWorkoutName(workoutIndex, name)
                  }
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
          {!isProgramReady && (
            <span className={styles.formHint}>
              Add program name, session names, and exercises
            </span>
          )}
          {result?.error && (
            <span className={styles.errorMessage}>{result.error}</span>
          )}
          <button
            type="submit"
            className={styles.submitButton}
            disabled={isSubmitting || !isProgramReady}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className={styles.spinner} />
                {isEditingExisting ? "Saving..." : "Creating..."}
              </>
            ) : isEditingExisting ? (
              "Save Changes"
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
