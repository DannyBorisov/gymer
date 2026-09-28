import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Dialog } from "@capacitor/dialog";
import { Loader2, Plus, ChevronRight, Sparkles } from "lucide-react";
import { CheckmarkCircleIcon, PlayOutlineIcon } from "../../assets/icons";
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

// Circular progress ring
const ProgressRing = ({
  progress,
  size = 56,
  strokeWidth = 4,
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg width={size} height={size} className={styles.progressRing}>
      <circle
        className={styles.progressRingBg}
        strokeWidth={strokeWidth}
        fill="none"
        r={radius}
        cx={size / 2}
        cy={size / 2}
      />
      <circle
        className={styles.progressRingFill}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        fill="none"
        r={radius}
        cx={size / 2}
        cy={size / 2}
        style={{
          strokeDasharray: circumference,
          strokeDashoffset: offset,
        }}
      />
    </svg>
  );
};

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

  const activeProgress = useMemo(() => {
    if (!activeProgramData) return null;

    const totalWorkouts = activeProgramData.workouts.length;
    const completedWorkouts = activeProgramData.workouts.filter((w) => w.date).length;

    const byWeek: Record<number, { completed: number; total: number }> = {};
    for (const workout of activeProgramData.workouts) {
      const entry = byWeek[workout.week] || { completed: 0, total: 0 };
      entry.total++;
      if (workout.date) entry.completed++;
      byWeek[workout.week] = entry;
    }

    const weeks = Object.keys(byWeek).map(Number).sort((a, b) => a - b);
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
    navigate(`/programs/${program.id}/edit`);
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
      {/* Header */}
      <header className={styles.header}>
        <h1 className={styles.title}>Programs</h1>
        <Link to="/programs/create" className={styles.addBtn}>
          <Plus size={20} />
        </Link>
      </header>

      {isLoading ? (
        <div className={styles.loadingState}>
          <Loader2 size={24} className={styles.spinner} />
        </div>
      ) : error ? (
        <div className={styles.errorState}>
          <p>{error instanceof Error ? error.message : "Failed to load"}</p>
        </div>
      ) : programs.length === 0 ? (
        /* Empty State */
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <Sparkles size={32} />
          </div>
          <h2 className={styles.emptyTitle}>Start your journey</h2>
          <p className={styles.emptySubtitle}>
            Create a program or choose a template
          </p>
          <Link to="/programs/create" className={styles.emptyCta}>
            <Plus size={18} />
            <span>Create Program</span>
          </Link>
        </div>
      ) : (
        <>
          {/* Active Program */}
          {activeProgramInfo && (
            <section className={styles.section}>
              <div
                className={styles.activeCard}
                role="button"
                tabIndex={0}
                onClick={() => handleProgramClick(activeProgramInfo)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleProgramClick(activeProgramInfo);
                }}
              >
                {/* Progress Ring */}
                <div className={styles.activeProgress}>
                  <ProgressRing progress={activeProgress?.percent || 0} />
                  <span className={styles.activePercent}>
                    {activeProgress?.percent || 0}%
                  </span>
                </div>

                {/* Info */}
                <div className={styles.activeInfo}>
                  <EditableProgramName
                    name={activeProgramInfo.name}
                    className={styles.activeName}
                    onRename={(name) => handleRename(activeProgramInfo, name)}
                    isSaving={pendingRenameId === activeProgramInfo.id}
                  />
                  {activeProgress && (
                    <span className={styles.activeMeta}>
                      Week {activeProgress.currentWeek} · {activeProgress.completed}/{activeProgress.total} done
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className={styles.activeActions}>
                  <ProgramMenu
                    programName={activeProgramInfo.name}
                    onEdit={() => handleEdit(activeProgramInfo)}
                    onCopy={() => handleCopy(activeProgramInfo)}
                    onDelete={() => handleDelete(activeProgramInfo)}
                    isCopying={pendingCopyId === activeProgramInfo.id}
                    isDeleting={pendingDeleteId === activeProgramInfo.id}
                  />

                  <button
                    className={styles.continueBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/programs/${activeProgramInfo.id}`);
                    }}
                  >
                    <PlayOutlineIcon size={18} />
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Other Programs */}
          {otherPrograms.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionLabel}>
                {activeProgramInfo ? "Other Programs" : "Your Programs"}
              </h2>
              <div className={styles.programList}>
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
                        {program.createdTime ? formatDate(program.createdTime) : ""}
                      </span>
                    </div>
                    <div className={styles.programActions}>
                      <button
                        className={styles.setActiveBtn}
                        onClick={(e) => handleSetActive(program, e)}
                      >
                        <CheckmarkCircleIcon size={14} />
                        <span>Activate</span>
                      </button>
                      <ProgramMenu
                        programName={program.name}
                        onEdit={() => handleEdit(program)}
                        onCopy={() => handleCopy(program)}
                        onDelete={() => handleDelete(program)}
                        isCopying={pendingCopyId === program.id}
                        isDeleting={pendingDeleteId === program.id}
                      />
                      <ChevronRight size={18} className={styles.chevron} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
};

export default Programs;
