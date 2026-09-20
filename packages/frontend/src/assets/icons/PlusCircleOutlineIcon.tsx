import type { SVGProps } from "react";

const PlusCircleOutlineIcon = ({ size = 20, ...props }: SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <circle cx="12" cy="12" r="10" stroke="currentColor"/>
    <path d="M 15 12 L 12 12 M 12 12 L 9 12 M 12 12 L 12 9 M 12 12 L 12 15" stroke="currentColor" stroke-linecap="round"/>
  </svg>
);

export default PlusCircleOutlineIcon;
