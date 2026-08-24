import { useState, useEffect, useMemo } from "react";
import { Loader2, Plus, X } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { apiFetch } from "../../utils/api";
import { ExerciseDrawer } from "../../components/ExerciseDrawer/ExerciseDrawer";

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

const LINE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"];
const MAX_EXERCISES = 4;

const Analytics = () => {
  const [exercises, setExercises] = useState<ExerciseProgression[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedExercises, setSelectedExercises] = useState<string[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    const fetchProgression = async () => {
      try {
        const response = await apiFetch("/api/analytics/progression");
        const data = await response.json();
        if (response.ok && data.exercises) {
          setExercises(data.exercises);
          if (data.exercises.length > 0) {
            setSelectedExercises([data.exercises[0].exercise]);
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

  const availableExercises = useMemo(() =>
    exercises.map(ex => ex.exercise),
    [exercises]
  );

  const selectedData = useMemo(() =>
    exercises.filter(ex => selectedExercises.includes(ex.exercise)),
    [exercises, selectedExercises]
  );

  // Merge all dates and create chart data with all exercises
  const chartData = useMemo(() => {
    if (selectedData.length === 0) return [];

    // Get all unique dates across selected exercises
    const allDates = new Set<string>();
    selectedData.forEach(ex => {
      ex.entries.forEach(entry => allDates.add(entry.date));
    });

    // Sort dates chronologically
    const sortedDates = Array.from(allDates).sort((a, b) => {
      const [dayA, monthA, yearA] = a.split("/").map(Number);
      const [dayB, monthB, yearB] = b.split("/").map(Number);
      const dateA = new Date(yearA || 2024, monthA - 1, dayA);
      const dateB = new Date(yearB || 2024, monthB - 1, dayB);
      return dateA.getTime() - dateB.getTime();
    });

    // Build chart data
    return sortedDates.map(date => {
      const [day, month] = date.split("/");
      const point: Record<string, string | number | null> = { date: `${day}/${month}` };

      selectedData.forEach(ex => {
        const entry = ex.entries.find(e => e.date === date);
        point[ex.exercise] = entry ? entry.weight : null;
      });

      return point;
    });
  }, [selectedData]);

  const handleSelectExercises = (names: string[]) => {
    // Only add exercises that have data and respect max limit
    const validNames = names.filter(n => availableExercises.includes(n));
    const newSelection = [...new Set([...selectedExercises, ...validNames])].slice(0, MAX_EXERCISES);
    setSelectedExercises(newSelection);
  };

  const handleRemoveExercise = (name: string) => {
    setSelectedExercises(prev => prev.filter(e => e !== name));
  };

  const hasEnoughData = chartData.length >= 2;

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
        <label className={styles.selectorLabel}>Compare Exercises (max {MAX_EXERCISES})</label>

        {/* Selected exercise chips */}
        <div className={styles.chipContainer}>
          {selectedExercises.map((name, idx) => (
            <div
              key={name}
              className={styles.chip}
              style={{ borderColor: LINE_COLORS[idx] }}
            >
              <span
                className={styles.chipDot}
                style={{ backgroundColor: LINE_COLORS[idx] }}
              />
              <span className={styles.chipText}>{name}</span>
              <button
                className={styles.chipRemove}
                onClick={() => handleRemoveExercise(name)}
              >
                <X size={14} />
              </button>
            </div>
          ))}

          {selectedExercises.length < MAX_EXERCISES && (
            <button
              className={styles.addChipBtn}
              onClick={() => setIsDrawerOpen(true)}
            >
              <Plus size={16} />
              <span>Add</span>
            </button>
          )}
        </div>
      </div>

      {/* Chart */}
      {selectedExercises.length > 0 && hasEnoughData && (
        <div className={styles.chartSection}>
          <h2 className={styles.sectionTitle}>Weight Progression</h2>
          <div className={styles.chartCard}>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart
                data={chartData}
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
                  formatter={(value) =>
                    value != null ? [`${value} kg`, ""] : ["-", ""]
                  }
                />
                <Legend
                  wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
                  iconType="circle"
                  iconSize={8}
                />
                {selectedExercises.map((name, idx) => (
                  <Line
                    key={name}
                    type="monotone"
                    dataKey={name}
                    name={name}
                    stroke={LINE_COLORS[idx]}
                    strokeWidth={2}
                    dot={{
                      fill: "#fff",
                      stroke: LINE_COLORS[idx],
                      strokeWidth: 2,
                      r: 3,
                    }}
                    activeDot={{
                      fill: LINE_COLORS[idx],
                      stroke: "#fff",
                      strokeWidth: 2,
                      r: 5,
                    }}
                    connectNulls={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {selectedExercises.length > 0 && !hasEnoughData && (
        <p className={styles.notEnoughData}>
          Need at least 2 data points to show a chart
        </p>
      )}

      {selectedExercises.length === 0 && (
        <p className={styles.notEnoughData}>
          Select exercises to compare
        </p>
      )}

      <ExerciseDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSelect={() => {}}
        onSelectMultiple={handleSelectExercises}
        multiSelect={true}
        excludeExercises={selectedExercises}
        includeOnly={availableExercises}
      />
    </div>
  );
};

export default Analytics;
