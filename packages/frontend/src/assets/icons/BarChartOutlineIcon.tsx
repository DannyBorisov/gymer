import type { SVGProps } from "react";

const BarChartOutlineIcon = ({ size = 20, ...props }: SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M 22 22 H 2" stroke="currentColor" stroke-linecap="round"/>
    <path d="M 21 22 V 14.5 C 21 13.672 20.328 13 19.5 13 H 16.5 C 15.672 13 15 13.672 15 14.5 V 22" stroke="currentColor"/>
    <path d="M 15 22 V 5 C 15 3.586 15 2.879 14.561 2.439 C 14.121 2 13.414 2 12 2 C 10.586 2 9.879 2 9.439 2.439 C 9 2.879 9 3.586 9 5 V 22" stroke="currentColor"/>
    <path d="M 9 22 V 9.5 C 9 8.672 8.328 8 7.5 8 H 4.5 C 3.672 8 3 8.672 3 9.5 V 22" stroke="currentColor"/>
  </svg>
);

export default BarChartOutlineIcon;
