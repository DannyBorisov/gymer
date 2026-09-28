import { useMemo } from "react";
import Body from "react-muscle-highlighter";
import type { MuscleRecoveryEntry } from "../../../api/analytics";
import type { Gender } from "../../../api/onboarding";
import styles from "./MuscleRecovery.module.css";

interface MuscleRecoveryProps {
  recovery: MuscleRecoveryEntry[];
  gender: Gender;
}

// Map our muscle groups to react-muscle-highlighter slugs
const MUSCLE_TO_SLUG: Record<string, string[]> = {
  ABS: ["abs", "obliques"],
  BICEPS: ["biceps"],
  TRICEPS: ["triceps"],
  CHEST: ["chest"],
  SHOULDERS: ["deltoids"],
  BACK: ["upper-back", "lower-back", "trapezius"],
  LEGS: ["quadriceps", "hamstring", "gluteal", "calves", "adductors"],
};

const MUSCLE_LABELS: Record<string, string> = {
  ABS: "Abs",
  BICEPS: "Biceps",
  TRICEPS: "Triceps",
  CHEST: "Chest",
  SHOULDERS: "Shoulders",
  BACK: "Back",
  LEGS: "Legs",
};

// Get color based on recovery level (green = recovered, red = fatigued)
function getRecoveryColor(fatiguePercent: number): string {
  const recoveryPercent = 100 - fatiguePercent;
  if (recoveryPercent >= 80) return "#22c55e"; // green - fully recovered
  if (recoveryPercent >= 60) return "#84cc16"; // lime - mostly recovered
  if (recoveryPercent >= 40) return "#eab308"; // yellow - partially recovered
  if (recoveryPercent >= 20) return "#f97316"; // orange - still fatigued
  return "#ef4444"; // red - heavily fatigued
}

function getRecoveryLabel(fatiguePercent: number): string {
  const recoveryPercent = 100 - fatiguePercent;
  if (recoveryPercent >= 80) return "Fully recovered";
  if (recoveryPercent >= 60) return "Mostly recovered";
  if (recoveryPercent >= 40) return "Partially recovered";
  if (recoveryPercent >= 20) return "Still fatigued";
  return "Needs rest";
}

function formatLastTrained(isoDate: string | null): string {
  if (!isoDate) return "Not trained recently";

  const date = new Date(isoDate);
  const now = new Date();
  const hoursAgo = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

  if (hoursAgo < 1) return "Trained just now";
  if (hoursAgo < 24) return `Trained ${hoursAgo}h ago`;

  const daysAgo = Math.floor(hoursAgo / 24);
  if (daysAgo === 1) return "Trained yesterday";
  return `Trained ${daysAgo} days ago`;
}

export function MuscleRecovery({ recovery, gender }: MuscleRecoveryProps) {
  // Build body data for the muscle highlighter
  const bodyData = useMemo(() => {
    const data: Array<{ slug: string; color: string }> = [];

    for (const entry of recovery) {
      const slugs = MUSCLE_TO_SLUG[entry.muscleGroup];
      if (!slugs) continue;

      const color = getRecoveryColor(entry.fatiguePercent);
      for (const slug of slugs) {
        data.push({ slug, color });
      }
    }

    return data;
  }, [recovery]);

  const bodyGender = gender === "FEMALE" ? "female" : "male";

  // Sort by fatigue (most fatigued first)
  const sortedRecovery = [...recovery].sort(
    (a, b) => b.fatiguePercent - a.fatiguePercent
  );

  return (
    <div className={styles.container}>
      {/* Body Visualization */}
      <div className={styles.bodyContainer}>
        <div className={styles.bodyView}>
          <span className={styles.viewLabel}>Front</span>
          <Body
            data={bodyData}
            side="front"
            gender={bodyGender}
            scale={0.7}
            border="#3f3f3f"
            defaultFill="#2a2a2a"
          />
        </div>
        <div className={styles.bodyView}>
          <span className={styles.viewLabel}>Back</span>
          <Body
            data={bodyData}
            side="back"
            gender={bodyGender}
            scale={0.7}
            border="#3f3f3f"
            defaultFill="#2a2a2a"
          />
        </div>
      </div>

      {/* Legend */}
      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: "#22c55e" }} />
          <span>Recovered</span>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: "#eab308" }} />
          <span>Recovering</span>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: "#ef4444" }} />
          <span>Fatigued</span>
        </div>
      </div>

      {/* Recovery Bars */}
      <div className={styles.recoveryList}>
        {sortedRecovery.map((entry) => {
          const label = MUSCLE_LABELS[entry.muscleGroup] || entry.muscleGroup;
          const recoveryPercent = 100 - entry.fatiguePercent;
          const color = getRecoveryColor(entry.fatiguePercent);
          const statusLabel = getRecoveryLabel(entry.fatiguePercent);
          const lastTrainedLabel = formatLastTrained(entry.lastTrained);

          return (
            <div key={entry.muscleGroup} className={styles.recoveryItem}>
              <div className={styles.recoveryHeader}>
                <span className={styles.muscleName}>{label}</span>
                <span className={styles.recoveryPercent} style={{ color }}>
                  {recoveryPercent}%
                </span>
              </div>
              <div className={styles.barContainer}>
                <div
                  className={styles.bar}
                  style={{
                    width: `${recoveryPercent}%`,
                    background: color,
                  }}
                />
              </div>
              <div className={styles.recoveryMeta}>
                <span className={styles.status} style={{ color }}>
                  {statusLabel}
                </span>
                <span className={styles.lastTrained}>
                  {entry.sets > 0
                    ? `${lastTrainedLabel} · ${entry.sets} sets`
                    : lastTrainedLabel}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
