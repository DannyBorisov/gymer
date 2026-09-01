import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Play,
  Plus,
  Dumbbell,
  Zap,
  ChevronRight,
  Loader2,
  Flame,
  TrendingUp,
} from "lucide-react";
import { useSettings } from "../../contexts/SettingsContext";
import { useWorkout } from "../../contexts/WorkoutContext";
import { useAuth } from "../../contexts/AuthContext";
import { useGetProgram } from "../../api/programs";
import { useGetWorkoutHistory, type Workout } from "../../api/workouts";
import { parseDate } from "../../lib/date";
import styles from "./Home.module.css";

interface Program {
  id: string;
  name: string;
  numberOfWeeks: number;
  isComplete: boolean;
  workouts: Workout[];
}

const Home = () => {
  const navigate = useNavigate();
  const { activeProgram } = useSettings();
  const { activeWorkout, startWorkout } = useWorkout();
  const { user } = useAuth();

  const { data: programResponse, isLoading: isLoadingProgram } =
    useGetProgram<Program>(activeProgram?.id);
  const { data: historyResponse, isLoading: isLoadingHistory } =
    useGetWorkoutHistory();
  const program = programResponse?.program;
  const programWorkouts = program?.workouts || [];

  // Flatten and filter completed workouts from history
  const completedWorkouts = useMemo(() => {
    const all = (historyResponse?.workouts || [])
      .flat()
      .filter((w): w is Workout => w !== null && w.date !== undefined);
    return all.sort(
      (a, b) => parseDate(b.date!).getTime() - parseDate(a.date!).getTime(),
    );
  }, [historyResponse]);
  const lastWorkout = completedWorkouts[0] || null;

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    const rawFirstName = user?.name?.split(" ")[0];
    const firstName = rawFirstName
      ? rawFirstName.charAt(0).toUpperCase() +
        rawFirstName.slice(1).toLowerCase()
      : null;
    const timeGreeting =
      hour < 12
        ? "Good morning"
        : hour < 17
          ? "Good afternoon"
          : "Good evening";
    return firstName ? `${timeGreeting}, ${firstName}` : timeGreeting;
  };

  const { workoutCount, streak } = useMemo(() => {
    const now = new Date();
    const workoutCount = completedWorkouts.filter((workout) => {
      const date = parseDate(workout.date!);
      return (
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()
      );
    }).length;

    const getWeekStart = (date: Date) => {
      const result = new Date(date);
      result.setHours(0, 0, 0, 0);
      result.setDate(result.getDate() - result.getDay());
      return result.getTime();
    };
    const workoutWeeks = new Set(
      completedWorkouts.map((workout) => {
        return getWeekStart(parseDate(workout.date!));
      }),
    );
    const weekLength = 7 * 24 * 60 * 60 * 1000;
    let checkWeek = getWeekStart(now);
    if (!workoutWeeks.has(checkWeek)) checkWeek -= weekLength;
    let streak = 0;
    while (workoutWeeks.has(checkWeek)) {
      streak++;
      checkWeek -= weekLength;
    }
    return { workoutCount, streak };
  }, [completedWorkouts]);

  // Find next incomplete workout (first workout without a date)
  const getNextWorkout = (): { week: number; workout: Workout } | null => {
    // Sort by week to find the earliest incomplete
    const sorted = [...programWorkouts].sort((a, b) => a.week - b.week);
    for (const workout of sorted) {
      if (!workout.date) {
        return { week: workout.week, workout };
      }
    }
    return null;
  };

  // Calculate week progress
  const getWeekProgress = () => {
    if (programWorkouts.length === 0) return { completed: 0, total: 0 };

    // Group by week
    const byWeek = new Map<number, { completed: number; total: number }>();
    for (const workout of programWorkouts) {
      const entry = byWeek.get(workout.week) || { completed: 0, total: 0 };
      entry.total++;
      if (workout.date) entry.completed++;
      byWeek.set(workout.week, entry);
    }

    // Find first incomplete week
    const weeks = [...byWeek.keys()].sort((a, b) => a - b);
    for (const week of weeks) {
      const { completed, total } = byWeek.get(week)!;
      if (completed < total) {
        return { completed, total, week };
      }
    }

    // All complete - return last week
    const lastWeek = weeks[weeks.length - 1];
    const lastWeekData = byWeek.get(lastWeek)!;
    return {
      completed: lastWeekData.total,
      total: lastWeekData.total,
      week: lastWeek,
    };
  };

  const nextWorkout = getNextWorkout();
  const weekProgress = getWeekProgress();

  const handleStartWorkout = () => {
    if (activeWorkout) {
      navigate("/workout");
      return;
    }

    // Start the workout directly
    if (nextWorkout && activeProgram && program) {
      startWorkout(
        activeProgram.id,
        nextWorkout.workout,
        programWorkouts,
        program.name,
      );
      navigate("/workout");
    }
  };

  const formatDateRelative = (dateStr: string) => {
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

    const diffDays = Math.floor(
      (today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diffDays < 7) {
      return `${diffDays} days ago`;
    }

    return date.toLocaleDateString("en-US", {
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
        if (hours > 0) return `${hours}h ${mins}m`;
        return `${mins}m`;
      }
    }
    return duration;
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <span className={styles.eyebrow}>GYMERR / TODAY</span>
          <h1 className={styles.greeting}>{getGreeting()}</h1>
        </div>
        {streak > 0 && (
          <div className={styles.streakBadge}>
            <Flame size={16} />
            <span>
              {streak} week{streak !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>

      {/* Week Progress - only show if has active program */}
      {activeProgram && programWorkouts.length > 0 && (
        <div className={styles.progressCard}>
          <div className={styles.progressHeader}>
            <div className={styles.progressTitle}>
              <span className={styles.progressLabel}>
                Week {weekProgress.week}
              </span>
              <span className={styles.progressStatus}>IN PROGRESS</span>
            </div>
            <span className={styles.progressCount}>
              {weekProgress.completed} of {weekProgress.total} sessions
            </span>
          </div>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{
                width: `${(weekProgress.completed / weekProgress.total) * 100}%`,
              }}
            />
          </div>
          <div className={styles.progressFooter}>
            <span>Keep the streak alive</span>
            <span>
              {Math.round((weekProgress.completed / weekProgress.total) * 100)}%
            </span>
          </div>
        </div>
      )}

      {/* Primary Action */}
      <div className={styles.actionCard}>
        <div className={styles.actionCardLabel}>NEXT UP</div>
        {isLoadingProgram ? (
          <div className={styles.loadingAction}>
            <Loader2 size={24} className={styles.spinner} />
          </div>
        ) : activeWorkout ? (
          // Resume active workout
          <button
            className={styles.primaryBtn}
            onClick={() => navigate("/workout")}
          >
            <Play size={22} />
            <div className={styles.primaryBtnText}>
              <span className={styles.primaryBtnTitle}>Resume Workout</span>
              <span className={styles.primaryBtnSubtitle}>
                {activeWorkout.workoutName}
              </span>
            </div>
            <ChevronRight size={20} />
          </button>
        ) : activeProgram && nextWorkout ? (
          // Start next program workout OR quick workout
          <div className={styles.workoutOptions}>
            <button className={styles.primaryBtn} onClick={handleStartWorkout}>
              <Dumbbell size={22} />
              <div className={styles.primaryBtnText}>
                <span className={styles.primaryBtnTitle}>
                  {nextWorkout.workout.name}
                </span>
                <span className={styles.primaryBtnSubtitle}>
                  Week {nextWorkout.week}
                </span>
              </div>
              <ChevronRight size={20} />
            </button>
            <span className={styles.orDivider}>or</span>
            <button
              className={styles.quickWorkoutBtn}
              onClick={() => navigate("/quick-workout")}
            >
              <Zap size={16} />
              <span>Quick Workout</span>
            </button>
          </div>
        ) : activeProgram ? (
          // Program complete
          <div className={styles.completeState}>
            <span>Program complete!</span>
            <button
              className={styles.secondaryBtn}
              onClick={() => navigate("/quick-workout")}
            >
              <Zap size={18} />
              Quick Workout
            </button>
          </div>
        ) : (
          // No program - show options
          <div className={styles.noProgram}>
            <p className={styles.noProgramText}>Ready to train?</p>
            <div className={styles.noProgramActions}>
              <button
                className={styles.primaryBtn}
                onClick={() => navigate("/quick-workout")}
              >
                <Zap size={20} />
                <span>Quick Workout</span>
              </button>
              <button
                className={styles.outlineBtn}
                onClick={() => navigate("/programs/create")}
              >
                <Plus size={20} />
                <span>Create Program</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Last Workout */}
      {lastWorkout && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Last Workout</h2>
          <button
            className={styles.workoutCard}
            onClick={() => navigate("/history")}
          >
            <div className={styles.workoutIcon}>
              <Dumbbell size={20} />
            </div>
            <div className={styles.workoutInfo}>
              <span className={styles.workoutName}>{lastWorkout.name}</span>
              <span className={styles.workoutMeta}>
                {formatDateRelative(lastWorkout.date!)}
                {lastWorkout.duration &&
                  ` · ${formatDuration(lastWorkout.duration)}`}
              </span>
            </div>
            <ChevronRight size={18} className={styles.chevron} />
          </button>
        </div>
      )}

      {/* Quick Stats */}
      {!isLoadingHistory && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <Dumbbell size={18} />
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{workoutCount}</span>
              <span className={styles.statLabel}>This month</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <TrendingUp size={18} />
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{streak}</span>
              <span className={styles.statLabel}>Week streak</span>
            </div>
          </div>
        </div>
      )}

      {/* View Programs Link */}
      {activeProgram && (
        <button
          className={styles.linkBtn}
          onClick={() => navigate(`/programs/${activeProgram.id}`)}
        >
          <span>View full program</span>
          <ChevronRight size={16} />
        </button>
      )}
    </div>
  );
};

export default Home;
