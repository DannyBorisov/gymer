import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Dialog } from "@capacitor/dialog";
import { ChevronRight, Loader2, Plus, Play, CheckCircle2 } from "lucide-react";
import { useSettings } from "../../contexts/SettingsContext";
import {
  useGetProgram,
  useGetPrograms,
  useDeleteProgram,
  useCopyProgram,
  useRenameProgram,
  type ProgramSummary,
} from "../../api/programs";
import type { Workout } from "../../api/workouts";
import { formatDate } from "../../lib/date";
import { ProgramMenu } from "./ProgramMenu";
import { EditableProgramName } from "./EditableProgramName";
import styles from "./Programs.module.css";

interface Program {
  id: string;
  name: string;
  numberOfWeeks: number;
  isComplete: boolean;
  workouts: Workout[];
}

const Programs = () => {
  const navigate = useNavigate();
  const { activeProgram, setActiveProgram } = useSettings();
  const { data: programsData, isLoading, error } = useGetPrograms();
  const { data: activeProgramResponse } = useGetProgram<Program>(activeProgram?.id);
  const programs = programsData?.programs || [];
  const activeProgramData = activeProgramResponse?.program || null;
  const deleteProgram = useDeleteProgram();
  const copyProgram = useCopyProgram();
  const renameProgram = useRenameProgram();
  const pendingDeleteId = deleteProgram.isPending ? deleteProgram.variables : undefined;
  const pendingCopyId = copyProgram.isPending ? copyProgram.variables : undefined;
  const pendingRenameId = renameProgram.isPending ? renameProgram.variables.id : undefined;

  // Calculate progress for active program
  const activeProgress = useMemo(() => {
    if (!activeProgramData) return null;

    const totalWorkouts = activeProgramData.workouts.length;
    const completedWorkouts = activeProgramData.workouts.filter((w) => w.date).length;

    // Find current week (first week with incomplete workouts)
    const byWeek: Record<number, { completed: number; total: number }> = {};
    for (const workout of activeProgramData.workouts) {
      const entry = byWeek[workout.week] || { completed: 0, total: 0 };
      entry.total++;
      if (workout.date) entry.completed++;
      byWeek[workout.week] = entry;
    }

    const weeks = Object.keys(byWeek)
      .map(Number)
      .sort((a, b) => a - b);
    let currentWeek = weeks[0] || 1;
    for (const week of weeks) {
      const { completed, total } = byWeek[week];
      if (completed < total) {
        currentWeek = week;
        break;
      }
      currentWeek = week;
    }

    return {
      completed: completedWorkouts,
      total: totalWorkouts,
      currentWeek,
      totalWeeks: activeProgramData.numberOfWeeks,
      percent: totalWorkouts > 0 ? Math.round((completedWorkouts / totalWorkouts) * 100) : 0,
    };
  }, [activeProgramData]);

  const handleProgramClick = (program: ProgramSummary) => {
    if (renameProgram.isPending && renameProgram.variables.id === program.id) return;
    navigate(`/programs/${program.id}`);
  };

  const handleSetActive = (program: ProgramSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveProgram({ id: program.id, name: program.name });
  };

  const handleEdit = (program: ProgramSummary) => {
    navigate(`/programs/${program.id}`);
  };

  const handleCopy = (program: ProgramSummary) => {
    copyProgram.mutate(program.id);
  };

  const handleRename = (program: ProgramSummary, name: string) => {
    renameProgram.mutate({ id: program.id, name });
  };

  const handleDelete = async (program: ProgramSummary) => {
    const { value: confirmed } = await Dialog.confirm({
      title: "Delete program",
      message: `Delete "${program.name}"? This can't be undone.`,
      okButtonTitle: "Delete",
    });
    if (!confirmed) return;

    deleteProgram.mutate(program.id, {
      onSuccess: () => {
        if (activeProgram?.id === program.id) {
          setActiveProgram(null);
        }
      },
    });
  };

  const activeProgramInfo = programs.find((p) => p.id === activeProgram?.id);
  const otherPrograms = programs.filter((p) => p.id !== activeProgram?.id);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Programs</h1>
      </div>

      {isLoading ? (
        <div className={styles.loadingState}>
          <Loader2 size={24} className={styles.spinner} />
          <span>Loading programs...</span>
        </div>
      ) : error ? (
        <div className={styles.errorState}>
          <p>{error instanceof Error ? error.message : "Failed to load programs"}</p>
        </div>
      ) : (
        <>
          {/* Active Program Section */}
          {activeProgramInfo && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Active Program</h2>
              <div
                className={styles.activeCard}
                role="button"
                tabIndex={0}
                onClick={() => handleProgramClick(activeProgramInfo)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleProgramClick(activeProgramInfo);
                }}
              >
                <div className={styles.activeCardHeader}>
                  <div className={styles.activeNameRow}>
                    <EditableProgramName
                      name={activeProgramInfo.name}
                      className={styles.activeName}
                      onRename={(name) => handleRename(activeProgramInfo, name)}
                      isSaving={pendingRenameId === activeProgramInfo.id}
                    />
                    <span className={styles.activeBadge}>Active</span>
                    <ProgramMenu
                      programName={activeProgramInfo.name}
                      onEdit={() => handleEdit(activeProgramInfo)}
                      onCopy={() => handleCopy(activeProgramInfo)}
                      onDelete={() => handleDelete(activeProgramInfo)}
                      isCopying={pendingCopyId === activeProgramInfo.id}
                      isDeleting={pendingDeleteId === activeProgramInfo.id}
                    />
                  </div>
                  {activeProgress && (
                    <span className={styles.activeWeek}>
                      Week {activeProgress.currentWeek} of {activeProgress.totalWeeks}
                    </span>
                  )}
                </div>
                {activeProgress && (
                  <div className={styles.progressSection}>
                    <div className={styles.progressBar}>
                      <div
                        className={styles.progressFill}
                        style={{ width: `${activeProgress.percent}%` }}
                      />
                    </div>
                    <div className={styles.progressStats}>
                      <span>{activeProgress.completed} of {activeProgress.total} workouts</span>
                      <span>{activeProgress.percent}%</span>
                    </div>
                  </div>
                )}
                <div className={styles.activeCardFooter}>
                  <button
                    className={styles.continueBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/programs/${activeProgramInfo.id}`);
                    }}
                  >
                    <Play size={16} />
                    <span>Continue</span>
                  </button>
                  <ChevronRight size={18} className={styles.chevronIcon} />
                </div>
              </div>
            </div>
          )}

          {/* Other Programs Section */}
          {otherPrograms.length > 0 && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>
                {activeProgramInfo ? "Other Programs" : "Your Programs"}
              </h2>
              <div className={styles.programsList}>
                {otherPrograms.map((program) => (
                  <div
                    key={program.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleProgramClick(program)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleProgramClick(program);
                    }}
                    className={styles.programCard}
                  >
                    <div className={styles.programInfo}>
                      <EditableProgramName
                        name={program.name}
                        className={styles.programName}
                        onRename={(name) => handleRename(program, name)}
                        isSaving={pendingRenameId === program.id}
                      />
                      <span className={styles.programDate}>
                        Created {program.createdTime ? formatDate(program.createdTime) : "Unknown date"}
                      </span>
                    </div>
                    <div className={styles.programActions}>
                      <button
                        className={styles.setActiveBtn}
                        onClick={(e) => handleSetActive(program, e)}
                      >
                        <CheckCircle2 size={16} />
                        <span>Set Active</span>
                      </button>
                      <ProgramMenu
                        programName={program.name}
                        onEdit={() => handleEdit(program)}
                        onCopy={() => handleCopy(program)}
                        onDelete={() => handleDelete(program)}
                        isCopying={pendingCopyId === program.id}
                        isDeleting={pendingDeleteId === program.id}
                      />
                      <ChevronRight size={16} className={styles.chevronIcon} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {programs.length === 0 && (
            <div className={styles.emptyState}>
              <h2>Build a plan you can follow</h2>
              <p>Start with a template, then make it your own.</p>
              <Link to="/programs/create" className={styles.emptyStateCta}>
                <Plus size={18} />
                <span>Choose a template</span>
              </Link>
            </div>
          )}
        </>
      )}

      <Link to="/programs/create" className={styles.fab}>
        <Plus size={28} strokeWidth={2.5} />
      </Link>
    </div>
  );
};

export default Programs;
