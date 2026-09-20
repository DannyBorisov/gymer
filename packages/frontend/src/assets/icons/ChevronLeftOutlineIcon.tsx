import type { SVGProps } from "react";

const ChevronLeftOutlineIcon = ({ size = 20, ...props }: SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M 15 5 L 9 12 L 15 19" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
);

export default ChevronLeftOutlineIcon;
