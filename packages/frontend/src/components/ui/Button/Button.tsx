import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./Button.module.css";

export enum ButtonVariant {
  Primary = "primary",
  Secondary = "secondary",
  Tertiary = "tertiary",
  Ghost = "ghost",
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  icon?: ReactNode;
}

export const Button = ({
  variant = ButtonVariant.Primary,
  className = "",
  icon,
  children,
  ...rest
}: ButtonProps) => {
  const variantClass = {
    [ButtonVariant.Primary]: styles.primary,
    [ButtonVariant.Secondary]: styles.secondary,
    [ButtonVariant.Tertiary]: styles.tertiary,
    [ButtonVariant.Ghost]: styles.ghost,
  }[variant];

  const classes = [styles.button, variantClass, className].join(" ");

  return (
    <button className={classes} {...rest}>
      {icon}
      {children}
    </button>
  );
};
