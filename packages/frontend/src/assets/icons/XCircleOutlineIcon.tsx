import type { SVGProps } from "react";

const XCircleOutlineIcon = ({ size = 20, ...props }: SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <circle cx="12" cy="12" r="10" stroke="currentColor"/>
    <path d="M 14.5 9.5 L 9.5 14.5 M 9.5 9.5 L 14.5 14.5" stroke="currentColor" stroke-linecap="round"/>
  </svg>
);

export default XCircleOutlineIcon;
