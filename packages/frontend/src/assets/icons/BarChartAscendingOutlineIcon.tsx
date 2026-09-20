import type { SVGProps } from "react";

const BarChartAscendingOutlineIcon = ({ size = 20, ...props }: SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M 3 21 H 21" stroke="currentColor" stroke-linecap="round"/>
    <rect x="5" y="14" width="4" height="7" rx="1" stroke="currentColor"/>
    <rect x="10" y="9" width="4" height="12" rx="1" stroke="currentColor"/>
    <rect x="15" y="4" width="4" height="17" rx="1" stroke="currentColor"/>
  </svg>
);

export default BarChartAscendingOutlineIcon;
