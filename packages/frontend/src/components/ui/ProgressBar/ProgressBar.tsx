import styles from "./ProgressBar.module.css";

interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  fillClassName?: string;
}

export const ProgressBar = ({
  value,
  max = 100,
  className = "",
  fillClassName = "",
}: ProgressBarProps) => {
  const percent = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div
      className={[styles.track, className].join(" ")}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <div
        className={[styles.fill, fillClassName].join(" ")}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
};
