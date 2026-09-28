import type { ReactNode } from "react";
import styles from "./EmptyState.module.css";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  subtitle: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  hint?: string;
}

export const EmptyState = ({
  icon,
  title,
  subtitle,
  action,
  hint,
}: EmptyStateProps) => {
  return (
    <div className={styles.container}>
      <div className={styles.iconWrap}>{icon}</div>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.subtitle}>{subtitle}</p>
      {action && (
        <button className={styles.action} onClick={action.onClick}>
          {action.label}
        </button>
      )}
      {hint && <p className={styles.hint}>{hint}</p>}
    </div>
  );
};

export default EmptyState;
