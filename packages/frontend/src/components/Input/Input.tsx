import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { InfoTooltip } from "../InfoTooltip/InfoTooltip";
import styles from "./Input.module.css";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  /** Explanation shown in a popup next to the label, e.g. for a jargon term. */
  labelInfo?: string;
  /** Icon rendered inside the field, before the value/placeholder. */
  icon?: ReactNode;
  /** Short unit hint rendered inside the field, after the value, e.g. "weeks". */
  suffix?: string;
}

/**
 * A labeled text input styled as a rounded card, matching the app's form
 * design system (see CreateProgram's "Program name" field for the reference
 * look). Renders a real <input> so all native props/behavior still work.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, labelInfo, icon, suffix, id, className, ...inputProps }, ref) => {
    const inputId = id ?? `input-${label.replace(/\s+/g, "-").toLowerCase()}`;

    return (
      <div className={styles.field}>
        <label htmlFor={inputId} className={styles.label}>
          {label}
          {labelInfo && <InfoTooltip text={labelInfo} label={`What is ${label}?`} />}
        </label>
        <div className={styles.inputWrapper}>
          {icon && <span className={styles.icon}>{icon}</span>}
          <input
            ref={ref}
            id={inputId}
            className={`${styles.input} ${icon ? styles.inputWithIcon : ""} ${suffix ? styles.inputWithSuffix : ""} ${className ?? ""}`}
            {...inputProps}
          />
          {suffix && <span className={styles.suffix}>{suffix}</span>}
        </div>
      </div>
    );
  },
);

Input.displayName = "Input";
