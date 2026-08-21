import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { apiFetch } from "../../utils/api";

import styles from "./Analytics.module.css";

interface ExerciseProgressionEntry {
  date: string;
  weight: number;
  reps: number;
  sets: number;
}

interface ExerciseProgression {
  exercise: string;
  entries: ExerciseProgressionEntry[];
}

const Analytics = () => {
  const [exercises, setExercises] = useState<ExerciseProgression[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedExercise, setSelectedExercise] =
    useState<ExerciseProgression | null>(null);

  useEffect(() => {
    const fetchProgression = async () => {
      try {
        const response = await apiFetch("/api/analytics/progression");
        const data = await response.json();
        if (response.ok && data.exercises) {
          setExercises(data.exercises);
          if (data.exercises.length > 0) {
            setSelectedExercise(data.exercises[0]);
          }
        }
      } catch (err) {
        console.error("Analytics fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProgression();
  }, []);

  const formatChartData = (entries: ExerciseProgressionEntry[]) => {
    return entries.map((entry) => {
      const [day, month] = entry.date.split("/");
      return {
        date: `${day}/${month}`,
        weight: entry.weight,
        reps: entry.reps,
        sets: entry.sets,
      };
    });
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>Analytics</h1>
        <div className={styles.loadingState}>
          <Loader2 size={24} className={styles.spinner} />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  if (exercises.length === 0) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>Analytics</h1>
        <p className={styles.emptyState}>
          No exercise data yet. Complete some workouts to see your progression.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Analytics</h1>

      {/* Exercise selector */}
      <div className={styles.selectorSection}>
        <label className={styles.selectorLabel}>Select Exercise</label>
        <select
          className={styles.selector}
          value={selectedExercise?.exercise || ""}
          onChange={(e) => {
            const exercise = exercises.find((ex) => ex.exercise === e.target.value);
            setSelectedExercise(exercise || null);
          }}
        >
          {exercises.map((ex) => (
            <option key={ex.exercise} value={ex.exercise}>
              {ex.exercise}
            </option>
          ))}
        </select>
      </div>

      {/* Chart */}
      {selectedExercise && selectedExercise.entries.length >= 2 && (
        <div className={styles.chartSection}>
          <h2 className={styles.sectionTitle}>Weight Progression</h2>
          <div className={styles.chartCard}>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart
                data={formatChartData(selectedExercise.entries)}
                margin={{ top: 10, right: 15, left: -10, bottom: 5 }}
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
                  domain={["dataMin - 2", "dataMax + 2"]}
                  axisLine={{ stroke: "#e5e5e5" }}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "#a1a1a1" }}
                  tickFormatter={(v) => `${v}`}
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
                  formatter={(value, name) => {
                    if (name === "weight") return [`${value} kg`, "Weight"];
                    return [value, name];
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

      {selectedExercise && selectedExercise.entries.length < 2 && (
        <p className={styles.notEnoughData}>
          Need at least 2 data points to show a chart
        </p>
      )}

      {/* Stats */}
      {selectedExercise && selectedExercise.entries.length > 0 && (
        <div className={styles.statsSection}>
          <h2 className={styles.sectionTitle}>Stats</h2>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>
                {selectedExercise.entries[selectedExercise.entries.length - 1].weight} kg
              </span>
              <span className={styles.statLabel}>Latest Weight</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>
                {Math.max(...selectedExercise.entries.map((e) => e.weight))} kg
              </span>
              <span className={styles.statLabel}>Max Weight</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>
                {selectedExercise.entries.length}
              </span>
              <span className={styles.statLabel}>Sessions</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>
                {selectedExercise.entries.reduce((acc, e) => acc + e.sets, 0)}
              </span>
              <span className={styles.statLabel}>Total Sets</span>
            </div>
          </div>
        </div>
      )}

      {/* History */}
      {selectedExercise && selectedExercise.entries.length > 0 && (
        <div className={styles.historySection}>
          <h2 className={styles.sectionTitle}>History</h2>
          <div className={styles.historyList}>
            {[...selectedExercise.entries].reverse().map((entry, idx) => (
              <div key={`${entry.date}-${idx}`} className={styles.historyItem}>
                <span className={styles.historyDate}>{entry.date}</span>
                <span className={styles.historyDetails}>
                  {entry.weight} kg · {entry.sets} sets · {entry.reps} reps
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;
