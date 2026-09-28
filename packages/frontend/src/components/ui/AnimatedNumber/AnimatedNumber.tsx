import { useEffect, useRef, useState } from "react";
import styles from "./AnimatedNumber.module.css";

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  suffix?: string;
  className?: string;
}

export const AnimatedNumber = ({
  value,
  duration = 600,
  suffix = "",
  className = "",
}: AnimatedNumberProps) => {
  const [displayValue, setDisplayValue] = useState(0);
  const previousValue = useRef(0);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const startValue = previousValue.current;
    const endValue = value;
    const startTime = performance.now();

    // Easing function: cubic-bezier(0.16, 1, 0.3, 1) approximation
    const easeOut = (t: number): number => {
      return 1 - Math.pow(1 - t, 3);
    };

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOut(progress);

      const currentValue = Math.round(
        startValue + (endValue - startValue) * easedProgress
      );
      setDisplayValue(currentValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        previousValue.current = endValue;
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, duration]);

  return (
    <span className={`${styles.animatedNumber} ${className}`}>
      {displayValue}
      {suffix}
    </span>
  );
};

export default AnimatedNumber;
