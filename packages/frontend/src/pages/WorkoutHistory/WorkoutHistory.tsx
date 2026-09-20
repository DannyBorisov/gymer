import { useState, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { ClockIcon, DumbbellOutlineIcon } from "../../assets/icons";
import { useGetWorkoutHistory, type Workout } from "../../api/workouts";
import { useSettings } from "../../contexts/SettingsContext";
import { SwipeableDrawer } from "../../components/SwipeableDrawer";
import { parseExerciseName } from "../../types/shared";
import { parseDate } from "../../lib/date";
import styles from "./WorkoutHistory.module.css";

const WorkoutHistory = () => {
  const { weightUnit } = useSettings();
  const { data: rawData = { workouts: [] }, isLoading } =
    useGetWorkoutHistory();
  // Only dated workouts belong in history; guard against nulls/undated rows.
  const data = useMemo(
    () => ({
      workouts: rawData.workouts.filter(
        (w): w is Workout => w != null && w.date != null,
      ),
    }),
    [rawData],
  );

  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [groupMode, setGroupMode] = useState<
    "none" | "week" | "month" | "workout"
  >("none");

  const formatDateDisplay = (dateStr: string) => {
    const date = parseDate(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const formatDuration = (duration: string) => {
    if (duration.includes(":")) {
      const parts = duration.split(":");
      if (parts.length === 3) {
        const hours = parseInt(parts[0], 10);
        const mins = parseInt(parts[1], 10);
        if (hours > 0) {
          return `${hours}h ${mins}m`;
        }
        return `${mins} min`;
      }
    }
    const seconds = parseInt(duration, 10);
    if (isNaN(seconds)) return duration;
    const mins = Math.floor(seconds / 60);
    return `${mins} min`;
  };

  const sortedWorkouts = useMemo(
    () =>
      [...data.workouts].sort(
        (a, b) => parseDate(b.date!).getTime() - parseDate(a.date!).getTime(),
      ),
    [data.workouts],
  );

  // Group workouts by the selected grouping (or a single flat group)
  const workoutGroups = useMemo(() => {
    if (groupMode === "none") {
      return [{ label: null as string | null, workouts: sortedWorkouts }];
    }

    const groups: { label: string; workouts: Workout[] }[] = [];
    const groupIndexByLabel: Record<string, number> = {};

    for (const workout of sortedWorkouts) {
      const label =
        groupMode === "week"
          ? `Week ${workout.week}`
          : groupMode === "workout"
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

  const totalWorkouts = data.workouts.length;
  const { completedSetCount, bestWeekCount } = useMemo(() => {
    const weekCounts: Record<string, number> = {};
    let completedSetCount = 0;

    for (const workout of data.workouts) {
      completedSetCount += workout.exercises.reduce(
        (total, exercise) =>
          total +
          exercise.sets.filter((set) => set.achievedReps !== undefined).length,
        0,
      );

      const date = parseDate(workout.date!);
      const weekStart = new Date(date);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekKey = weekStart.toISOString().slice(0, 10);
      weekCounts[weekKey] = (weekCounts[weekKey] ?? 0) + 1;
    }

    return {
      completedSetCount,
      bestWeekCount: Math.max(...Object.values(weekCounts), 0),
    };
  }, [data.workouts]);

  return (
    <div className={styles.container}>
      <span className={styles.eyebrow}>GYMERR / LOG</span>
      <h1 className={styles.title}>History</h1>

      {/* Stats Section */}
      {!isLoading && data.workouts.length > 0 && (
        <div className={styles.statsSection}>
          <div className={styles.statsHeader}>
            <DumbbellOutlineIcon size={18} />
            <div>
              <span className={styles.statsEyebrow}>Training record</span>
              <h2>Your completed work</h2>
            </div>
          </div>
          <div className={styles.statsHighlight}>
            <span className={styles.highlightValue}>{totalWorkouts}</span>
            <div className={styles.highlightCopy}>
              <strong>
                workout{totalWorkouts !== 1 ? "s" : ""} completed
              </strong>
              <span>Every session is part of the record.</span>
            </div>
          </div>
          <div className={styles.achievementGrid}>
            <div className={styles.achievementItem}>
              <span className={styles.achievementValue}>{completedSetCount}</span>
              <span className={styles.achievementLabel}>Sets logged</span>
            </div>
            <div className={styles.achievementItem}>
              <span className={styles.achievementValue}>{bestWeekCount}</span>
              <span className={styles.achievementLabel}>
                Sessions in your best week
              </span>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className={styles.loadingState}>
          <Loader2 size={24} className={styles.spinner} />
          <span>Loading workouts...</span>
        </div>
      ) : data.workouts.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No workouts recorded yet.</p>
          <p>Start a workout to see it here.</p>
        </div>
      ) : (
        <>
          <div className={styles.groupSelector}>
            <span className={styles.groupSelectorLabel}>Group by</span>
            <div className={styles.groupOptions}>
              {(
                [
                  { mode: "none", label: "Date" },
                  { mode: "week", label: "Week" },
                  { mode: "month", label: "Month" },
                  { mode: "workout", label: "Workout" },
                ] as const
              ).map(({ mode, label }) => (
                <button
                  key={mode}
                  className={`${styles.groupOption} ${
                    groupMode === mode ? styles.groupOptionActive : ""
                  }`}
                  onClick={() => setGroupMode(mode)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.workoutList}>
            {workoutGroups.map((group, groupIdx) => (
              <div
                key={group.label ?? `flat-${groupIdx}`}
                className={styles.dateGroup}
              >
                {group.label && (
                  <h2 className={styles.dateHeader}>{group.label}</h2>
                )}
                <div className={styles.workoutCards}>
                  {group.workouts.map((workout, idx) => (
                    <button
                      key={`${workout.date}-${workout.name}-${workout.week}-${idx}`}
                      className={styles.workoutCard}
                      onClick={() => setSelectedWorkout(workout)}
                    >
                      <div className={styles.workoutIcon}>
                        <DumbbellOutlineIcon size={20} />
                      </div>
                      <div className={styles.workoutInfo}>
                        {groupMode === "none" && (
                          <span className={styles.workoutDate}>
                            {formatDateDisplay(workout.date!)}
                          </span>
                        )}
                        <span className={styles.workoutName}>
                          {groupMode === "workout"
                            ? formatDateDisplay(workout.date!)
                            : workout.name}
                        </span>
                        <span className={styles.workoutMeta}>
                          {workout.exercises.length} exercise
                          {workout.exercises.length !== 1 ? "s" : ""}
                          {workout.duration &&
                            ` · ${formatDuration(workout.duration)}`}
                        </span>
                      </div>
                      <div className={styles.weekBadge}>
                        Week {workout.week}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Workout Detail Drawer */}
      <SwipeableDrawer
        isOpen={!!selectedWorkout}
        onClose={() => setSelectedWorkout(null)}
        maxHeight="85vh"
      >
        {selectedWorkout && (
          <>
            <div className={styles.drawerHeader}>
              <div className={styles.drawerHeaderInfo}>
                <h2 className={styles.drawerTitle}>{selectedWorkout.name}</h2>
                <div className={styles.drawerMeta}>
                  <span>{formatDateDisplay(selectedWorkout.date!)}</span>
                  {selectedWorkout.duration && (
                    <>
                      <span className={styles.metaDot}>·</span>
                      <ClockIcon size={14} />
                      <span>{formatDuration(selectedWorkout.duration)}</span>
                    </>
                  )}
                  <span className={styles.metaDot}>·</span>
                  <span>Week {selectedWorkout.week}</span>
                </div>
              </div>
            </div>

            <div className={styles.drawerContent}>
              <div className={styles.exerciseList}>
                {selectedWorkout.exercises.map((exercise) => {
                  const { name, variant } = parseExerciseName(
                    exercise.variant
                      ? `${exercise.name} (${exercise.variant})`
                      : exercise.name,
                  );
                  return (
                    <div key={exercise.name} className={styles.exerciseCard}>
                      <h3 className={styles.exerciseName}>
                        {name}
                        {variant && (
                          <span className={styles.exerciseVariant}>
                            {variant}
                          </span>
                        )}
                      </h3>
                      <div className={styles.setsList}>
                        {exercise.sets.map((set, idx) => (
                          <div key={idx} className={styles.setRow}>
                            <span className={styles.setNumber}>{idx + 1}</span>
                            <span className={styles.setData}>
                              {set.achievedWeight ?? "-"}
                              {weightUnit} × {set.achievedReps ?? "-"}
                              {set.achievedRir && (
                                <span className={styles.setRir}>
                                  {" "}
                                  @ {set.achievedRir} RIR
                                </span>
                              )}
                              {set.notes && (
                                <span className={styles.setNotes}>
                                  {" "}
                                  · {set.notes}
                                </span>
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </SwipeableDrawer>
    </div>
  );
};

export default WorkoutHistory;
