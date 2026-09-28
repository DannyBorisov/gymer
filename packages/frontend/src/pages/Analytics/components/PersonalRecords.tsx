import { Trophy, Star } from "lucide-react";
import type { ExerciseRecords } from "../../../api/analytics";
import { useSettings } from "../../../contexts/SettingsContext";
import styles from "./PersonalRecords.module.css";

interface PersonalRecordsProps {
  records: ExerciseRecords[];
  selectedExercise?: string;
}

export function PersonalRecords({ records, selectedExercise }: PersonalRecordsProps) {
  const { weightUnit } = useSettings();

  // Filter to selected exercise or show exercises with recent PRs
  const displayRecords = selectedExercise
    ? records.filter((r) => r.exercise === selectedExercise)
    : records.filter((r) => r.recentPRs.length > 0).slice(0, 5);

  if (displayRecords.length === 0) {
    return (
      <div className={styles.container}>
        <h3 className={styles.sectionTitle}>
          <Trophy size={16} />
          Personal Records
        </h3>
        <div className={styles.empty}>
          {selectedExercise
            ? "No records for this exercise yet"
            : "Complete more workouts to see PRs"}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h3 className={styles.sectionTitle}>
        <Trophy size={16} />
        {selectedExercise ? "Records" : "Recent PRs"}
      </h3>

      {displayRecords.map((record) => (
        <div key={record.exercise} className={styles.exerciseRecord}>
          {!selectedExercise && (
            <span className={styles.exerciseName}>{record.exercise}</span>
          )}

          <div className={styles.prList}>
            {/* E1RM */}
            <div className={styles.prItem}>
              <span className={styles.prLabel}>Best e1RM</span>
              <span className={styles.prValue}>
                {record.records.e1rm.value.toFixed(1)} {weightUnit}
              </span>
              <span className={styles.prMeta}>
                {record.records.e1rm.weight} {weightUnit} × {record.records.e1rm.reps}
              </span>
            </div>

            {/* Max Weight */}
            <div className={styles.prItem}>
              <span className={styles.prLabel}>Max Weight</span>
              <span className={styles.prValue}>
                {record.records.maxWeight.value} {weightUnit}
              </span>
              <span className={styles.prMeta}>
                × {record.records.maxWeight.reps} reps
              </span>
            </div>

            {/* Rep PRs */}
            {Object.entries(record.records.repPRs)
              .sort(([a], [b]) => Number(a) - Number(b))
              .slice(0, 3)
              .map(([reps, pr]) => (
                <div key={reps} className={styles.prItem}>
                  <span className={styles.prLabel}>{reps}-rep PR</span>
                  <span className={styles.prValue}>
                    {pr.weight} {weightUnit}
                  </span>
                </div>
              ))}
          </div>

          {/* Recent PRs badges */}
          {record.recentPRs.length > 0 && (
            <div className={styles.recentBadges}>
              {record.recentPRs.map((pr, i) => (
                <span key={i} className={styles.recentBadge}>
                  <Star size={10} />
                  {pr.description}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
