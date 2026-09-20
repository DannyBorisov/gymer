import type { SVGProps } from "react";

const TargetOutlineIcon = ({ size = 20, ...props }: SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <circle cx="12" cy="12" r="10" stroke="currentColor"/>
    <circle cx="12" cy="12" r="4" stroke="currentColor"/>
  </svg>
);

export default TargetOutlineIcon;
