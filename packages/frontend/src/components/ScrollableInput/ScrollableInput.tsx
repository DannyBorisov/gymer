import { useState, useCallback, useRef } from "react";
import { Plus, Minus } from "lucide-react";
import { useScrollableInput } from "../../hooks/useScrollableInput";
import styles from "./ScrollableInput.module.css";

interface ScrollableInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onAdjust: (delta: number) => void;
  step: number;
  placeholder?: string;
  inputMode?: "decimal" | "numeric";
  min?: number;
  max?: number;
  onInputActivity?: () => void;
}

export function ScrollableInput({
  label,
  value,
  onChange,
  onAdjust,
  step,
  placeholder = "0",
  inputMode = "numeric",
  min = 0,
  max = 9999,
  onInputActivity,
}: ScrollableInputProps) {
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const numericValue = parseFloat(value) || 0;

  const handleScrollChange = useCallback(
    (newValue: number) => {
      // Format the value - show decimals only if step has decimals
      const formatted = step % 1 === 0
        ? newValue.toString()
        : newValue.toFixed(2).replace(/\.?0+$/, "");
      onChange(formatted);
      onInputActivity?.();

      // Show scrolling state
      setIsScrolling(true);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 150);
    },
    [onChange, step, onInputActivity]
  );

  const scrollHandlers = useScrollableInput({
    value: numericValue,
    onChange: handleScrollChange,
    step,
    min,
    max,
  });

  return (
    <div className={styles.inputGroup}>
      <span className={styles.label}>{label}</span>
      <div className={styles.stepperRow}>
        <button
          type="button"
          onClick={() => {
            onAdjust(step);
            onInputActivity?.();
          }}
          className={styles.stepperBtn}
          aria-label={`Increase ${label}`}
        >
          <Plus size={18} />
        </button>
        <div
          className={`${styles.inputWrapper} ${isScrolling ? styles.scrolling : ""}`}
          {...scrollHandlers}
        >
          <input
            type="text"
            inputMode={inputMode}
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              onInputActivity?.();
            }}
            onFocus={() => onInputActivity?.()}
            placeholder={placeholder}
            className={styles.input}
          />
          {/* <div className={styles.scrollHint}>
            <span className={styles.scrollArrow}>↕</span>
          </div> */}
        </div>
        <button
          type="button"
          onClick={() => {
            onAdjust(-step);
            onInputActivity?.();
          }}
          className={styles.stepperBtn}
          aria-label={`Decrease ${label}`}
        >
          <Minus size={18} />
        </button>
      </div>
    </div>
  );
}
