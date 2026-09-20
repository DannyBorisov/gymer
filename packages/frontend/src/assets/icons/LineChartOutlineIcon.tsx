import type { SVGProps } from "react";

const LineChartOutlineIcon = ({ size = 20, ...props }: SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M 3 3 V 19 C 3 20.105 3.895 21 5 21 H 21" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M 6 15 L 10.5 10.5 L 14 13 L 20 6" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M 15 6 H 20 V 11" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="6" cy="15" r="1" fill="currentColor" stroke="none"/>
    <circle cx="10.5" cy="10.5" r="1" fill="currentColor" stroke="none"/>
    <circle cx="14" cy="13" r="1" fill="currentColor" stroke="none"/>
  </svg>
);

export default LineChartOutlineIcon;
