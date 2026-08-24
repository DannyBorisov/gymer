import { useRef, useEffect, useState, useMemo } from "react";
import { Plus, Minus } from "lucide-react";
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
  hint?: string | number;
  hintLabel?: string;
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
  hint,
  hintLabel = "last",
}: ScrollableInputProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const isScrolling = useRef(false);
  const shouldAnimate = useRef(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const numericValue = parseFloat(value) || 0;

  // Generate fixed list of values based on step (reversed - higher values at top)
  const values = useMemo(() => {
    const result: number[] = [];
    // Limit the range to reasonable values
    const effectiveMax = Math.min(max, step < 1 ? 500 : 200);
    for (let v = effectiveMax; v >= min; v -= step) {
      result.push(Math.round(v * 1000) / 1000); // Avoid floating point issues
    }
    return result;
  }, [min, max, step]);

  // Find index of current value
  const currentIndex = useMemo(() => {
    const idx = values.findIndex(v => Math.abs(v - numericValue) < step / 2);
    return idx >= 0 ? idx : 0;
  }, [values, numericValue, step]);

  // Format value for display
  const formatValue = (val: number) => {
    if (step % 1 === 0) {
      return val.toString();
    }
    return val.toFixed(2).replace(/\.?0+$/, "");
  };

  // Scroll to current value
  useEffect(() => {
    if (scrollRef.current && !isScrolling.current && !isEditing) {
      const itemHeight = 40;
      const targetScroll = currentIndex * itemHeight;

      if (shouldAnimate.current) {
        scrollRef.current.scrollTo({
          top: targetScroll,
          behavior: 'smooth'
        });
        shouldAnimate.current = false;
      } else {
        scrollRef.current.scrollTop = targetScroll;
      }
    }
  }, [currentIndex, isEditing]);

  // Handle scroll end
  const handleScroll = () => {
    if (!scrollRef.current || isEditing) return;

    isScrolling.current = true;

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      if (!scrollRef.current) return;

      const itemHeight = 40;
      const scrollTop = scrollRef.current.scrollTop;
      const selectedIndex = Math.round(scrollTop / itemHeight);
      const clampedIndex = Math.max(0, Math.min(values.length - 1, selectedIndex));
      const selectedValue = values[clampedIndex];

      if (selectedValue !== undefined && Math.abs(selectedValue - numericValue) >= step / 2) {
        onChange(formatValue(selectedValue));
        onInputActivity?.();
      }

      // Snap to position
      scrollRef.current.scrollTop = clampedIndex * itemHeight;
      isScrolling.current = false;
    }, 80);
  };

  // Handle tap to enter value
  const handleTap = () => {
    setEditValue(value || "");
    setIsEditing(true);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 50);
  };

  // Handle input submit
  const handleSubmit = () => {
    const parsed = parseFloat(editValue);
    if (!isNaN(parsed) && parsed >= min && parsed <= max) {
      onChange(formatValue(parsed));
      onInputActivity?.();
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  const handleIncrement = () => {
    shouldAnimate.current = true;
    onAdjust(step);
    onInputActivity?.();
  };

  const handleDecrement = () => {
    shouldAnimate.current = true;
    onAdjust(-step);
    onInputActivity?.();
  };

  const handleHintClick = () => {
    if (hint !== undefined) {
      onChange(String(hint));
      onInputActivity?.();
    }
  };

  return (
    <div className={styles.inputGroup}>
      <span className={styles.label}>{label}</span>
      <div className={styles.pickerContainer}>
        <button
          type="button"
          onClick={handleIncrement}
          className={styles.stepperBtn}
          aria-label={`Increase ${label}`}
        >
          <Plus size={18} />
        </button>

        <div className={styles.pickerWrapper}>
          {isEditing ? (
            <div className={styles.editMode}>
              <input
                ref={inputRef}
                type="text"
                inputMode={inputMode}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleSubmit}
                onKeyDown={handleKeyDown}
                className={styles.editInput}
                placeholder={placeholder}
              />
            </div>
          ) : (
            <div
              ref={scrollRef}
              className={styles.pickerScroll}
              onScroll={handleScroll}
            >
              <div className={styles.pickerSpacer} />
              {values.map((val, idx) => (
                <div
                  key={val}
                  className={`${styles.pickerItem} ${idx === currentIndex ? styles.pickerItemSelected : ""}`}
                  onClick={idx === currentIndex ? handleTap : undefined}
                >
                  {formatValue(val)}
                </div>
              ))}
              <div className={styles.pickerSpacer} />
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleDecrement}
          className={styles.stepperBtn}
          aria-label={`Decrease ${label}`}
        >
          <Minus size={18} />
        </button>
      </div>
      {hint !== undefined && (
        <button type="button" className={styles.hint} onClick={handleHintClick}>
          {hintLabel}: {hint}
        </button>
      )}
    </div>
  );
}
