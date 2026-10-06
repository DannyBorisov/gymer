import { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Zap, Loader2, Flame, Target, Calendar, Play, Clock } from "lucide-react";
import {
  ChevronRightIcon,
  DumbbellOutlineIcon,
  ListIcon,
} from "../../assets/icons";
import { useSettings } from "../../contexts/SettingsContext";
import { useWorkout } from "../../contexts/WorkoutContext";
import { useAuth } from "../../contexts/AuthContext";
import { useGetProgram } from "../../api/programs";
import { useGetWorkoutHistory, type Workout } from "../../api/workouts";
import { parseDate } from "../../lib/date";
import { AnimatedNumber } from "../../components/ui/AnimatedNumber";
import { Confetti } from "../../components/Confetti";
import { Button } from "../../components/ui/Button";
import ikkosLogo from "../../assets/ikkos-logo.png";
import styles from "./Home.module.css";

interface Program {
  id: string;
  name: string;
  numberOfWeeks: number;
  isComplete: boolean;
  workouts: Workout[];
}

// Circular progress ring component with draw animation
const ProgressRing = ({
  progress,
  size = 120,
  strokeWidth = 8,
  animate = false,
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
  animate?: boolean;
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
        className={`${styles.progressRingFill} ${animate ? styles.progressRingAnimate : ""}`}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        fill="none"
        r={radius}
        cx={size / 2}
        cy={size / 2}
        style={{
          strokeDasharray: circumference,
          strokeDashoffset: animate ? offset : circumference,
          "--target-offset": offset,
          "--circumference": circumference,
        } as React.CSSProperties}
      />
    </svg>
  );
};

// Check if streak is at a milestone
const isStreakMilestone = (streak: number): boolean => {
  return streak === 7 || streak === 14 || streak === 30 || streak === 60 || streak === 100;
};

// Check if progress is at a milestone
const isProgressMilestone = (percent: number): boolean => {
  return percent === 25 || percent === 50 || percent === 75 || percent === 100;
};

