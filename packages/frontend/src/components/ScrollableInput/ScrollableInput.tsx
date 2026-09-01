import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { Plus, Minus } from "lucide-react";
import { hapticSelection, hapticMedium } from "../../utils/haptics";
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
  target?: string | number;
  dark?: boolean;
}

const ITEM_HEIGHT = 40;
const VELOCITY_THRESHOLD = 0.5; // Min velocity to trigger momentum
const FRICTION = 0.92; // Momentum decay factor
const SNAP_DURATION = 200; // ms for snap animation
const BUTTON_SCROLL_DURATION = 80; // ms for fast button scroll

export function ScrollableInput({
  label,
  value,
  onChange,
  step,
  placeholder = "0",
  inputMode = "numeric",
  min = 0,
  max = 9999,
  onInputActivity,
  hint,
  hintLabel = "last",
  target,
  dark = false,
}: ScrollableInputProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Scroll state refs
  const isScrolling = useRef(false);
  const isButtonScroll = useRef(false);
  const lastScrollTop = useRef(0);
  const lastScrollTime = useRef(0);
  const velocity = useRef(0);
  const momentumRaf = useRef<number>();
  const snapTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const lastHapticIndex = useRef(-1);

  const numericValue = parseFloat(value);
  const isEmpty = value === "" || value === "-";

  // Generate fixed list of values (reversed - higher values at top)
  const values = useMemo(() => {
    const result: (number | "-")[] = [];
    const effectiveMax = Math.min(max, step < 1 ? 500 : 200);
    for (let v = effectiveMax; v > 0; v -= step) {
      result.push(Math.round(v * 1000) / 1000);
    }
    result.push(0);
    result.push("-");
    return result;
  }, [max, step]);

  // Find index of current value
  const currentIndex = useMemo(() => {
    if (isEmpty) {
      return values.findIndex((v) => v === "-");
    }
    if (numericValue === 0) {
      return values.findIndex((v) => v === 0);
    }
    const idx = values.findIndex(
      (v) => typeof v === "number" && Math.abs(v - numericValue) < step / 2,
    );
    return idx >= 0 ? idx : 0;
  }, [values, numericValue, isEmpty, step]);

  // Format value for display
  const formatValue = useCallback(
    (val: number | "-") => {
      if (val === "-") return "-";
      if (step % 1 === 0) {
        return val.toString();
      }
      return val.toFixed(2).replace(/\.?0+$/, "");
    },
    [step],
  );

  // Get current scroll index
  const getScrollIndex = useCallback(() => {
    if (!scrollRef.current) return 0;
    return Math.round(scrollRef.current.scrollTop / ITEM_HEIGHT);
  }, []);

  // Smooth scroll to index with animation
  const smoothScrollToIndex = useCallback(
    (
      targetIndex: number,
      duration = SNAP_DURATION,
      onComplete?: () => void,
    ) => {
      if (!scrollRef.current) {
        onComplete?.();
        return;
      }

      const startScroll = scrollRef.current.scrollTop;
      const targetScroll = targetIndex * ITEM_HEIGHT;
      const distance = targetScroll - startScroll;

      if (Math.abs(distance) < 1) {
        onComplete?.();
        return;
      }

      const startTime = performance.now();

      const animate = (currentTime: number) => {
        if (!scrollRef.current) {
          onComplete?.();
          return;
        }

        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Ease out cubic for smooth deceleration
        const easeOut = 1 - Math.pow(1 - progress, 3);

        scrollRef.current.scrollTop = startScroll + distance * easeOut;

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          scrollRef.current.scrollTop = targetScroll;
          isScrolling.current = false;
          onComplete?.();
        }
      };

      requestAnimationFrame(animate);
    },
    [],
  );

  // Apply momentum and snap
  const applyMomentum = useCallback(() => {
    if (!scrollRef.current) return;

    const currentVelocity = velocity.current;

    // If velocity is low enough, snap to nearest
    if (Math.abs(currentVelocity) < VELOCITY_THRESHOLD) {
      const snapIndex = getScrollIndex();
      const clampedIndex = Math.max(0, Math.min(values.length - 1, snapIndex));

      // Always update value when snap completes
      const selectedValue = values[clampedIndex];
      if (selectedValue !== undefined) {
        if (selectedValue === "-") {
          if (!isEmpty) {
            onChange("");
            onInputActivity?.();
          }
        } else if (
          isEmpty ||
          isNaN(numericValue) ||
          Math.abs(selectedValue - numericValue) >= step / 2
        ) {
          onChange(formatValue(selectedValue));
          onInputActivity?.();
        }
      }

      // Haptic on final snap
      if (clampedIndex !== lastHapticIndex.current) {
        hapticMedium();
      }
      lastHapticIndex.current = clampedIndex;

      smoothScrollToIndex(clampedIndex);
      return;
    }

    // Apply friction
    velocity.current *= FRICTION;

    // Move scroll position
    scrollRef.current.scrollTop += currentVelocity;

    // Check for haptic feedback on value change
    const newIndex = getScrollIndex();
    if (
      newIndex !== lastHapticIndex.current &&
      newIndex >= 0 &&
      newIndex < values.length
    ) {
      hapticSelection();
      lastHapticIndex.current = newIndex;
    }

    // Continue momentum
    momentumRaf.current = requestAnimationFrame(applyMomentum);
  }, [
    values,
    isEmpty,
    numericValue,
    step,
    onChange,
    onInputActivity,
    formatValue,
    getScrollIndex,
    smoothScrollToIndex,
  ]);

  // Handle scroll event
  const handleScroll = useCallback(() => {
    if (!scrollRef.current || isEditing) return;

    const now = performance.now();
    const currentScroll = scrollRef.current.scrollTop;
    const timeDelta = now - lastScrollTime.current;

    // Calculate velocity (pixels per frame, roughly)
    if (timeDelta > 0 && timeDelta < 100) {
      const scrollDelta = currentScroll - lastScrollTop.current;
      velocity.current = scrollDelta * (16 / timeDelta); // Normalize to ~60fps
    }

    lastScrollTop.current = currentScroll;
    lastScrollTime.current = now;
    isScrolling.current = true;

    // Haptic feedback when crossing value boundaries
    const currentIdx = getScrollIndex();
    if (
      currentIdx !== lastHapticIndex.current &&
      currentIdx >= 0 &&
      currentIdx < values.length
    ) {
      hapticSelection();
      lastHapticIndex.current = currentIdx;
    }

    // Clear any pending snap/momentum
    if (snapTimeoutRef.current) {
      clearTimeout(snapTimeoutRef.current);
    }
    if (momentumRaf.current) {
      cancelAnimationFrame(momentumRaf.current);
    }

    // Start momentum after scroll ends
    snapTimeoutRef.current = setTimeout(() => {
      applyMomentum();
    }, 50);
  }, [isEditing, values.length, getScrollIndex, applyMomentum]);

  // Scroll to current value on mount and value change
  useEffect(() => {
    console.log(label, value);
    // Skip if button is handling the scroll animation
    if (isButtonScroll.current) return;
    if (isEditing) return;

    const targetScroll = currentIndex * ITEM_HEIGHT;
    let rafId: number;
    let cancelled = false;

    // The picker can mount while hidden (e.g. inside a collapsed drawer),
    // in which case it has zero layout size and setting scrollTop is a
    // no-op. Poll each frame until it actually has size before committing
    // the scroll position, so it doesn't get stuck showing the default
    // (top) item once revealed. ResizeObserver isn't reliable here since
    // some WebKit versions don't report a resize on display:none -> visible.
    const trySetScroll = () => {
      if (cancelled) return;
      const el = scrollRef.current;
      if (!el) return;
      if (el.scrollHeight <= el.clientHeight) {
        rafId = requestAnimationFrame(trySetScroll);
        return;
      }
      el.scrollTop = targetScroll;
      lastHapticIndex.current = currentIndex;
      setIsReady(true);
    };

    trySetScroll();

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [currentIndex, isEditing]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (snapTimeoutRef.current) clearTimeout(snapTimeoutRef.current);
      if (momentumRaf.current) cancelAnimationFrame(momentumRaf.current);
    };
  }, []);

  // Handle tap to enter value
  const handleTap = () => {
    setEditValue(value || "");
    setIsEditing(true);
    hapticMedium();
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
      hapticMedium();
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  const handleIncrement = () => {
    if (isAnimating) return;

    hapticMedium();
    // Stop any ongoing animations
    if (momentumRaf.current) cancelAnimationFrame(momentumRaf.current);
    if (snapTimeoutRef.current) clearTimeout(snapTimeoutRef.current);

    // Calculate new value
    const currentVal = parseFloat(value) || 0;
    const newVal = Math.min(max, Math.round((currentVal + step) * 1000) / 1000);

    // Find and scroll to new index
    const newIndex = values.findIndex(
      (v) => typeof v === "number" && Math.abs(v - newVal) < step / 2,
    );
    if (newIndex >= 0 && scrollRef.current) {
      isButtonScroll.current = true;
      setIsAnimating(true);
      smoothScrollToIndex(newIndex, BUTTON_SCROLL_DURATION, () => {
        isButtonScroll.current = false;
        setIsAnimating(false);
      });
      lastHapticIndex.current = newIndex;
    }

    // Update value
    onChange(formatValue(newVal));
    onInputActivity?.();
  };

  const handleDecrement = () => {
    if (isAnimating) return;

    hapticMedium();
    // Stop any ongoing animations
    if (momentumRaf.current) cancelAnimationFrame(momentumRaf.current);
    if (snapTimeoutRef.current) clearTimeout(snapTimeoutRef.current);

    // Calculate new value
    const currentVal = parseFloat(value) || 0;
    const newVal = Math.max(min, Math.round((currentVal - step) * 1000) / 1000);

    // Find and scroll to new index
    const newIndex =
      newVal === 0
        ? values.findIndex((v) => v === 0)
        : values.findIndex(
            (v) => typeof v === "number" && Math.abs(v - newVal) < step / 2,
          );

    if (newIndex >= 0 && scrollRef.current) {
      isButtonScroll.current = true;
      setIsAnimating(true);
      smoothScrollToIndex(newIndex, BUTTON_SCROLL_DURATION, () => {
        isButtonScroll.current = false;
        setIsAnimating(false);
      });
      lastHapticIndex.current = newIndex;
    }

    // Update value
    onChange(formatValue(newVal));
    onInputActivity?.();
  };

  const handleHintClick = () => {
    if (hint !== undefined) {
      hapticMedium();
      onChange(String(hint));
      onInputActivity?.();
    }
  };

  return (
    <div className={`${styles.inputGroup} ${dark ? styles.dark : ""}`}>
      <span className={styles.label}>{label}</span>
      <div className={styles.pickerContainer}>
        <button
          type="button"
          onClick={handleIncrement}
          className={styles.stepperBtn}
          disabled={isAnimating}
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
              style={{ opacity: isReady ? 1 : 0 }}
              onScroll={handleScroll}
              onTouchStart={(e) => {
                e.stopPropagation();
                // Reset velocity tracking
                lastScrollTime.current = performance.now();
                lastScrollTop.current = scrollRef.current?.scrollTop || 0;
                velocity.current = 0;
                if (momentumRaf.current) {
                  cancelAnimationFrame(momentumRaf.current);
                }
              }}
              onTouchMove={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
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
          disabled={isAnimating}
          aria-label={`Decrease ${label}`}
        >
          <Minus size={18} />
        </button>
      </div>
      {target !== undefined && (
        <span className={styles.target}>target: {target}</span>
      )}
      {hint !== undefined && (
        <button type="button" className={styles.hint} onClick={handleHintClick}>
          {hintLabel}: {hint}
        </button>
      )}
    </div>
  );
}
