import { useState, useMemo } from "react";
import { Loader2, Calendar, TrendingUp, ChevronRight } from "lucide-react";
import { DumbbellOutlineIcon } from "../../assets/icons";
import { useGetWorkoutHistory, type Workout } from "../../api/workouts";
import { useSettings } from "../../contexts/SettingsContext";
import {
  WorkoutDetailDrawer,
  type WorkoutDetailData,
} from "../../components/WorkoutDetailDrawer";
import { parseDate } from "../../lib/date";
import styles from "./WorkoutHistory.module.css";

const WorkoutHistory = () => {
  const { weightUnit } = useSettings();
  const { data: rawData = { workouts: [] }, isLoading } =
    useGetWorkoutHistory();

  const data = useMemo(
    () => ({
      workouts: rawData.workouts.filter(
        (w): w is Workout => w != null && w.date != null,
      ),
    }),
    [rawData],
  );

  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [groupMode, setGroupMode] = useState<"none" | "month" | "workout">(
    "none",
  );

  const formatDateDisplay = (dateStr: string) => {
    const date = parseDate(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

    const diffDays = Math.floor(
      (today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diffDays < 7) {
      return date.toLocaleDateString("en-US", { weekday: "long" });
    }

    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  // Convert Workout to WorkoutDetailData for the shared drawer
  const selectedWorkoutData: WorkoutDetailData | null = selectedWorkout
    ? {
        title: selectedWorkout.name,
        subtitle: formatDateDisplay(selectedWorkout.date!),
        duration: selectedWorkout.duration,
        exercises: selectedWorkout.exercises.map((e) => ({
          name: e.name,
          variant: e.variant,
          sets: e.sets
            .filter((s) => s.achievedReps !== undefined)
            .map((s) => ({
              weight: s.achievedWeight?.toString() || "",
              reps: s.achievedReps?.toString() || "",
              rir: s.achievedRir,
              notes: s.notes,
              restTime: s.achievedRestTime,
            })),
        })),
      }
    : null;

  const formatDuration = (duration: string) => {
    if (duration.includes(":")) {
      const parts = duration.split(":");
      if (parts.length === 3) {
        const hours = parseInt(parts[0], 10);
        const mins = parseInt(parts[1], 10);
        if (hours > 0) return `${hours}h ${mins}m`;
        return `${mins}m`;
      }
    }
    const seconds = parseInt(duration, 10);
    if (isNaN(seconds)) return duration;
    return `${Math.floor(seconds / 60)}m`;
  };

  const sortedWorkouts = useMemo(
    () =>
      [...data.workouts].sort(
        (a, b) => parseDate(b.date!).getTime() - parseDate(a.date!).getTime(),
      ),
    [data.workouts],
  );

  const workoutGroups = useMemo(() => {
    if (groupMode === "none") {
      return [{ label: null as string | null, workouts: sortedWorkouts }];
    }

    const groups: { label: string; workouts: Workout[] }[] = [];
    const groupIndexByLabel: Record<string, number> = {};

    for (const workout of sortedWorkouts) {
      const label =
        groupMode === "workout"
          ? workout.name
          : parseDate(workout.date!).toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            });

      let index = groupIndexByLabel[label];
      if (index === undefined) {
        index = groups.length;
        groupIndexByLabel[label] = index;
        groups.push({ label, workouts: [] });
      }
      groups[index].workouts.push(workout);
    }

    return groups;
  }, [sortedWorkouts, groupMode]);

  const stats = useMemo(() => {
    const totalWorkouts = data.workouts.length;
    const totalSets = data.workouts.reduce(
      (sum, w) =>
        sum +
        w.exercises.reduce(
          (eSum, e) =>
            eSum + e.sets.filter((s) => s.achievedReps !== undefined).length,
          0,
        ),
      0,
    );

    // This month
    const now = new Date();
    const thisMonthCount = data.workouts.filter((w) => {
      const d = parseDate(w.date!);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    return { totalWorkouts, totalSets, thisMonthCount };
  }, [data.workouts]);

  // Calculate total sets for a workout
  const getWorkoutSetCount = (workout: Workout) =>
    workout.exercises.reduce(
      (sum, e) => sum + e.sets.filter((s) => s.achievedReps !== undefined).length,
      0,
    );

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <h1 className={styles.title}>History</h1>
        {!isLoading && data.workouts.length > 0 && (
          <div className={styles.statBadge}>
            <TrendingUp size={14} />
            <span>{stats.thisMonthCount} this month</span>
          </div>
        )}
      </header>

      {/* Quick Stats */}
      {!isLoading && data.workouts.length > 0 && (
        <div className={styles.statsRow}>
          <div className={styles.statPill}>
            <span className={styles.statValue}>{stats.totalWorkouts}</span>
            <span className={styles.statLabel}>workouts</span>
          </div>
          <div className={styles.statPill}>
            <span className={styles.statValue}>{stats.totalSets}</span>
            <span className={styles.statLabel}>sets</span>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className={styles.loadingState}>
          <Loader2 size={24} className={styles.spinner} />
        </div>
      ) : data.workouts.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <Calendar size={32} />
          </div>
          <p className={styles.emptyTitle}>No workouts yet</p>
          <p className={styles.emptySubtitle}>
            Your completed workouts will appear here with all your logged sets
          </p>
          <p className={styles.emptyHint}>
            Start a workout from the Home tab to begin
          </p>
        </div>
      ) : (
        <>
          {/* Group Toggle */}
          <div className={styles.groupToggle}>
            {(
              [
                { mode: "none", label: "Recent" },
                { mode: "month", label: "Month" },
                { mode: "workout", label: "Type" },
              ] as const
            ).map(({ mode, label }) => (
              <button
                key={mode}
                className={`${styles.groupBtn} ${groupMode === mode ? styles.groupBtnActive : ""}`}
                onClick={() => setGroupMode(mode)}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Workout List */}
          <div className={styles.workoutList}>
            {workoutGroups.map((group, groupIdx) => (
              <section
                key={group.label ?? `flat-${groupIdx}`}
                className={styles.group}
              >
                {group.label && (
                  <h2 className={styles.groupLabel}>{group.label}</h2>
                )}
                <div className={styles.cards}>
                  {group.workouts.map((workout, idx) => (
                    <button
                      key={`${workout.date}-${workout.name}-${idx}`}
                      className={styles.card}
                      onClick={() => setSelectedWorkout(workout)}
                    >
                      <div className={styles.cardIcon}>
                        <DumbbellOutlineIcon size={18} />
                      </div>
                      <div className={styles.cardContent}>
                        <span className={styles.cardName}>
                          {groupMode === "workout"
                            ? formatDateDisplay(workout.date!)
                            : workout.name}
                        </span>
                        {groupMode !== "workout" && (
                          <span className={styles.cardDate}>
                            {formatDateDisplay(workout.date!)}
                          </span>
                        )}
                        <div className={styles.cardMeta}>
                          <span>{getWorkoutSetCount(workout)} sets</span>
                          {workout.duration && (
                            <>
                              <span className={styles.dot}>·</span>
                              <span>{formatDuration(workout.duration)}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <ChevronRight size={18} className={styles.cardChevron} />
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      )}

      {/* Workout Detail Drawer */}
      <WorkoutDetailDrawer
        isOpen={!!selectedWorkout}
        onClose={() => setSelectedWorkout(null)}
        data={selectedWorkoutData}
        weightUnit={weightUnit}
      />
    </div>
  );
};

export default WorkoutHistory;
