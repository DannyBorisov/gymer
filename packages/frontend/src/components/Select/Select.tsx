import { forwardRef, type ReactNode, type SelectHTMLAttributes } from "react";
import { ChevronDownIcon } from "../../assets/icons";
import { InfoTooltip } from "../InfoTooltip/InfoTooltip";
import styles from "./Select.module.css";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  /** Explanation shown in a popup next to the label, e.g. for a jargon term. */
  labelInfo?: string;
  /** Icon rendered inside the field, before the selected value. */
  icon?: ReactNode;
  options: SelectOption[];
}

/**
 * A labeled select styled as a rounded card, matching the app's form design
 * system. Renders a real <select> (native picker on mobile, full keyboard
 * support) with the icon and chevron laid over it.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, labelInfo, icon, options, id, className, ...selectProps }, ref) => {
    const selectId = id ?? `select-${label.replace(/\s+/g, "-").toLowerCase()}`;

    return (
      <div className={styles.field}>
        <label htmlFor={selectId} className={styles.label}>
          {label}
          {labelInfo && <InfoTooltip text={labelInfo} label={`What is ${label}?`} />}
        </label>
        <div className={styles.selectWrapper}>
          {icon && <span className={styles.icon}>{icon}</span>}
          <select
            ref={ref}
            id={selectId}
            className={`${styles.select} ${icon ? styles.selectWithIcon : ""} ${className ?? ""}`}
            {...selectProps}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDownIcon size={18} className={styles.chevron} />
        </div>
      </div>
    );
  },
);

Select.displayName = "Select";
