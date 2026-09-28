import { Dumbbell } from "lucide-react";
import type { MuscleGroupVolume as MuscleGroupVolumeData } from "../../../api/analytics";
import styles from "./MuscleGroupVolume.module.css";

interface MuscleGroupVolumeProps {
  volume: MuscleGroupVolumeData;
}

const MUSCLE_GROUP_LABELS: Record<string, string> = {
  CHEST: "Chest",
  BACK: "Back",
  SHOULDERS: "Shoulders",
  BICEPS: "Biceps",
  TRICEPS: "Triceps",
  LEGS: "Legs",
  ABS: "Abs",
  OTHER: "Other",
};

export function MuscleGroupVolume({ volume }: MuscleGroupVolumeProps) {
  const { groups, period } = volume;

  if (groups.length === 0) {
    return (
      <div className={styles.container}>
        <h3 className={styles.sectionTitle}>
          <Dumbbell size={16} />
          Weekly Sets
        </h3>
        <div className={styles.empty}>No data for this period</div>
      </div>
    );
  }

  const maxSets = Math.max(...groups.map((g) => g.sets));

  return (
    <div className={styles.container}>
      <h3 className={styles.sectionTitle}>
        <Dumbbell size={16} />
        {period === "week" ? "Weekly" : "Monthly"} Sets
      </h3>

      <div className={styles.grid}>
        {groups.map((group) => {
          const label = MUSCLE_GROUP_LABELS[group.muscleGroup] || group.muscleGroup;
          const widthPercent = maxSets > 0 ? (group.sets / maxSets) * 100 : 0;

          return (
            <div key={group.muscleGroup} className={styles.row}>
              <span className={styles.label}>{label}</span>
              <div className={styles.barWrap}>
                <div
                  className={styles.bar}
                  style={{ width: `${widthPercent}%` }}
                />
              </div>
              <span className={styles.count}>{group.sets}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
