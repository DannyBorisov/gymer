import { Timer } from "lucide-react";
import { ClockIcon } from "../../assets/icons";
import { SwipeableDrawer } from "../SwipeableDrawer";
import { parseExerciseName } from "../../types/shared";
import { formatRestTimer } from "../../lib/time";
import styles from "./WorkoutDetailDrawer.module.css";

export interface WorkoutDetailSet {
  weight: string;
  reps: string;
  rir?: string;
  notes?: string;
  restTime?: number;
}

export interface WorkoutDetailExercise {
  name: string;
  variant?: string;
  sets: WorkoutDetailSet[];
}

export interface WorkoutDetailData {
  title: string;
  subtitle?: string; // e.g. "Week 3" or date
  duration?: string;
  exercises: WorkoutDetailExercise[];
}

interface WorkoutDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  data: WorkoutDetailData | null;
  weightUnit: string;
  /** Highlight current exercise/set (for active workout) */
  currentExercise?: string;
  currentSetIndex?: number;
  dark?: boolean;
}

export const WorkoutDetailDrawer = ({
  isOpen,
  onClose,
  data,
  weightUnit,
  currentExercise,
  currentSetIndex,
  dark = false,
}: WorkoutDetailDrawerProps) => {
  if (!data) return null;

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
    const seconds = parseInt(duration, 10);
    if (isNaN(seconds)) return duration;
    return `${Math.floor(seconds / 60)}m`;
  };

  return (
    <SwipeableDrawer
      isOpen={isOpen}
      onClose={onClose}
      maxHeight="85vh"
      dark={dark}
    >
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <h2 className={styles.title}>{data.title}</h2>
          <div className={styles.meta}>
            {data.subtitle && <span>{data.subtitle}</span>}
            {data.duration && (
              <>
                {data.subtitle && <span className={styles.dot}>·</span>}
                <ClockIcon size={14} />
                <span>{formatDuration(data.duration)}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{data.exercises.length}</span>
          <span className={styles.statLabel}>exercises</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>
            {data.exercises.reduce((sum, e) => sum + e.sets.length, 0)}
          </span>
          <span className={styles.statLabel}>sets</span>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.exerciseList}>
          {data.exercises.map((exercise, exIdx) => {
            const { name, variant } = parseExerciseName(
              exercise.variant
                ? `${exercise.name} (${exercise.variant})`
                : exercise.name
            );
            const fullName = exercise.variant
              ? `${exercise.name} (${exercise.variant})`
              : exercise.name;
            const isCurrentExercise = fullName === currentExercise;

            return (
              <div
                key={exIdx}
                className={`${styles.exerciseCard} ${isCurrentExercise ? styles.exerciseCardCurrent : ""}`}
              >
                <h3 className={styles.exerciseName}>
                  {name}
                  {variant && (
                    <span className={styles.exerciseVariant}>{variant}</span>
                  )}
                </h3>
                <div className={styles.setsList}>
                  {exercise.sets.map((set, setIdx) => {
                    const isCurrentSet =
                      isCurrentExercise && setIdx === currentSetIndex;
                    const nextSet = exercise.sets[setIdx + 1];

                    return (
                      <div key={setIdx}>
                        <div
                          className={`${styles.setRow} ${isCurrentSet ? styles.setRowCurrent : ""}`}
                        >
                          <span className={styles.setNumber}>{setIdx + 1}</span>
                          <span className={styles.setData}>
                            {set.weight || "—"}
                            {weightUnit} × {set.reps || "—"}
                            {set.rir && (
                              <span className={styles.setRir}>
                                {" "}
                                @ {set.rir} RIR
                              </span>
                            )}
                            {set.notes && (
                              <span className={styles.setNotes}>
                                {" "}
                                · {set.notes}
                              </span>
                            )}
                          </span>
                        </div>
                        {nextSet?.restTime !== undefined && (
                          <div className={styles.restRow}>
                            <Timer size={12} />
                            <span>{formatRestTimer(nextSet.restTime)}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </SwipeableDrawer>
  );
};
