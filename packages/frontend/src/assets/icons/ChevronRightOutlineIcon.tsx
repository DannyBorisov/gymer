import type { SVGProps } from "react";

const ChevronRightOutlineIcon = ({ size = 20, ...props }: SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M 9 5 L 15 12 L 9 19" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
);

export default ChevronRightOutlineIcon;
