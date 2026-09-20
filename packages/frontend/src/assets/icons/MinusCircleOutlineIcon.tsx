import type { SVGProps } from "react";

const MinusCircleOutlineIcon = ({ size = 20, ...props }: SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <circle cx="12" cy="12" r="10" stroke="currentColor"/>
    <path d="M 15 12 H 9" stroke="currentColor" stroke-linecap="round"/>
  </svg>
);

export default MinusCircleOutlineIcon;
