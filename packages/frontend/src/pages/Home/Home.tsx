import { useState, useEffect } from "react";
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
import { apiFetch } from "../../utils/api";
import styles from "./Home.module.css";

interface WorkoutHistoryItem {
  id: string;
  date: string;
  name: string;
  type: "quick" | "program";
  duration?: string;
  exerciseCount: number;
}

const Home = () => {
  const navigate = useNavigate();
  const { activeProgram } = useSettings();
  const { startWorkout, activeWorkout } = useWorkout();
  const { user } = useAuth();

  const [programData, setProgramData] = useState<Week[]>([]);
  const [programName, setProgramName] = useState<string>("");
  const [isLoadingProgram, setIsLoadingProgram] = useState(false);
  const [lastWorkout, setLastWorkout] = useState<WorkoutHistoryItem | null>(null);
  const [workoutCount, setWorkoutCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    const rawFirstName = user?.name?.split(" ")[0];
    const firstName = rawFirstName ? rawFirstName.charAt(0).toUpperCase() + rawFirstName.slice(1).toLowerCase() : null;
    const timeGreeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    return firstName ? `${timeGreeting}, ${firstName}` : timeGreeting;
  };

  // Fetch active program data
  useEffect(() => {
    if (!activeProgram) {
      setProgramData([]);
      setProgramName("");
      return;
    }

    const fetchProgram = async () => {
      setIsLoadingProgram(true);
      try {
        const response = await apiFetch(`/api/programs/${activeProgram.id}`);
        const data = await response.json();
        if (response.ok) {
          setProgramData(data.program);
          setProgramName(data.name || activeProgram.name);
        }
      } catch (err) {
        console.error("Failed to fetch program:", err);
      } finally {
        setIsLoadingProgram(false);
      }
    };
    fetchProgram();
  }, [activeProgram]);

  // Fetch workout history for stats
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await apiFetch("/api/workouts/history");
        const data = await response.json();
        if (response.ok && data.workouts) {
          const workouts = data.workouts as WorkoutHistoryItem[];
          if (workouts.length > 0) {
            setLastWorkout(workouts[0]);
          }

          // Count workouts this month
          const now = new Date();
          const thisMonth = workouts.filter((w) => {
            const [day, month, year] = w.date.split("/");
            const workoutDate = new Date(Number(year), Number(month) - 1, Number(day));
            return (
              workoutDate.getMonth() === now.getMonth() &&
              workoutDate.getFullYear() === now.getFullYear()
            );
          });
          setWorkoutCount(thisMonth.length);

          // Calculate streak (consecutive weeks with at least one workout)
          const calculateStreak = () => {
            if (workouts.length === 0) return 0;

            // Get week number for a date (week starts on Sunday)
            const getWeekStart = (date: Date) => {
              const d = new Date(date);
              d.setHours(0, 0, 0, 0);
              d.setDate(d.getDate() - d.getDay()); // Go to Sunday
              return d.getTime();
            };

            const today = new Date();
            const thisWeekStart = getWeekStart(today);
            const msPerWeek = 7 * 24 * 60 * 60 * 1000;

            // Get unique weeks that have workouts
            const workoutWeeks = new Set(
              workouts.map((w) => {
                const [day, month, year] = w.date.split("/");
                const d = new Date(Number(year), Number(month) - 1, Number(day));
                return getWeekStart(d);
              })
            );

            let currentStreak = 0;
            let checkWeek = thisWeekStart;

            // Check if worked out this week or last week to start streak
            if (!workoutWeeks.has(checkWeek)) {
              checkWeek -= msPerWeek; // Check last week
              if (!workoutWeeks.has(checkWeek)) {
                return 0; // No recent workout
              }
            }

            while (workoutWeeks.has(checkWeek)) {
              currentStreak++;
              checkWeek -= msPerWeek;
            }

            return currentStreak;
          };

          setStreak(calculateStreak());
        }
      } catch (err) {
        console.error("Failed to fetch history:", err);
      } finally {
        setIsLoadingHistory(false);
      }
    };
    fetchHistory();
  }, []);

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
        <h1 className={styles.greeting}>{getGreeting()}</h1>
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
            <span className={styles.progressLabel}>Week {weekProgress.week}</span>
            <span className={styles.progressCount}>
              {weekProgress.completed} of {weekProgress.total} workouts
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
        </div>
      )}

      {/* Primary Action */}
      <div className={styles.actionCard}>
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
          // Start next program workout
          <button className={styles.primaryBtn} onClick={handleStartWorkout}>
            <Play size={22} />
            <div className={styles.primaryBtnText}>
              <span className={styles.primaryBtnTitle}>Start Workout</span>
              <span className={styles.primaryBtnSubtitle}>
                {nextWorkout.workout.name}
              </span>
            </div>
            <ChevronRight size={20} />
          </button>
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
