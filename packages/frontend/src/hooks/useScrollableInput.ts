import { useRef } from "react";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

interface UseScrollableInputOptions {
  value: number;
  onChange: (value: number) => void;
  step: number;
  min?: number;
  max?: number;
}

interface ScrollableInputHandlers {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
  onWheel: (e: React.WheelEvent) => void;
}

/**
 * Hook to make a numeric input scrollable via touch swipe or mouse wheel.
 * Swipe up or scroll up increases value, down decreases.
 */
export function useScrollableInput({
  value,
  onChange,
  step,
  min = 0,
  max = 9999,
}: UseScrollableInputOptions): ScrollableInputHandlers {
  const touchStartY = useRef<number>(0);
  const accumulatedDelta = useRef<number>(0);
  const lastValue = useRef<number>(value);

  // Threshold in pixels to trigger one step change
  const PIXELS_PER_STEP = 20;

  const clamp = (val: number) => Math.max(min, Math.min(max, val));

  const roundToStep = (val: number) => Math.round(val / step) * step;

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    accumulatedDelta.current = 0;
    lastValue.current = value || 0;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStartY.current; // Positive = swiped down = increase

    // Calculate how many steps based on accumulated movement
    const totalSteps = Math.floor(deltaY / PIXELS_PER_STEP);
    const newValue = clamp(roundToStep(lastValue.current + totalSteps * step));

    if (newValue !== value) {
      onChange(newValue);
      Haptics.impact({ style: ImpactStyle.Light });
    }
  };

  const onTouchEnd = () => {
    touchStartY.current = 0;
    accumulatedDelta.current = 0;
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();

    // deltaY is positive when scrolling down, negative when scrolling up
    // We want scroll down = increase, scroll up = decrease
    const direction = e.deltaY > 0 ? 1 : -1;
    const currentValue = value || 0;
    const newValue = clamp(roundToStep(currentValue + direction * step));

    if (newValue !== value) {
      onChange(newValue);
    }
  };

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onWheel,
  };
}
