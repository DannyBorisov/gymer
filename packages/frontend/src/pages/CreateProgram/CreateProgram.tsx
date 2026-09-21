import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Plus, Loader2, ListChecks } from "lucide-react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarFullIcon,
  ClockIcon,
  DumbbellOutlineIcon,
  BarChartAscendingOutlineIcon,
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
import { InfoTooltip } from "../../components/InfoTooltip/InfoTooltip";
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
  const [step, setStep] = useState<1 | 2>(1);
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
      if (step === 1) {
        setFloatingAction({
          label: "Next: Configure",
          enabled: isProgramReady,
          handler: () => setStep(2),
        });
      } else {
        setFloatingAction({
          label: isEditingExisting ? "Save Changes" : "Create Program",
          enabled: !isSubmitting && isProgramReady,
          handler: () => {
            if (!isSubmittingRef.current && formRef.current) {
              formRef.current.requestSubmit();
            }
          },
        });
      }
    } else {
      setFloatingAction(null);
    }

    return () => {
      setFloatingAction(null);
    };
  }, [
    mode,
    step,
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
    setStep(1);
  };

  const handleCreateFromScratch = () => {
    resetProgram();
    setMode("edit");
    setStep(1);
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
    if (step === 2) {
      setStep(1);
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
        <div className={styles.stickyHeader}>
          <Link to="/programs" className={styles.backLink}>
            <ChevronLeftIcon size={16} />
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
                    <DumbbellOutlineIcon size={14} />
                    {preset.program.workouts.length} sessions
                  </span>
                  <span className={styles.metaItem}>
                    <ClockIcon size={14} />
                    {getFrequencyLabel(preset.program.frequency)}
                  </span>
                  <span className={styles.metaItem}>
                    <CalendarFullIcon size={14} />
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
                <ChevronRightIcon size={16} />
              </button>
            </div>
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
          <h1 className={styles.title}>Generate with AI</h1>
          <p className={styles.subtitle}>
            Pick a training rhythm and we'll build a complete program for you.
          </p>
        </div>

        <section className={styles.detailsCard}>
          <div className={styles.cardHeading}>
            <div>
              <h2>Program configuration</h2>
              <p>Choose a training rhythm.</p>
            </div>
          </div>

          <div className={styles.programSettings}>
            <div className={styles.settingGroup}>
              <Input
                label="Duration"
                icon={<CalendarFullIcon size={18} />}
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
                icon={<SyncIcon size={18} />}
                value={aiFrequency}
                onChange={(e) => setAiFrequency(Number(e.target.value))}
                options={[
                  { value: "1", label: "1x per week" },
                  { value: "2", label: "2x per week" },
                  { value: "3", label: "3x per week" },
                  { value: "4", label: "4x per week" },
                  { value: "5", label: "5x per week" },
                  { value: "6", label: "6x per week" },
                ]}
              />
            </div>
          </div>
        </section>

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
              "Generate program"
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
    <div className={`${styles.container} ${styles.builderContainer}`}>
      <button type="button" onClick={handleBack} className={styles.backLink}>
        <ChevronLeftIcon size={16} />
        {step === 2
          ? "Back to Exercises"
          : isEditingExisting
            ? "Back to Program"
            : "Back to Templates"}
      </button>

      <div className={styles.editHeader}>
        <div>
          <span className={styles.sectionEyebrow}>
            Step {step} of 2 &middot;{" "}
            {step === 1 ? "Choose exercises" : "Configure plan"}
          </span>
          <h1 className={styles.title}>
            {isEditingExisting ? "Edit your plan" : "Customize your plan"}
          </h1>
          <p className={styles.subtitle}>
            {step === 1
              ? "Name your program, set the effort target, and add exercises to each session."
              : "Set the training schedule for your program."}
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
        {step === 1 && (
          <>
            <section className={styles.detailsCard}>
              <div className={styles.cardHeading}>
                <div>
                  <h2>Program details</h2>
                  <p>Name your program and set how effort progresses.</p>
                </div>
              </div>
              <Input
                label="Program name"
                type="text"
                value={program.name}
                onChange={(e) => updateProgramName(e.target.value)}
                placeholder="e.g. Summer Strength"
              />

              <div className={styles.programSettings}>
                <div className={styles.settingGroup}>
                  <Select
                    label="Effort Target"
                    labelInfo="RIR (Reps in Reserve) is how many more reps you could have done before failure. Lower RIR means training closer to failure."
                    icon={<BarChartAscendingOutlineIcon size={18} />}
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
                      { value: "manual", label: "Set each exercise" },
                      { value: "dynamic-4", label: "Progress 4 → 1 RIR" },
                      { value: "dynamic-3", label: "Progress 3 → 0 RIR" },
                      { value: "dynamic-2", label: "Progress 2 → 0 RIR" },
                    ]}
                  />
                </div>
              </div>
            </section>

            <div className={styles.workoutsContainer}>
              <div className={styles.workoutsHeader}>
                <div>
                  <span className={styles.workoutsTitle}>
                    Training sessions
                  </span>
                  <p className={styles.workoutsDescription}>
                    Name each session and add the exercises you want to
                    perform.
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
                  Add a program name, session names, and at least one
                  exercise to each session.
                </span>
              )}
              <button
                type="button"
                onClick={() => setStep(2)}
                className={styles.submitButton}
                disabled={!isProgramReady}
              >
                Next: Configure
                <ChevronRightIcon size={16} />
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <section className={styles.detailsCard}>
              <div className={styles.cardHeading}>
                <div>
                  <h2>Program configuration</h2>
                  <p>Choose a training rhythm.</p>
                </div>
              </div>

              <div className={styles.programSettings}>
                <div className={styles.settingGroup}>
                  <Input
                    label="Duration"
                    icon={<CalendarFullIcon size={18} />}
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
                    icon={<SyncIcon size={18} />}
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
                      { value: "1", label: "1x per week" },
                      { value: "2", label: "2x per week" },
                      { value: "3", label: "3x per week" },
                      { value: "4", label: "4x per week" },
                      { value: "5", label: "5x per week" },
                      { value: "6", label: "6x per week" },
                      { value: "every-other-day", label: "Every other day" },
                    ]}
                  />
                </div>
              </div>
            </section>

            <div className={styles.formActions}>
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
          </>
        )}
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
