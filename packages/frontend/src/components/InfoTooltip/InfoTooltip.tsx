import { useEffect, useRef, useState } from "react";
import { QuestionCircleIcon } from "../../assets/icons";
import styles from "./InfoTooltip.module.css";

export interface InfoTooltipProps {
  text: string;
  /** Accessible label for the trigger button, e.g. "What is RIR?" */
  label?: string;
}

/**
 * Small "?" icon that shows a short explanatory popup on hover (desktop),
 * and toggles it on tap (touch devices).
 */
export const InfoTooltip = ({ text, label = "More info" }: InfoTooltipProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <span className={styles.wrapper} ref={containerRef}>
      <button
        type="button"
        className={styles.trigger}
        aria-label={label}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <QuestionCircleIcon size={14} />
      </button>
      <span
        className={`${styles.popup} ${isOpen ? styles.popupOpen : ""}`}
        role="tooltip"
      >
        {text}
      </span>
    </span>
  );
};
