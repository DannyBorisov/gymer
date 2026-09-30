import { useState, useMemo } from "react";
import { Loader2, TrendingUp, BarChart3, Search, X, AlertTriangle, Heart } from "lucide-react";
import { ChevronDownIcon, ChevronUpIcon } from "../../assets/icons";
import { Chart } from "../../components/ui/Chart";
import {
  useGetAnalyticsProgression,
  useGetAnalyticsSummary,
  useGetMuscleGroupVolume,
  useGetMuscleRecovery,
  type ProgressionEntry,
} from "../../api/analytics";
import { useGetOnboarding } from "../../api/onboarding";
import { useSettings } from "../../contexts/SettingsContext";
import { PlateauDrawer } from "./PlateauDrawer";
import { ProgressSummary } from "./components/ProgressSummary";
import { MuscleGroupVolume } from "./components/MuscleGroupVolume";
import { MuscleRecovery } from "./components/MuscleRecovery";
import styles from "./Analytics.module.css";

type TabType = "strength" | "volume" | "recovery";

const PLATEAU_ELIGIBLE_GOALS = new Set(["BUILD_MUSCLE", "GAIN_STRENGTH"]);

const Analytics = () => {
  const { weightUnit } = useSettings();
  const [activeTab, setActiveTab] = useState<TabType>("strength");
  const { data: onboardingData } = useGetOnboarding();
  const isPlateauEligible = PLATEAU_ELIGIBLE_GOALS.has(onboardingData?.onboarding?.goal ?? "");

  // Only fetch data for the active tab
  const isStrengthOrVolume = activeTab === "strength" || activeTab === "volume";
  const isRecoveryTab = activeTab === "recovery";

  const { data: progressionData, isLoading: isLoadingProgression } = useGetAnalyticsProgression(isStrengthOrVolume);
  const { data: summaryData, isLoading: isLoadingSummary } = useGetAnalyticsSummary(isStrengthOrVolume);
  const { data: volumeData } = useGetMuscleGroupVolume("week", isStrengthOrVolume);
  const { data: recoveryData, isLoading: isLoadingRecovery } = useGetMuscleRecovery(isRecoveryTab);

  const exercises = progressionData?.exercises || [];
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [plateauDrawerExercise, setPlateauDrawerExercise] = useState<string | null>(null);

  const isLoading = isStrengthOrVolume && (isLoadingProgression || isLoadingSummary);

  const PLATEAU_MIN_SESSIONS = 4;
  const PLATEAU_STALLED_STREAK = 4;

  const detectPlateau = (entries: ProgressionEntry[]) => {
    const withE1rm = entries.filter((e) => e.e1rm);
    if (withE1rm.length < PLATEAU_MIN_SESSIONS) return null;

    let bestSoFar = -Infinity;
    let stalledStreak = 0;
    for (const entry of withE1rm) {
      const e1rm = entry.e1rm!;
      if (e1rm > bestSoFar) {
        bestSoFar = e1rm;
        stalledStreak = 0;
      } else {
        stalledStreak += 1;
      }
    }

    if (stalledStreak < PLATEAU_STALLED_STREAK) return null;
    return { sessionsStalled: stalledStreak };
  };

  const plateauedNames = useMemo(() => {
    if (!isPlateauEligible) return new Set<string>();
    return new Set(
      exercises.filter((ex) => detectPlateau(ex.entries) !== null).map((ex) => ex.exercise),
    );
  }, [exercises, isPlateauEligible]);

  const filteredExercises = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const matched = query
      ? exercises.filter((ex) => ex.exercise.toLowerCase().includes(query))
      : exercises;
    return [...matched].sort((a, b) => {
      const aPlateaued = plateauedNames.has(a.exercise);
      const bPlateaued = plateauedNames.has(b.exercise);
      if (aPlateaued === bPlateaued) return 0;
      return aPlateaued ? -1 : 1;
    });
  }, [exercises, searchQuery, plateauedNames]);

  const formatDate = (dateStr: string) => {
    const [day, month] = dateStr.split("/");
    return `${day}/${month}`;
  };

  const parseDate = (dateStr: string) => {
    const [day, month, year] = dateStr.split("/").map(Number);
    return new Date(year, month - 1, day);
  };

  const getProgressChange = (entries: ProgressionEntry[]) => {
    if (entries.length < 2) return null;

    const last = entries[entries.length - 1];
    const lastE1rm = last.e1rm || 0;
    const lastDate = parseDate(last.date);

    // Time periods to check: 1W, 1M, 3M, 6M
    const periods = [
      { days: 7, label: "1W" },
      { days: 30, label: "1M" },
      { days: 90, label: "3M" },
      { days: 180, label: "6M" },
    ];

    // Find the best matching period (longest period with data)
    for (const period of periods.reverse()) {
      const cutoff = new Date(lastDate);
      cutoff.setDate(cutoff.getDate() - period.days);

      // Find entry closest to (but not after) cutoff
      const compareEntry = entries.find((e) => parseDate(e.date) <= cutoff);
      if (compareEntry && compareEntry.e1rm) {
        const compareE1rm = compareEntry.e1rm;
        const change = lastE1rm - compareE1rm;
        const percent = ((change / compareE1rm) * 100).toFixed(1);
        return { change, percent, isPositive: change >= 0, period: period.label };
      }
    }

    // Fallback: compare first to last if no period matches
    const first = entries[0].e1rm || 0;
    if (first === 0) return null;
    const change = lastE1rm - first;
    const percent = ((change / first) * 100).toFixed(1);
    return { change, percent, isPositive: change >= 0, period: null };
  };

  const getVolumeChange = (entries: ProgressionEntry[]) => {
    if (entries.length < 2) return null;

    const last = entries[entries.length - 1];
    const lastVolume = last.weight * last.reps * last.sets;
    const lastDate = parseDate(last.date);

    // Time periods to check: 1W, 1M, 3M, 6M
    const periods = [
      { days: 7, label: "1W" },
      { days: 30, label: "1M" },
      { days: 90, label: "3M" },
      { days: 180, label: "6M" },
    ];

    // Find the best matching period (longest period with data)
    for (const period of periods.reverse()) {
      const cutoff = new Date(lastDate);
      cutoff.setDate(cutoff.getDate() - period.days);

      // Find entry closest to (but not after) cutoff
      const compareEntry = entries.find((e) => parseDate(e.date) <= cutoff);
      if (compareEntry) {
        const compareVolume = compareEntry.weight * compareEntry.reps * compareEntry.sets;
        if (compareVolume > 0) {
          const change = lastVolume - compareVolume;
          const percent = ((change / compareVolume) * 100).toFixed(1);
          return { change, percent, isPositive: change >= 0, period: period.label };
        }
      }
    }

    // Fallback: compare first to last if no period matches
    const first = entries[0].weight * entries[0].reps * entries[0].sets;
    if (first === 0) return null;
    const change = lastVolume - first;
    const percent = ((change / first) * 100).toFixed(1);
    return { change, percent, isPositive: change >= 0, period: null };
  };

  const now = new Date();
  const gender = onboardingData?.onboarding?.gender || "MALE";

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <h1 className={styles.title}>Analytics</h1>
      </header>

      {/* Summary Section */}
      {!isLoading && summaryData?.summary && (
        <ProgressSummary summary={summaryData.summary} />
      )}

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === "strength" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("strength")}
        >
          <TrendingUp size={16} />
          <span>Strength</span>
        </button>
        <button
          className={`${styles.tab} ${activeTab === "volume" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("volume")}
        >
          <BarChart3 size={16} />
          <span>Volume</span>
        </button>
        <button
          className={`${styles.tab} ${activeTab === "recovery" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("recovery")}
        >
          <Heart size={16} />
          <span>Recovery</span>
        </button>
      </div>

      {/* Recovery Tab Content */}
      {activeTab === "recovery" && (
        isLoadingRecovery ? (
          <div className={styles.loadingState}>
            <Loader2 size={24} className={styles.spinner} />
          </div>
        ) : recoveryData?.recovery ? (
          <MuscleRecovery recovery={recoveryData.recovery} gender={gender} />
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <Heart size={32} />
            </div>
            <p className={styles.emptyTitle}>No recovery data yet</p>
            <p className={styles.emptySubtitle}>
              We'll track which muscles need rest based on your workout history
            </p>
            <p className={styles.emptyHint}>
              Recovery tracking helps you avoid overtraining
            </p>
          </div>
        )
      )}

      {/* Strength/Volume Tab Content */}
      {(activeTab === "strength" || activeTab === "volume") && (
        <>
          {/* Search */}
          {!isLoading && exercises.length > 0 && (
            <div className={styles.searchWrap}>
              <Search size={18} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search exercises..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
              {searchQuery && (
                <button
                  className={styles.searchClear}
                  onClick={() => setSearchQuery("")}
                >
                  <X size={16} />
                </button>
              )}
            </div>
          )}

          {/* Content */}
          {isLoading ? (
            <div className={styles.loadingState}>
              <Loader2 size={24} className={styles.spinner} />
            </div>
          ) : exercises.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <TrendingUp size={32} />
              </div>
              <p className={styles.emptyTitle}>No progress data yet</p>
              <p className={styles.emptySubtitle}>
                Complete a few workouts and we'll start tracking your strength gains
              </p>
              <p className={styles.emptyHint}>
                Tip: Log at least 2 sessions of the same exercise to see trends
              </p>
            </div>
          ) : filteredExercises.length === 0 ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyTitle}>No matches for "{searchQuery}"</p>
            </div>
          ) : (
            <>
              {/* Exercise List */}
              <div className={styles.exerciseList}>
                {filteredExercises.map((ex) => {
                  const isExpanded = expandedExercise === ex.exercise;
                  const latestEntry = ex.entries[ex.entries.length - 1];
                  const latestWeight = latestEntry?.weight;
                  const latestVolume = Math.round(latestEntry.weight * latestEntry.reps * latestEntry.sets);
                  const bestE1rm = Math.max(...ex.entries.map((e) => e.e1rm || 0));
                  const bestVolume = Math.max(
                    ...ex.entries.map((e) => Math.round(e.weight * e.reps * e.sets)),
                  );
                  const lastTrained = parseDate(latestEntry.date);
                  const daysSince = Math.max(
                    0,
                    Math.floor((now.getTime() - lastTrained.getTime()) / (24 * 60 * 60 * 1000)),
                  );

                  const progress =
                    activeTab === "strength"
                      ? getProgressChange(ex.entries)
                      : getVolumeChange(ex.entries);

                  const chartData =
                    activeTab === "strength"
                      ? ex.entries.map((e) => ({ date: formatDate(e.date), value: e.e1rm }))
                      : ex.entries.map((e) => ({
                          date: formatDate(e.date),
                          value: Math.round(e.weight * e.reps * e.sets),
                        }));

                  const isPlateau = plateauedNames.has(ex.exercise);

                  return (
                    <div key={ex.exercise} className={styles.exerciseCard}>
                      <button
                        className={styles.exerciseHeader}
                        onClick={() => setExpandedExercise(isExpanded ? null : ex.exercise)}
                      >
                        <div className={styles.exerciseInfo}>
                          <div className={styles.exerciseNameRow}>
                            <span className={styles.exerciseName}>{ex.exercise}</span>
                            {isPlateau && (
                              <button
                                className={styles.plateauBadge}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPlateauDrawerExercise(ex.exercise);
                                }}
                              >
                                <AlertTriangle size={12} />
                                <span>Plateau</span>
                              </button>
                            )}
                          </div>
                          <div className={styles.exerciseMeta}>
                            <span className={styles.latestValue}>
                              {activeTab === "strength"
                                ? `${latestWeight} ${weightUnit}`
                                : `${latestVolume.toLocaleString()} ${weightUnit}`}
                            </span>
                            {progress && (
                              <span
                                className={`${styles.changeBadge} ${
                                  progress.isPositive ? styles.changePositive : styles.changeNegative
                                }`}
                              >
                                {progress.isPositive ? "+" : ""}
                                {progress.percent}%
                                {progress.period && (
                                  <span className={styles.changePeriod}>{progress.period}</span>
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className={styles.expandIcon}>
                          {isExpanded ? <ChevronUpIcon size={20} /> : <ChevronDownIcon size={20} />}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className={styles.exerciseContent}>
                          <div className={styles.exerciseStats}>
                            <span>
                              Best: {activeTab === "strength"
                                ? `${bestE1rm.toFixed(1)} ${weightUnit} e1RM`
                                : `${bestVolume.toLocaleString()} ${weightUnit}`}
                            </span>
                            <span>
                              {daysSince === 0 ? "Trained today" : `${daysSince}d ago`}
                            </span>
                          </div>

                          {chartData.length >= 2 ? (
                            <div className={styles.chartWrap}>
                              <Chart
                                type={activeTab === "strength" ? "line" : "bar"}
                                data={chartData}
                                xKey="date"
                                series={[{ dataKey: "value", color: "#22c55e" }]}
                                height={140}
                                yDomain={["dataMin - 2", "dataMax + 2"]}
                                yTickFormatter={(v) =>
                                  activeTab === "volume" ? `${Math.round(v / 1000)}k` : v.toFixed(0)
                                }
                                tooltipFormatter={(value) => [
                                  activeTab === "strength"
                                    ? `${Number(value).toFixed(1)} ${weightUnit}`
                                    : `${Number(value).toLocaleString()} ${weightUnit}`,
                                  activeTab === "strength" ? "e1RM" : "Volume",
                                ]}
                              />
                            </div>
                          ) : (
                            <div className={styles.noData}>
                              Need 2+ sessions to show chart
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Muscle Group Volume Section */}
              {volumeData?.volume && (
                <div className={styles.volumeSection}>
                  <MuscleGroupVolume volume={volumeData.volume} />
                </div>
              )}
            </>
          )}
        </>
      )}

      {plateauDrawerExercise && (
        <PlateauDrawer
          exercise={plateauDrawerExercise}
          isOpen={plateauDrawerExercise !== null}
          onClose={() => setPlateauDrawerExercise(null)}
        />
      )}
    </div>
  );
};

export default Analytics;
