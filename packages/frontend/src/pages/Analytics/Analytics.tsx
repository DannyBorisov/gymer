import { useState, useMemo } from "react";
import { Loader2, TrendingUp, ChevronDown, ChevronUp, BarChart3, ArrowUp, ArrowDown, Search, X } from "lucide-react";
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
import { useSettings } from "../../contexts/SettingsContext";
import styles from "./Analytics.module.css";

type TabType = "progression" | "volume";

const Analytics = () => {
  const { weightUnit } = useSettings();
  const [activeTab, setActiveTab] = useState<TabType>("progression");

  // Progression state
  const { data: progressionData, isLoading: isLoadingProgression } = useGetAnalyticsProgression();
  const exercises = progressionData?.exercises || [];
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter exercises based on search
  const filteredExercises = useMemo(() => {
    if (!searchQuery.trim()) return exercises;
    const query = searchQuery.toLowerCase();
    return exercises.filter((ex) => ex.exercise.toLowerCase().includes(query));
  }, [exercises, searchQuery]);

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
  const weeklyVolume = new Map<number, number>();
  exercises.forEach((exercise) => exercise.entries.forEach((entry) => {
    const week = getWeekStart(parseDate(entry.date)).getTime();
    weeklyVolume.set(week, (weeklyVolume.get(week) || 0) + entry.weight * entry.reps);
  }));
  const currentWeek = getWeekStart(now).getTime();
  const previousWeek = currentWeek - 7 * 24 * 60 * 60 * 1000;
  const currentWeekVolume = weeklyVolume.get(currentWeek) || 0;
  const previousWeekVolume = weeklyVolume.get(previousWeek) || 0;
  const volumeChange = previousWeekVolume > 0
    ? Math.round(((currentWeekVolume - previousWeekVolume) / previousWeekVolume) * 100)
    : null;
  const volumeChartData = Array.from({ length: 8 }, (_, index) => {
    const week = currentWeek - (7 - index) * 7 * 24 * 60 * 60 * 1000;
    const date = new Date(week);
    return { label: `${date.getDate()}/${date.getMonth() + 1}`, volume: Math.round(weeklyVolume.get(week) || 0) };
  });

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Analytics</h1>

      <div className={styles.summaryStrip}>
        <div className={styles.summaryMetric}>
          <span className={styles.summaryLabel}>Sessions this month</span>
          <strong>{sessionsThisMonth}</strong>
        </div>
        <div className={styles.summaryMetric}>
          <span className={styles.summaryLabel}>Volume vs last week</span>
          <strong className={styles.summaryVolumeValue}>
            {volumeChange === null ? "—" : `${volumeChange >= 0 ? "+" : ""}${volumeChange}%`}
          </strong>
        </div>
        <div className={`${styles.volumeChange} ${volumeChange !== null && volumeChange >= 0 ? styles.volumeUp : styles.volumeDown}`}>
          {volumeChange !== null && volumeChange >= 0 ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
          <span>{volumeChange === null ? "No prior week" : `${Math.abs(volumeChange)}% vs last week`}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === "progression" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("progression")}
        >
          <TrendingUp size={16} />
          <span>Progression</span>
        </button>
        <button
          className={`${styles.tab} ${activeTab === "volume" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("volume")}
        >
          <BarChart3 size={16} />
          <span>Volume</span>
        </button>
      </div>

      {/* Progression Tab */}
      {activeTab === "progression" && (
        <>
          {/* Search Input */}
          {!isLoadingProgression && exercises.length > 0 && (
            <div className={styles.searchContainer}>
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
                  aria-label="Clear search"
                >
                  <X size={16} />
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
              <Search size={48} className={styles.emptyIcon} />
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
                    <button
                      className={styles.exerciseHeader}
                      onClick={() => toggleExercise(ex.exercise)}
                    >
                      <div className={styles.exerciseInfo}>
                        <span className={styles.exerciseName}>{ex.exercise}</span>
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
                          <ChevronUp size={20} />
                        ) : (
                          <ChevronDown size={20} />
                        )}
                      </div>
                    </button>

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
        <div className={styles.volumePanel}>
          <div className={styles.volumeHeader}>
            <div>
              <span className={styles.sectionEyebrow}>LAST 8 WEEKS</span>
              <h2>Training volume</h2>
            </div>
            <strong>{currentWeekVolume.toLocaleString()} {weightUnit}</strong>
          </div>
          {exercises.length === 0 ? (
            <div className={styles.emptyState}>
              <BarChart3 size={48} className={styles.emptyIcon} />
              <p>No volume data yet.</p>
            </div>
          ) : (
            <div className={styles.volumeChart}>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={volumeChartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#71717a" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#71717a" }} tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
                  <Tooltip
                    contentStyle={{ background: "var(--bg-secondary)", border: "1px solid var(--border-default)", borderRadius: "8px", fontSize: "12px" }}
                    formatter={(value) => [`${Number(value).toLocaleString()} ${weightUnit}`, "Volume"]}
                  />
                  <Bar dataKey="volume" fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Analytics;
