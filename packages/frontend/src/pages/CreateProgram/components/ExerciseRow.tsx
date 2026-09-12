import { useState, type ReactNode } from "react";
import { Trash2, Tag, RotateCcw } from "lucide-react";
import type { Exercise } from "../../../types/program";
import styles from "../CreateProgram.module.css";

export interface ExerciseRowProps {
  exercise: Exercise;
  index: number;
  onUpdate: (field: keyof Exercise, value: string | number | boolean) => void;
  onRemove: () => void;
  onOpenDrawer: () => void;
  showRir: boolean;
  dynamicRir: boolean;
  /** Drag handle slot, rendered before the index. */
  handle?: ReactNode;
}

/**
 * One editable exercise: name (opens the picker), sets / reps / RIR, variation,
 * remove. Presentational only — reordering is layered on by SortableExerciseRow.
 */
export const ExerciseRow = ({
  exercise,
  index,
  onUpdate,
  onRemove,
  onOpenDrawer,
  showRir,
  dynamicRir,
  handle,
}: ExerciseRowProps) => {
  const [showVariant, setShowVariant] = useState(!!exercise.variant);

  return (
    <div className={styles.exerciseRow}>
      <div className={styles.exerciseHeader}>
        {handle}
        <span className={styles.exerciseIndex}>{index + 1}</span>
        <div className={styles.exerciseNameGroup}>
          <input
            type="text"
            value={exercise.name}
            onFocus={onOpenDrawer}
            onChange={(e) => onUpdate("name", e.target.value)}
            className={styles.exerciseNameInput}
            placeholder="Exercise name"
            readOnly
          />
          {exercise.variant && !showVariant && (
            <button
              type="button"
              className={styles.variantBadge}
              onClick={() => setShowVariant(true)}
            >
              {exercise.variant}
            </button>
          )}
          {showVariant && (
            <input
              type="text"
              value={exercise.variant || ""}
              onChange={(e) => onUpdate("variant", e.target.value)}
              onBlur={() => !exercise.variant && setShowVariant(false)}
              className={styles.variantInput}
              placeholder="e.g. Wide Grip"
              autoFocus
            />
          )}
          {!showVariant && !exercise.variant && (
            <button
              type="button"
              className={styles.addVariantBtn}
              onClick={() => setShowVariant(true)}
              title="Add exercise variation"
            >
              <Tag size={12} />
              <span className={styles.variantButtonText}>Variation</span>
            </button>
          )}
        </div>
      </div>
      <div className={styles.exerciseInputs}>
        <div className={styles.inputGroup}>
          <label className={styles.inputLabel}>Sets</label>
          <input
            type="number"
            value={exercise.sets || ""}
            onChange={(e) => onUpdate("sets", Number(e.target.value))}
            className={styles.numberInput}
            placeholder="0"
            min={0}
            inputMode="numeric"
          />
        </div>
        <div className={styles.inputGroup}>
          <label className={styles.inputLabel}>Reps</label>
          <input
            type="number"
            value={exercise.reps || ""}
            onChange={(e) => onUpdate("reps", Number(e.target.value))}
            className={styles.numberInput}
            placeholder="0"
            min={0}
            inputMode="numeric"
          />
        </div>
        {showRir && (
          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>RIR</label>
            <input
              type="number"
              value={exercise.rir || ""}
              onChange={(e) => onUpdate("rir", Number(e.target.value))}
              className={styles.numberInput}
              placeholder="0"
              min={0}
              max={10}
              inputMode="numeric"
            />
          </div>
        )}
        {dynamicRir && (
          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>RIR</label>
            <div className={styles.customRirRow}>
              {exercise.customRir ? (
                <>
                  <input
                    type="number"
                    value={exercise.rir || ""}
                    onChange={(e) => onUpdate("rir", Number(e.target.value))}
                    className={styles.numberInput}
                    aria-label="Custom RIR target"
                    placeholder="0"
                    min={0}
                    max={10}
                    inputMode="numeric"
                  />
                  <button
                    type="button"
                    onClick={() => onUpdate("customRir", false)}
                    className={styles.customRirRevert}
                    aria-label="Use plan RIR"
                    title="Use plan RIR"
                  >
                    <RotateCcw size={13} />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => onUpdate("customRir", true)}
                  className={styles.customRirToggle}
                  aria-pressed={false}
                >
                  Plan
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      <button type="button" onClick={onRemove} className={styles.removeBtn}>
        <Trash2 size={14} />
      </button>
    </div>
  );
};
