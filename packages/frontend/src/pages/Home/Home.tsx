import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Zap, Loader2, Flame, Target, Calendar, Play } from "lucide-react";
import {
  ChevronRightIcon,
  DumbbellOutlineIcon,
} from "../../assets/icons";
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

// Circular progress ring component
const ProgressRing = ({
  progress,
  size = 120,
  strokeWidth = 8,
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
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const getFirstName = () => {
    const rawFirstName = user?.name?.split(" ")[0];
    return rawFirstName
      ? rawFirstName.charAt(0).toUpperCase() + rawFirstName.slice(1).toLowerCase()
      : null;
  };

  // Calculate streak (consecutive days with workouts)
  const streak = useMemo(() => {
    if (completedWorkouts.length === 0) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get unique workout dates
    const workoutDates = new Set(
      completedWorkouts.map((w) => {
        const d = parseDate(w.date!);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      }),
    );

    let streakCount = 0;
    const checkDate = new Date(today);

    // Check if worked out today or yesterday to start streak
    const todayTime = today.getTime();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayTime = yesterday.getTime();

    if (!workoutDates.has(todayTime) && !workoutDates.has(yesterdayTime)) {
      return 0;
    }

    // Start from yesterday if no workout today
    if (!workoutDates.has(todayTime)) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    // Count consecutive days
    while (workoutDates.has(checkDate.getTime())) {
      streakCount++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    return streakCount;
  }, [completedWorkouts]);

  const { workoutCount, weeklyCount } = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const workoutCount = completedWorkouts.filter((workout) => {
      const date = parseDate(workout.date!);
      return (
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()
      );
    }).length;

    const weeklyCount = completedWorkouts.filter((workout) => {
      const date = parseDate(workout.date!);
      return date >= startOfWeek;
    }).length;

    return { workoutCount, weeklyCount };
  }, [completedWorkouts]);

  // Find next incomplete workout (first workout without a date)
  const getNextWorkout = (): { week: number; workout: Workout } | null => {
    const sorted = [...programWorkouts].sort((a, b) => a.week - b.week);
    for (const workout of sorted) {
      if (!workout.date) {
        return { week: workout.week, workout };
      }
    }
    return null;
  };

  // Calculate overall program progress
  const getProgramProgress = () => {
    if (programWorkouts.length === 0) return { completed: 0, total: 0, percent: 0 };
    const completed = programWorkouts.filter((w) => w.date).length;
    const total = programWorkouts.length;
    return { completed, total, percent: Math.round((completed / total) * 100) };
  };

  // Calculate week progress
  const getWeekProgress = () => {
    if (programWorkouts.length === 0) return { completed: 0, total: 0, week: 1 };

    const byWeek: Record<number, { completed: number; total: number }> = {};
    for (const workout of programWorkouts) {
      const entry = byWeek[workout.week] || { completed: 0, total: 0 };
      entry.total++;
      if (workout.date) entry.completed++;
      byWeek[workout.week] = entry;
    }

    const weeks = Object.keys(byWeek)
      .map(Number)
      .sort((a, b) => a - b);
    for (const week of weeks) {
      const { completed, total } = byWeek[week];
      if (completed < total) {
        return { completed, total, week };
      }
    }

    const lastWeek = weeks[weeks.length - 1];
    const lastWeekData = byWeek[lastWeek];
    return {
      completed: lastWeekData.total,
      total: lastWeekData.total,
      week: lastWeek,
    };
  };

  const nextWorkout = getNextWorkout();
  const weekProgress = getWeekProgress();
  const programProgress = getProgramProgress();

  const handleStartWorkout = () => {
    if (activeWorkout) {
      navigate("/workout");
      return;
    }

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

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

    const diffDays = Math.floor(
      (today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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

  const isLoading = isLoadingProgram || isLoadingHistory;
  const firstName = getFirstName();

  return (
    <div className={styles.container}>
      {/* Hero Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <span className={styles.greeting}>{getGreeting()}</span>
          <h1 className={styles.userName}>{firstName || "Athlete"}</h1>
        </div>
        {streak > 0 && (
          <div className={styles.streakBadge}>
            <Flame size={16} className={styles.streakIcon} />
            <span className={styles.streakCount}>{streak}</span>
          </div>
        )}
      </header>

      {/* Stats Row */}
      {!isLoading && completedWorkouts.length > 0 && (
        <div className={styles.statsRow}>
          <div className={styles.statPill}>
            <Calendar size={14} />
            <span>{weeklyCount} this week</span>
          </div>
          <div className={styles.statPill}>
            <Target size={14} />
            <span>{workoutCount} this month</span>
          </div>
        </div>
      )}

      {/* Main Action Area */}
      <div className={styles.heroSection}>
        {isLoadingProgram ? (
          <div className={styles.loadingState}>
            <Loader2 size={32} className={styles.spinner} />
          </div>
        ) : activeWorkout ? (
          /* Resume Active Workout */
          <button className={styles.heroCard} onClick={() => navigate("/workout")}>
            <div className={styles.heroCardGlow} />
            <div className={styles.heroCardContent}>
              <div className={styles.heroIconWrap}>
                <Play size={28} fill="currentColor" />
              </div>
              <div className={styles.heroTextWrap}>
                <span className={styles.heroLabel}>In Progress</span>
                <span className={styles.heroTitle}>{activeWorkout.workoutName}</span>
              </div>
              <ChevronRightIcon size={24} className={styles.heroChevron} />
            </div>
          </button>
        ) : activeProgram && nextWorkout ? (
          /* Program Progress + Next Workout */
          <div className={styles.programHero}>
            <button
              className={styles.progressCircleWrap}
              onClick={() => navigate(`/programs/${activeProgram.id}`)}
            >
              <ProgressRing progress={programProgress.percent} />
              <div className={styles.progressCircleInner}>
                <span className={styles.progressPercent}>{programProgress.percent}%</span>
                <span className={styles.progressLabel}>complete</span>
              </div>
            </button>

            <div className={styles.programInfo}>
              <button
                className={styles.programNameBtn}
                onClick={() => navigate(`/programs/${activeProgram.id}`)}
              >
                <span className={styles.programName}>{activeProgram.name}</span>
                <ChevronRightIcon size={16} />
              </button>
              <span className={styles.weekIndicator}>
                Week {weekProgress.week} · {weekProgress.completed}/{weekProgress.total} done
              </span>
            </div>
          </div>
        ) : (
          /* Empty State - No Program */
          <div className={styles.emptyHero}>
            <div className={styles.emptyIconWrap}>
              <DumbbellOutlineIcon size={40} />
            </div>
            <h2 className={styles.emptyTitle}>Ready to train?</h2>
            <p className={styles.emptySubtitle}>
              Start a quick workout or create a program
            </p>
          </div>
        )}
      </div>

      {/* Primary CTA - Thumb Zone */}
      <div className={styles.ctaSection}>
        {activeWorkout ? (
          <button
            className={styles.primaryCta}
            onClick={() => navigate("/workout")}
          >
            <Play size={20} fill="currentColor" />
            <span>Continue Workout</span>
          </button>
        ) : activeProgram && nextWorkout ? (
          <>
            <button className={styles.primaryCta} onClick={handleStartWorkout}>
              <DumbbellOutlineIcon size={20} />
              <span>{nextWorkout.workout.name}</span>
            </button>
            <button
              className={styles.secondaryCta}
              onClick={() => navigate("/quick-workout")}
            >
              <Zap size={18} />
              <span>Quick Workout</span>
            </button>
          </>
        ) : (
          <div className={styles.ctaRow}>
            <button
              className={styles.primaryCta}
              onClick={() => navigate("/quick-workout")}
            >
              <Zap size={20} />
              <span>Quick Workout</span>
            </button>
            <button
              className={styles.outlineCta}
              onClick={() => navigate("/programs/create")}
            >
              <Plus size={20} />
              <span>New Program</span>
            </button>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      {lastWorkout && (
        <section className={styles.recentSection}>
          <h3 className={styles.sectionLabel}>Recent</h3>
          <button
            className={styles.recentCard}
            onClick={() => navigate("/history")}
          >
            <div className={styles.recentIcon}>
              <DumbbellOutlineIcon size={18} />
            </div>
            <div className={styles.recentInfo}>
              <span className={styles.recentName}>{lastWorkout.name}</span>
              <span className={styles.recentMeta}>
                {formatDateRelative(lastWorkout.date!)}
                {lastWorkout.duration && ` · ${formatDuration(lastWorkout.duration)}`}
              </span>
            </div>
            <ChevronRightIcon size={18} className={styles.recentChevron} />
          </button>
        </section>
      )}
    </div>
  );
};

export default Home;
