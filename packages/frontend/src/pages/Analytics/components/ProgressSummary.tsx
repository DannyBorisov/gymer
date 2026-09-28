import { TrendingUp, TrendingDown, Minus, Dumbbell, Calendar } from "lucide-react";
import type { AnalyticsSummary } from "../../../api/analytics";
import styles from "./ProgressSummary.module.css";

interface ProgressSummaryProps {
  summary: AnalyticsSummary;
}

export function ProgressSummary({ summary }: ProgressSummaryProps) {
  const { strengthChange, volumeChange, consistency } = summary;

  const getDirectionIcon = (direction: "up" | "down" | "stable") => {
    switch (direction) {
      case "up":
        return <TrendingUp size={16} />;
      case "down":
        return <TrendingDown size={16} />;
      default:
        return <Minus size={16} />;
    }
  };

  const getDirectionClass = (direction: "up" | "down" | "stable") => {
    switch (direction) {
      case "up":
        return styles.positive;
      case "down":
        return styles.negative;
      default:
        return styles.neutral;
    }
  };

  const formatPercent = (value: number, direction: "up" | "down" | "stable") => {
    const sign = direction === "up" ? "+" : direction === "down" ? "" : "";
    return `${sign}${value.toFixed(1)}%`;
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.iconWrap}>
          <TrendingUp size={18} />
        </div>
        <div className={styles.content}>
          <span
            className={`${styles.value} ${getDirectionClass(strengthChange.direction)}`}
          >
            {formatPercent(strengthChange.percentChange, strengthChange.direction)}
            {getDirectionIcon(strengthChange.direction)}
          </span>
          <span className={styles.label}>Strength</span>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.iconWrap}>
          <Dumbbell size={18} />
        </div>
        <div className={styles.content}>
          <span
            className={`${styles.value} ${getDirectionClass(volumeChange.direction)}`}
          >
            {formatPercent(volumeChange.percentChange, volumeChange.direction)}
            {getDirectionIcon(volumeChange.direction)}
          </span>
          <span className={styles.label}>Volume</span>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.iconWrap}>
          <Calendar size={18} />
        </div>
        <div className={styles.content}>
          <span className={styles.value}>{consistency.workoutsThisMonth}</span>
          <span className={styles.label}>This month</span>
        </div>
      </div>
    </div>
  );
}
