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
import { useWorkout, type Week, type Workout } from "../../contexts/WorkoutContext";
import { useAuth } from "../../contexts/AuthContext";
import { useGetProgram } from "../../api/programs";
import { useGetWorkoutHistory } from "../../api/workouts";
import styles from "./Home.module.css";

const Home = () => {
  const navigate = useNavigate();
  const { activeProgram } = useSettings();
  const { startWorkout, activeWorkout } = useWorkout();
  const { user } = useAuth();

  const { data: programResponse, isLoading: isLoadingProgram } = useGetProgram<Week[]>(activeProgram?.id);
  const { data: historyResponse, isLoading: isLoadingHistory } = useGetWorkoutHistory();
  const programData = programResponse?.program || [];
  const programName = programResponse?.name || activeProgram?.name || "";
  const workouts = historyResponse?.workouts || [];
  const lastWorkout = workouts[0] || null;

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    const rawFirstName = user?.name?.split(" ")[0];
    const firstName = rawFirstName ? rawFirstName.charAt(0).toUpperCase() + rawFirstName.slice(1).toLowerCase() : null;
    const timeGreeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    return firstName ? `${timeGreeting}, ${firstName}` : timeGreeting;
  };

  const { workoutCount, streak } = useMemo(() => {
    const now = new Date();
    const workoutCount = workouts.filter((workout) => {
      const [day, month, year] = workout.date.split("/");
      const date = new Date(Number(year), Number(month) - 1, Number(day));
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length;

    const getWeekStart = (date: Date) => {
      const result = new Date(date);
      result.setHours(0, 0, 0, 0);
      result.setDate(result.getDate() - result.getDay());
      return result.getTime();
    };
    const workoutWeeks = new Set(workouts.map((workout) => {
      const [day, month, year] = workout.date.split("/");
      return getWeekStart(new Date(Number(year), Number(month) - 1, Number(day)));
    }));
    const weekLength = 7 * 24 * 60 * 60 * 1000;
    let checkWeek = getWeekStart(now);
    if (!workoutWeeks.has(checkWeek)) checkWeek -= weekLength;
    let streak = 0;
    while (workoutWeeks.has(checkWeek)) {
      streak++;
      checkWeek -= weekLength;
    }
    return { workoutCount, streak };
  }, [workouts]);

  // Find next incomplete workout
  const getNextWorkout = (): { week: number; workout: Workout } | null => {
    for (const weekData of programData) {
      for (const workout of weekData.workouts) {
        if (!workout.isComplete && !workout.completedDate) {
          return { week: weekData.week, workout };
        }
      }
    }
    return null;
  };

  // Calculate week progress
  const getWeekProgress = () => {
    if (programData.length === 0) return { completed: 0, total: 0 };

    // Find current week (first week with incomplete workouts)
    for (const weekData of programData) {
      const completed = weekData.workouts.filter(
        (w) => w.isComplete || w.completedDate
      ).length;
      const total = weekData.workouts.length;

      if (completed < total) {
        return { completed, total, week: weekData.week };
      }
    }

    // All complete - return last week
    const lastWeek = programData[programData.length - 1];
    return {
      completed: lastWeek.workouts.length,
      total: lastWeek.workouts.length,
      week: lastWeek.week,
    };
  };

  const nextWorkout = getNextWorkout();
  const weekProgress = getWeekProgress();

  const handleStartWorkout = () => {
    if (activeWorkout) {
      navigate("/workout");
      return;
    }

    if (nextWorkout && activeProgram) {
      startWorkout(
        activeProgram.id,
        nextWorkout.week,
        nextWorkout.workout,
        programData,
        programName
      );
      navigate("/workout");
    }
  };

  const formatDate = (dateStr: string) => {
    const [day, month, year] = dateStr.split("/");
    const date = new Date(Number(year), Number(month) - 1, Number(day));
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
      (today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
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
            <span>{streak} week{streak !== 1 ? "s" : ""}</span>
          </div>
        )}
      </div>

      {/* Week Progress - only show if has active program */}
      {activeProgram && programData.length > 0 && (
        <div className={styles.progressCard}>
          <div className={styles.progressHeader}>
            <div className={styles.progressTitle}>
              <span className={styles.progressLabel}>Week {weekProgress.week}</span>
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
            <span>{Math.round((weekProgress.completed / weekProgress.total) * 100)}%</span>
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
          <button className={styles.primaryBtn} onClick={() => navigate("/workout")}>
            <Play size={22} />
            <div className={styles.primaryBtnText}>
              <span className={styles.primaryBtnTitle}>Resume Workout</span>
              <span className={styles.primaryBtnSubtitle}>
                {activeWorkout.workout.name}
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
                <span className={styles.primaryBtnTitle}>{nextWorkout.workout.name}</span>
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
              {lastWorkout.type === "quick" ? (
                <Zap size={20} />
              ) : (
                <Dumbbell size={20} />
              )}
            </div>
            <div className={styles.workoutInfo}>
              <span className={styles.workoutName}>{lastWorkout.name}</span>
              <span className={styles.workoutMeta}>
                {formatDate(lastWorkout.date)}
                {lastWorkout.duration && ` · ${formatDuration(lastWorkout.duration)}`}
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