const Home = () => {
  const navigate = useNavigate();
  const { activeProgram } = useSettings();
  const { activeWorkout, startWorkout } = useWorkout();
  const { user } = useAuth();

  // Animation states
  const [showConfetti, setShowConfetti] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  const previousStreak = useRef<number | null>(null);
  const previousProgress = useRef<number | null>(null);

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

  // Get exercise count and estimated duration for next workout
  const getNextWorkoutInfo = () => {
    if (!nextWorkout) return null;
    const exercises = nextWorkout.workout.exercises || [];
    const exerciseCount = exercises.length;
    // Rough estimate: 3-4 min per set, average 3 sets per exercise
    const totalSets = exercises.reduce((sum, ex) => sum + (ex.sets?.length || 3), 0);
    const estimatedMinutes = Math.round(totalSets * 3.25);
    return { exerciseCount, estimatedMinutes };
  };

  const nextWorkoutInfo = getNextWorkoutInfo();

  // Trigger confetti on milestone achievements
  useEffect(() => {
    if (isLoadingProgram || isLoadingHistory) return;

    // Check streak milestone
    if (previousStreak.current !== null && streak > previousStreak.current) {
      if (isStreakMilestone(streak)) {
        setShowConfetti(true);
      }
    }
    previousStreak.current = streak;

    // Check progress milestone
    if (previousProgress.current !== null && programProgress.percent > previousProgress.current) {
      if (isProgressMilestone(programProgress.percent)) {
        setShowConfetti(true);
      }
    }
    previousProgress.current = programProgress.percent;
  }, [streak, programProgress.percent, isLoadingProgram, isLoadingHistory]);

  // Trigger animation after mount
  useEffect(() => {
    if (!isLoadingProgram && !isLoadingHistory && !hasAnimated) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => setHasAnimated(true), 100);
      return () => clearTimeout(timer);
    }
  }, [isLoadingProgram, isLoadingHistory, hasAnimated]);

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
  const showMilestoneGlow = isStreakMilestone(streak);

  return (
    <div className={styles.container}>
      {/* Confetti overlay */}
      <Confetti
        trigger={showConfetti}
        onComplete={() => setShowConfetti(false)}
      />

      {/* Hero Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <span className={styles.greeting}>{getGreeting()}</span>
          <h1 className={styles.userName}>{firstName || "Athlete"}</h1>
        </div>
        {streak > 0 && (
          <div className={`${styles.streakBadge} ${showMilestoneGlow ? styles.streakMilestone : ""}`}>
            <Flame size={16} className={styles.streakIcon} />
            <span className={styles.streakCount}>
              <AnimatedNumber value={streak} />
            </span>
          </div>
        )}
      </header>

      {/* Stats Row */}
      {!isLoading && completedWorkouts.length > 0 && (
        <div className={styles.statsRow}>
          <div className={`${styles.statPill} ${hasAnimated ? styles.statPillVisible : ""}`} style={{ animationDelay: "0s" }}>
            <Calendar size={14} />
            <span><AnimatedNumber value={weeklyCount} /> this week</span>
          </div>
          <div className={`${styles.statPill} ${hasAnimated ? styles.statPillVisible : ""}`} style={{ animationDelay: "0.1s" }}>
            <Target size={14} />
            <span><AnimatedNumber value={workoutCount} /> this month</span>
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
          /* Today's Workout Card with Progress Ring */
          <div className={styles.programHeroSection}>
            {/* Progress Card */}
            <button
              className={styles.progressCard}
              onClick={() => navigate(`/programs/${activeProgram.id}`)}
            >
              <div className={styles.progressCardContent}>
                <span className={styles.progressCardLabel}>Program Progress</span>
                <span className={styles.progressCardPercent}>
                  <AnimatedNumber value={programProgress.percent} suffix="%" />
                </span>
                <span className={styles.progressCardHint}>
                  {programProgress.percent === 100 ? "🎉 Complete!" : "Keep it up!"}
                </span>
              </div>
              <div className={`${styles.progressCircleWrap} ${isProgressMilestone(programProgress.percent) ? styles.progressMilestone : ""}`}>
                <ProgressRing progress={programProgress.percent} size={100} strokeWidth={6} animate={hasAnimated} />
                <div className={styles.progressCircleInner}>
                  <img src={ikkosLogo} alt="ikkos" className={styles.progressLogo} />
                </div>
              </div>
            </button>

            {/* Workout Card */}
            <div className={styles.todayWorkoutCard}>
              <div className={styles.todayWorkoutHeader}>
                <span className={styles.todayWorkoutLabel}>Next Workout</span>
                <button
                  className={styles.todayWorkoutChange}
                  onClick={() => navigate(`/programs/${activeProgram.id}`)}
                >
                  Change
                </button>
              </div>
              <div className={styles.todayWorkoutContent}>
                <h2 className={styles.todayWorkoutName}>{nextWorkout.workout.name}</h2>
                <div className={styles.todayWorkoutMeta}>
                  {nextWorkoutInfo && (
                    <>
                      <span className={styles.todayWorkoutMetaItem}>
                        <ListIcon size={14} />
                        {nextWorkoutInfo.exerciseCount} Exercises
                      </span>
                      <span className={styles.todayWorkoutMetaItem}>
                        <Clock size={14} />
                        ~{nextWorkoutInfo.estimatedMinutes} min
                      </span>
                    </>
                  )}
                </div>
                <div className={styles.todayWorkoutWeek}>
                  Week {weekProgress.week} · {weekProgress.completed}/{weekProgress.total} done
                </div>
              </div>
              <Button
                onClick={handleStartWorkout}
                icon={<Play size={20} fill="currentColor" />}
                className={styles.todayWorkoutCta}
              >
                Start Workout
              </Button>
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
          <button
            className={styles.secondaryCta}
            onClick={() => navigate("/quick-workout")}
          >
            <Zap size={18} />
            <span>Quick Workout</span>
          </button>
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
        <section className={`${styles.recentSection} ${hasAnimated ? styles.recentSectionVisible : ""}`}>
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
