import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronRight, Loader2, Plus, Play, CheckCircle2 } from "lucide-react";
import { useSettings } from "../../contexts/SettingsContext";
import { useGetProgram, useGetPrograms, type ProgramSummary } from "../../api/programs";
import { formatDate } from "../../lib/date";
import styles from "./Programs.module.css";

interface Week {
  week: number;
  workouts: {
    name: string;
    isComplete?: boolean;
    completedDate?: string;
  }[];
}

const Programs = () => {
  const navigate = useNavigate();
  const { activeProgram, setActiveProgram } = useSettings();
  const { data: programsData, isLoading, error } = useGetPrograms();
  const { data: activeProgramResponse } = useGetProgram<Week[]>(activeProgram?.id);
  const programs = programsData?.programs || [];
  const activeProgramData = activeProgramResponse?.program || null;

  // Calculate progress for active program
  const activeProgress = useMemo(() => {
    if (!activeProgramData) return null;

    let totalWorkouts = 0;
    let completedWorkouts = 0;

    activeProgramData.forEach((week) => {
      week.workouts.forEach((workout) => {
        totalWorkouts++;
        if (workout.isComplete || workout.completedDate) {
          completedWorkouts++;
        }
      });
    });

    // Find current week
    let currentWeek = 1;
    for (const week of activeProgramData) {
      const weekComplete = week.workouts.every((w) => w.isComplete || w.completedDate);
      if (!weekComplete) {
        currentWeek = week.week;
        break;
      }
      currentWeek = week.week;
    }

    return {
      completed: completedWorkouts,
      total: totalWorkouts,
      currentWeek,
      totalWeeks: activeProgramData.length,
      percent: totalWorkouts > 0 ? Math.round((completedWorkouts / totalWorkouts) * 100) : 0,
    };
  }, [activeProgramData]);

  const handleProgramClick = (program: ProgramSummary) => {
    navigate(`/programs/${program.id}`);
  };

  const handleSetActive = (program: ProgramSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveProgram({ id: program.id, name: program.name });
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
              <button
                className={styles.activeCard}
                onClick={() => handleProgramClick(activeProgramInfo)}
              >
                <div className={styles.activeCardHeader}>
                  <div className={styles.activeNameRow}>
                    <span className={styles.activeName}>{activeProgramInfo.name}</span>
                    <span className={styles.activeBadge}>Active</span>
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
                      navigate("/home");
                    }}
                  >
                    <Play size={16} />
                    <span>Continue</span>
                  </button>
                  <ChevronRight size={18} className={styles.chevronIcon} />
                </div>
              </button>
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
                  <button
                    key={program.id}
                    onClick={() => handleProgramClick(program)}
                    className={styles.programCard}
                  >
                    <div className={styles.programInfo}>
                      <span className={styles.programName}>{program.name}</span>
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
                      <ChevronRight size={16} className={styles.chevronIcon} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {programs.length === 0 && (
            <div className={styles.emptyState}>
              <p>No programs yet</p>
              <p>Create your first training program to get started</p>
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
