import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Loader2, ChevronLeft } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { apiFetch } from "../../utils/api";
import { useSettings } from "../../contexts/SettingsContext";

import styles from "./Weight.module.css";

interface WeightEntry {
  date: string;
  weight: string;
}

type ViewPeriod = "daily" | "weekly" | "monthly";

const Weight = () => {
  const navigate = useNavigate();
  const { weightUnit } = useSettings();
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [weightInput, setWeightInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [viewPeriod, setViewPeriod] = useState<ViewPeriod>("daily");

  // Auto-switch to available view if current view doesn't have enough data
  useEffect(() => {
    if (entries.length === 0) return;

    const getAvailableCount = (period: ViewPeriod) => {
      if (period === "daily") return Math.min(entries.length, 30);

      const sortedEntries = [...entries].reverse();
      const [firstDay, firstMonth, firstYear] = sortedEntries[0].date.split("/");
      const firstDate = new Date(Number(firstYear), Number(firstMonth) - 1, Number(firstDay));

      if (period === "weekly") {
        const weeks = new Set<number>();
        entries.forEach((entry) => {
          const [day, month, year] = entry.date.split("/");
          const date = new Date(Number(year), Number(month) - 1, Number(day));
          const msPerWeek = 7 * 24 * 60 * 60 * 1000;
          weeks.add(Math.floor((date.getTime() - firstDate.getTime()) / msPerWeek) + 1);
        });
        return weeks.size;
      }

      const months = new Set<string>();
      entries.forEach((entry) => {
        const [, month, year] = entry.date.split("/");
        months.add(`${year}-${month}`);
      });
      return months.size;
    };

    const currentCount = getAvailableCount(viewPeriod);
    if (currentCount < 2) {
      // Fall back to a view with enough data
      if (getAvailableCount("daily") >= 2) setViewPeriod("daily");
      else if (getAvailableCount("weekly") >= 2) setViewPeriod("weekly");
    }
  }, [entries, viewPeriod]);

  useEffect(() => {
    const fetchEntries = async () => {
      try {
        const response = await apiFetch("/api/body-weight");
        const data = await response.json();
        if (response.ok && data.entries) {
          setEntries(data.entries);
        }
      } catch (err) {
        console.error("Weight fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchEntries();
  }, []);

  const handleSave = async () => {
    if (!weightInput.trim()) return;

    setIsSaving(true);
    try {
      const response = await apiFetch("/api/body-weight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weight: weightInput }),
      });

      if (response.ok) {
        const data = await response.json();
        setEntries((prev) => [
          { date: data.date, weight: data.weight },
          ...prev,
        ]);
        setWeightInput("");
      }
    } catch (err) {
      console.error("Weight save error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const getTodayStr = () => {
    const today = new Date();
    return `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`;
  };

  const formatDisplayDate = (dateStr: string) => {
    const [day, month, year] = dateStr.split("/");
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (dateStr === getTodayStr()) {
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

  const todayStr = getTodayStr();
  const hasLoggedToday = entries[0]?.date === todayStr;

  // Prepare chart data based on view period
  const chartData = useMemo(() => {
    if (entries.length === 0) return [];

    if (viewPeriod === "daily") {
      return entries
        .slice(0, 30)
        .map((entry) => {
          const [day, month] = entry.date.split("/");
          return {
            date: `${day}/${month}`,
            weight: parseFloat(entry.weight),
          };
        })
        .reverse();
    }

    // Group entries by week or month
    const grouped: Map<string, { weights: number[]; sortKey: number }> = new Map();

    // Find the earliest entry date for week calculation
    const sortedEntries = [...entries].reverse(); // oldest first
    let firstEntryDate: Date | null = null;
    if (sortedEntries.length > 0) {
      const [day, month, year] = sortedEntries[0].date.split("/");
      firstEntryDate = new Date(Number(year), Number(month) - 1, Number(day));
    }

    entries.forEach((entry) => {
      const [day, month, year] = entry.date.split("/");
      const date = new Date(Number(year), Number(month) - 1, Number(day));

      let key: string;
      let sortKey: number;

      if (viewPeriod === "weekly") {
        // Calculate week number from first entry
        const msPerWeek = 7 * 24 * 60 * 60 * 1000;
        const weekNum = firstEntryDate
          ? Math.floor((date.getTime() - firstEntryDate.getTime()) / msPerWeek) + 1
          : 1;
        key = `W${weekNum}`;
        sortKey = weekNum;
      } else {
        // Monthly - use year-month for sorting
        key = date.toLocaleDateString("en-US", { month: "short" });
        sortKey = date.getFullYear() * 12 + date.getMonth();
      }

      if (!grouped.has(key)) {
        grouped.set(key, { weights: [], sortKey });
      }
      grouped.get(key)!.weights.push(parseFloat(entry.weight));
    });

    // Calculate averages and convert to array, sorted by sortKey
    const result = Array.from(grouped.entries())
      .map(([date, { weights, sortKey }]) => ({
        date,
        weight: weights.reduce((a, b) => a + b, 0) / weights.length,
        sortKey,
      }))
      .sort((a, b) => a.sortKey - b.sortKey)
      .slice(-(viewPeriod === "weekly" ? 12 : 6))
      .map(({ date, weight }) => ({ date, weight }));

    return result;
  }, [entries, viewPeriod]);

  // Calculate available data points for each view period
  const availableViews = useMemo(() => {
    if (entries.length === 0) return { daily: 0, weekly: 0, monthly: 0 };

    const daily = Math.min(entries.length, 30);

    // Calculate weeks and months
    const sortedEntries = [...entries].reverse();
    const [firstDay, firstMonth, firstYear] = sortedEntries[0].date.split("/");
    const firstDate = new Date(Number(firstYear), Number(firstMonth) - 1, Number(firstDay));

    const weeks = new Set<number>();
    const months = new Set<string>();

    entries.forEach((entry) => {
      const [day, month, year] = entry.date.split("/");
      const date = new Date(Number(year), Number(month) - 1, Number(day));

      const msPerWeek = 7 * 24 * 60 * 60 * 1000;
      const weekNum = Math.floor((date.getTime() - firstDate.getTime()) / msPerWeek) + 1;
      weeks.add(weekNum);

      months.add(`${year}-${month}`);
    });

    return { daily, weekly: weeks.size, monthly: months.size };
  }, [entries]);

  // Calculate average weight
  const avgWeight = useMemo(() => {
    if (chartData.length === 0) return 0;
    const sum = chartData.reduce((acc, entry) => acc + entry.weight, 0);
    return sum / chartData.length;
  }, [chartData]);

  return (
    <div className={styles.container}>
      <button className={styles.backBtn} onClick={() => navigate("/profile")}>
        <ChevronLeft size={18} />
        <span>Profile</span>
      </button>
      <div className={styles.header}>
        <h1 className={styles.title}>Body Weight</h1>
      </div>

      {/* Log weight input */}
      <div className={styles.logCard}>
        {hasLoggedToday ? (
          <div className={styles.loggedToday}>
            <Check size={20} />
            <span>
              Logged today: {entries[0].weight} {weightUnit}
            </span>
          </div>
        ) : (
          <>
            <span className={styles.logLabel}>Log today's weight</span>
            <div className={styles.inputRow}>
              <input
                type="text"
                inputMode="decimal"
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
                placeholder={weightUnit}
                className={styles.input}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
              />
              <button
                onClick={handleSave}
                disabled={!weightInput.trim() || isSaving}
                className={styles.saveBtn}
              >
                {isSaving ? (
                  <Loader2 size={20} className={styles.spinner} />
                ) : (
                  <Check size={20} />
                )}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Chart */}
      {!isLoading && chartData.length >= 2 && (
        <div className={styles.chartSection}>
          <div className={styles.chartHeader}>
            <h2 className={styles.sectionTitle}>Progress</h2>
            <select
              value={viewPeriod}
              onChange={(e) => setViewPeriod(e.target.value as ViewPeriod)}
              className={styles.periodSelect}
            >
              <option value="daily" disabled={availableViews.daily < 2}>
                Daily{availableViews.daily < 2 ? " (need more data)" : ""}
              </option>
              <option value="weekly" disabled={availableViews.weekly < 2}>
                Weekly{availableViews.weekly < 2 ? " (need more data)" : ""}
              </option>
              <option value="monthly" disabled={availableViews.monthly < 2}>
                Monthly{availableViews.monthly < 2 ? " (need more data)" : ""}
              </option>
            </select>
          </div>
          <div className={styles.chartCard}>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart
                data={chartData}
                margin={{ top: 10, right: 50, left: -10, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f0f0f0"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  axisLine={{ stroke: "#e5e5e5" }}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "#a1a1a1" }}
                  interval="preserveStartEnd"
                  dy={5}
                />
                <YAxis
                  domain={["dataMin - 0.5", "dataMax + 0.5"]}
                  axisLine={{ stroke: "#e5e5e5" }}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "#a1a1a1" }}
                  tickFormatter={(v) => `${v.toFixed(1)}`}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    background: "#0f0f0f",
                    border: "none",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    fontSize: "12px",
                  }}
                  labelStyle={{ color: "#a1a1a1", marginBottom: "4px" }}
                  itemStyle={{ color: "#fff" }}
                  formatter={(value) => [
                    `${Number(value).toFixed(1)} ${weightUnit}`,
                    "Weight",
                  ]}
                />
                <ReferenceLine
                  y={avgWeight}
                  stroke="#a1a1a1"
                  strokeDasharray="4 4"
                  label={{
                    value: `Avg: ${avgWeight.toFixed(1)}`,
                    position: "right",
                    fill: "#a1a1a1",
                    fontSize: 10,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{
                    fill: "#fff",
                    stroke: "#3b82f6",
                    strokeWidth: 2,
                    r: 4,
                  }}
                  activeDot={{
                    fill: "#3b82f6",
                    stroke: "#fff",
                    strokeWidth: 2,
                    r: 6,
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* History */}
      <div className={styles.historySection}>
        <h2 className={styles.sectionTitle}>History</h2>

        {isLoading ? (
          <div className={styles.loadingState}>
            <Loader2 size={20} className={styles.spinner} />
            <span>Loading...</span>
          </div>
        ) : entries.length === 0 ? (
          <p className={styles.emptyState}>No entries yet</p>
        ) : (
          <div className={styles.historyList}>
            {entries.map((entry, idx) => (
              <div key={`${entry.date}-${idx}`} className={styles.historyItem}>
                <span className={styles.historyDate}>
                  {formatDisplayDate(entry.date)}
                </span>
                <span className={styles.historyWeight}>
                  {entry.weight} {weightUnit}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Weight;
