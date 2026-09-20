import { useState, useMemo } from "react";
import { Loader2, TrendingUp } from "lucide-react";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ChartBarsIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  MagnifierIcon,
  CrossIcon,
  WarningIcon,
} from "../../assets/icons";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  useGetAnalyticsProgression,
  type ProgressionEntry,
} from "../../api/analytics";
import { useGetOnboarding } from "../../api/onboarding";
import { useSettings } from "../../contexts/SettingsContext";
import { PlateauDrawer } from "./PlateauDrawer";
import styles from "./Analytics.module.css";

type TabType = "strength" | "volume";

// Flat/declining e1RM only signals a problem worth flagging when the user's
// goal is actually progressive overload — for fat loss, maintenance, or a
// deliberate deload it's expected, not a stall.
const PLATEAU_ELIGIBLE_GOALS = new Set(["BUILD_MUSCLE", "GAIN_STRENGTH"]);

const Analytics = () => {
  const { weightUnit } = useSettings();
  const [activeTab, setActiveTab] = useState<TabType>("strength");
  const { data: onboardingData } = useGetOnboarding();
  const isPlateauEligible = PLATEAU_ELIGIBLE_GOALS.has(onboardingData?.onboarding?.goal ?? "");

  // Progression state
  const { data: progressionData, isLoading: isLoadingProgression } = useGetAnalyticsProgression();
  const exercises = progressionData?.exercises || [];
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
  const [expandedVolumeExercise, setExpandedVolumeExercise] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [volumeSearchQuery, setVolumeSearchQuery] = useState("");
  const [plateauDrawerExercise, setPlateauDrawerExercise] = useState<string | null>(null);

  // A plateau = the most recent sessions haven't set a new all-time e1RM,
  // two sessions in a row. Checking consecutive sessions (rather than fitting
  // a trend line across a whole window) means a single anomalous session —
  // a deload, an off day, a lighter technique-focused session — can't by
  // itself flip a genuinely improving exercise into "plateaued"; the stall
  // has to actually persist right up to now.
  const PLATEAU_MIN_SESSIONS = 4;
  const PLATEAU_STALLED_STREAK = 2;

  const detectPlateau = (entries: ProgressionEntry[]) => {
    const withE1rm = entries.filter((e) => e.e1rm);
    if (withE1rm.length < PLATEAU_MIN_SESSIONS) return null;

    // Walk oldest to newest, tracking the best e1RM seen so far and whether
    // each session did (or didn't) beat it.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercises, isPlateauEligible]);

  // Filter exercises based on search, plateaued exercises sorted first
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

  const filteredVolumeExercises = useMemo(() => {
    if (!volumeSearchQuery.trim()) return exercises;
    const query = volumeSearchQuery.toLowerCase();
    return exercises.filter((ex) => ex.exercise.toLowerCase().includes(query));
  }, [exercises, volumeSearchQuery]);

  const formatDate = (dateStr: string) => {
    const [day, month] = dateStr.split("/");
    return `${day}/${month}`;
  };

  const getProgressChange = (entries: ProgressionEntry[]) => {
    if (entries.length < 2) return null;
    const first = entries[0].weight;
    const last = entries[entries.length - 1].weight;
    const change = last - first;
    const percent = ((change / first) * 100).toFixed(1);
    return { change, percent, isPositive: change >= 0 };
  };

  const toggleExercise = (exercise: string) => {
    setExpandedExercise(expandedExercise === exercise ? null : exercise);
  };

  const toggleVolumeExercise = (exercise: string) => {
    setExpandedVolumeExercise(expandedVolumeExercise === exercise ? null : exercise);
  };

  const getVolumeChange = (entries: ProgressionEntry[]) => {
    if (entries.length < 2) return null;
    const first = entries[0].weight * entries[0].reps * entries[0].sets;
    const last = entries[entries.length - 1].weight * entries[entries.length - 1].reps * entries[entries.length - 1].sets;
    if (first === 0) return null;
    const change = last - first;
    const percent = ((change / first) * 100).toFixed(1);
    return { change, percent, isPositive: change >= 0 };
  };

  const parseDate = (dateStr: string) => {
    const [day, month, year] = dateStr.split("/").map(Number);
    return new Date(year, month - 1, day);
  };

  const getWeekStart = (date: Date) => {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    const day = result.getDay();
    result.setDate(result.getDate() - (day === 0 ? 6 : day - 1));
    return result;
  };

  const now = new Date();
  const sessionDates = new Set(
    exercises.flatMap((exercise) => exercise.entries.map((entry) => entry.date)),
  );
  const sessionsThisMonth = [...sessionDates].filter((date) => {
    const parsed = parseDate(date);
    return parsed.getMonth() === now.getMonth() && parsed.getFullYear() === now.getFullYear();
  }).length;
  const weeklyVolume: Record<number, number> = {};
  exercises.forEach((exercise) => exercise.entries.forEach((entry) => {
    const week = getWeekStart(parseDate(entry.date)).getTime();
    weeklyVolume[week] = (weeklyVolume[week] || 0) + entry.weight * entry.reps;
  }));
  const currentWeek = getWeekStart(now).getTime();
  const previousWeek = currentWeek - 7 * 24 * 60 * 60 * 1000;
  const currentWeekVolume = weeklyVolume[currentWeek] || 0;
  const previousWeekVolume = weeklyVolume[previousWeek] || 0;
  const volumeChange = previousWeekVolume > 0
    ? Math.round(((currentWeekVolume - previousWeekVolume) / previousWeekVolume) * 100)
    : null;

  return (
    <div className={styles.container}>
      <span className={styles.eyebrow}>GYMERR / STATS</span>
      <h1 className={styles.title}>Analytics</h1>

      <div className={styles.summaryStrip}>
        <div className={styles.summaryMetric}>
          <span className={styles.summaryLabel}>Sessions this month</span>
          <strong>{sessionsThisMonth}</strong>
        </div>
        <div className={styles.summaryMetric}>
          <span className={styles.summaryLabel}>Volume vs last week</span>
          <strong
            className={`${styles.summaryVolumeValue} ${volumeChange !== null && volumeChange >= 0 ? styles.volumeUp : styles.volumeDown}`}
          >
            {volumeChange !== null &&
              (volumeChange >= 0 ? (
                <ArrowUpIcon size={16} />
              ) : (
                <ArrowDownIcon size={16} />
              ))}
            {volumeChange === null ? "—" : `${volumeChange >= 0 ? "+" : ""}${volumeChange}%`}
          </strong>
        </div>
      </div>

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
          <ChartBarsIcon size={16} />
          <span>Volume</span>
        </button>
      </div>

      {/* Strength Tab */}
      {activeTab === "strength" && (
        <>
          {/* Search Input */}
          {!isLoadingProgression && exercises.length > 0 && (
            <div className={styles.searchContainer}>
              <MagnifierIcon size={18} className={styles.searchIcon} />
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
                  aria-label="Clear search"
                >
                  <CrossIcon size={16} />
                </button>
              )}
            </div>
          )}

          {isLoadingProgression ? (
            <div className={styles.loadingState}>
              <Loader2 size={24} className={styles.spinner} />
              <span>Loading progression data...</span>
            </div>
          ) : exercises.length === 0 ? (
            <div className={styles.emptyState}>
              <TrendingUp size={48} className={styles.emptyIcon} />
              <p>No exercise data yet.</p>
              <p className={styles.emptySubtext}>
                Complete some workouts to see your progression.
              </p>
            </div>
          ) : filteredExercises.length === 0 ? (
            <div className={styles.emptyState}>
              <MagnifierIcon size={48} className={styles.emptyIcon} />
              <p>No exercises match "{searchQuery}"</p>
            </div>
          ) : (
            <div className={styles.exerciseList}>
              {filteredExercises.map((ex) => {
                const progress = getProgressChange(ex.entries);
                const isExpanded = expandedExercise === ex.exercise;
                const chartData = ex.entries.map((e) => ({
                  date: formatDate(e.date),
                  e1rm: e.e1rm,
                }));
                const latestWeight = ex.entries[ex.entries.length - 1]?.weight;
                const bestEver = Math.max(...ex.entries.map((entry) => entry.e1rm || 0));
                const lastTrained = parseDate(ex.entries[ex.entries.length - 1].date);
                const daysSinceLastTrained = Math.max(0, Math.floor((now.getTime() - lastTrained.getTime()) / (24 * 60 * 60 * 1000)));

                return (
                  <div key={ex.exercise} className={styles.exerciseCard}>
                    <div
                      role="button"
                      tabIndex={0}
                      className={styles.exerciseHeader}
                      onClick={() => toggleExercise(ex.exercise)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") toggleExercise(ex.exercise);
                      }}
                    >
                      <div className={styles.exerciseInfo}>
                        <span className={styles.exerciseName}>
                          {ex.exercise}
                          {plateauedNames.has(ex.exercise) && (
                            <button
                              type="button"
                              className={styles.plateauBadge}
                              onClick={(e) => {
                                e.stopPropagation();
                                setPlateauDrawerExercise(ex.exercise);
                              }}
                            >
                              <WarningIcon size={11} />
                              Plateau
                            </button>
                          )}
                        </span>
                        <div className={styles.exerciseMeta}>
                          <span className={styles.latestWeight}>
                            {latestWeight} {weightUnit}
                          </span>
                          {progress && (
                            <span
                              className={`${styles.progressBadge} ${
                                progress.isPositive
                                  ? styles.progressPositive
                                  : styles.progressNegative
                              }`}
                            >
                              {progress.isPositive ? "+" : ""}
                              {progress.change.toFixed(1)} ({progress.percent}%)
                            </span>
                          )}
                        </div>
                      </div>
                      <div className={styles.expandIcon}>
                        {isExpanded ? (
                          <ChevronUpIcon size={20} />
                        ) : (
                          <ChevronDownIcon size={20} />
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className={styles.exerciseContent}>
                        <div className={styles.exerciseDetails}>
                          <span>All-time PR: {bestEver.toFixed(1)} {weightUnit} e1RM</span>
                          <span>Last trained: {daysSinceLastTrained === 0 ? "today" : `${daysSinceLastTrained} days ago`}</span>
                        </div>
                        {chartData.length >= 2 ? (
                          <div className={styles.chartContainer}>
                            <ResponsiveContainer width="100%" height={160}>
                              <LineChart
                                data={chartData}
                                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                              >
                                <XAxis
                                  dataKey="date"
                                  axisLine={false}
                                  tickLine={false}
                                  tick={{ fontSize: 10, fill: "#71717a" }}
                                  interval="preserveStartEnd"
                                />
                                <YAxis
                                  domain={["dataMin - 2", "dataMax + 2"]}
                                  axisLine={false}
                                  tickLine={false}
                                  tick={{ fontSize: 10, fill: "#71717a" }}
                                  tickFormatter={(v) => v.toFixed(0)}
                                  width={40}
                                />
                                <Tooltip
                                  contentStyle={{
                                    background: "var(--bg-secondary)",
                                    border: "1px solid var(--border-default)",
                                    borderRadius: "8px",
                                    padding: "8px 12px",
                                    fontSize: "12px",
                                  }}
                                  labelStyle={{
                                    color: "var(--text-muted)",
                                    marginBottom: "4px",
                                  }}
                                  itemStyle={{ color: "var(--text-primary)" }}
                                  formatter={(value) => [
                                    `${Number(value).toFixed(1)} ${weightUnit}`,
                                    "Estimated 1RM",
                                  ]}
                                />
                                <Line
                                  type="monotone"
                                  dataKey="e1rm"
                                  stroke="#22c55e"
                                  strokeWidth={2}
                                  dot={{
                                    fill: "var(--bg-primary)",
                                    stroke: "#22c55e",
                                    strokeWidth: 2,
                                    r: 3,
                                  }}
                                  activeDot={{
                                    fill: "#22c55e",
                                    stroke: "var(--bg-primary)",
                                    strokeWidth: 2,
                                    r: 5,
                                  }}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        ) : (
                          <div className={styles.notEnoughData}>
                            Need at least 2 sessions to show progression
                          </div>
                        )}

                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {activeTab === "volume" && (
        <>
          {/* Search Input */}
          {!isLoadingProgression && exercises.length > 0 && (
            <div className={styles.searchContainer}>
              <MagnifierIcon size={18} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search exercises..."
                value={volumeSearchQuery}
                onChange={(e) => setVolumeSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
              {volumeSearchQuery && (
                <button
                  className={styles.searchClear}
                  onClick={() => setVolumeSearchQuery("")}
                  aria-label="Clear search"
                >
                  <CrossIcon size={16} />
                </button>
              )}
            </div>
          )}

          {isLoadingProgression ? (
            <div className={styles.loadingState}>
              <Loader2 size={24} className={styles.spinner} />
              <span>Loading volume data...</span>
            </div>
          ) : exercises.length === 0 ? (
            <div className={styles.emptyState}>
              <ChartBarsIcon size={48} className={styles.emptyIcon} />
              <p>No volume data yet.</p>
              <p className={styles.emptySubtext}>
                Complete some workouts to see your volume.
              </p>
            </div>
          ) : filteredVolumeExercises.length === 0 ? (
            <div className={styles.emptyState}>
              <MagnifierIcon size={48} className={styles.emptyIcon} />
              <p>No exercises match "{volumeSearchQuery}"</p>
            </div>
          ) : (
            <div className={styles.exerciseList}>
              {filteredVolumeExercises.map((ex) => {
                const volumeChange = getVolumeChange(ex.entries);
                const isExpanded = expandedVolumeExercise === ex.exercise;
                const chartData = ex.entries.map((e) => ({
                  date: formatDate(e.date),
                  volume: Math.round(e.weight * e.reps * e.sets),
                }));
                const latestEntry = ex.entries[ex.entries.length - 1];
                const latestVolume = Math.round(latestEntry.weight * latestEntry.reps * latestEntry.sets);
                const bestVolume = Math.max(...chartData.map((d) => d.volume));
                const lastTrained = parseDate(latestEntry.date);
                const daysSinceLastTrained = Math.max(0, Math.floor((now.getTime() - lastTrained.getTime()) / (24 * 60 * 60 * 1000)));

                return (
                  <div key={ex.exercise} className={styles.exerciseCard}>
                    <div
                      role="button"
                      tabIndex={0}
                      className={styles.exerciseHeader}
                      onClick={() => toggleVolumeExercise(ex.exercise)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") toggleVolumeExercise(ex.exercise);
                      }}
                    >
                      <div className={styles.exerciseInfo}>
                        <span className={styles.exerciseName}>{ex.exercise}</span>
                        <div className={styles.exerciseMeta}>
                          <span className={styles.latestWeight}>
                            {latestVolume.toLocaleString()} {weightUnit}
                          </span>
                          {volumeChange && (
                            <span
                              className={`${styles.progressBadge} ${
                                volumeChange.isPositive
                                  ? styles.progressPositive
                                  : styles.progressNegative
                              }`}
                            >
                              {volumeChange.isPositive ? "+" : ""}
                              {volumeChange.change.toLocaleString()} ({volumeChange.percent}%)
                            </span>
                          )}
                        </div>
                      </div>
                      <div className={styles.expandIcon}>
                        {isExpanded ? (
                          <ChevronUpIcon size={20} />
                        ) : (
                          <ChevronDownIcon size={20} />
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className={styles.exerciseContent}>
                        <div className={styles.exerciseDetails}>
                          <span>All-time best: {bestVolume.toLocaleString()} {weightUnit} volume</span>
                          <span>Last trained: {daysSinceLastTrained === 0 ? "today" : `${daysSinceLastTrained} days ago`}</span>
                        </div>
                        {chartData.length >= 2 ? (
                          <div className={styles.chartContainer}>
                            <ResponsiveContainer width="100%" height={160}>
                              <BarChart
                                data={chartData}
                                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                              >
                                <XAxis
                                  dataKey="date"
                                  axisLine={false}
                                  tickLine={false}
                                  tick={{ fontSize: 10, fill: "#71717a" }}
                                  interval="preserveStartEnd"
                                />
                                <YAxis
                                  axisLine={false}
                                  tickLine={false}
                                  tick={{ fontSize: 10, fill: "#71717a" }}
                                  tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                                  width={40}
                                />
                                <Tooltip
                                  contentStyle={{
                                    background: "var(--bg-secondary)",
                                    border: "1px solid var(--border-default)",
                                    borderRadius: "8px",
                                    padding: "8px 12px",
                                    fontSize: "12px",
                                  }}
                                  labelStyle={{
                                    color: "var(--text-muted)",
                                    marginBottom: "4px",
                                  }}
                                  itemStyle={{ color: "var(--text-primary)" }}
                                  formatter={(value) => [
                                    `${Number(value).toLocaleString()} ${weightUnit}`,
                                    "Volume",
                                  ]}
                                />
                                <Bar
                                  dataKey="volume"
                                  fill="var(--accent-green)"
                                  radius={[4, 4, 0, 0]}
                                />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        ) : (
                          <div className={styles.notEnoughData}>
                            Need at least 2 sessions to show volume
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
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
