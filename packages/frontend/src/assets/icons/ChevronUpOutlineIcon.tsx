import type { SVGProps } from "react";

const ChevronUpOutlineIcon = ({ size = 20, ...props }: SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M 19 15 L 12 9 L 5 15" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
);

export default ChevronUpOutlineIcon;
