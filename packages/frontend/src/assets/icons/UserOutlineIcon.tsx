import type { SVGProps } from "react";

const UserOutlineIcon = ({ size = 20, ...props }: SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <circle cx="12" cy="6.5" r="4" stroke="currentColor"/>
    <ellipse cx="12" cy="17.5" rx="7" ry="4" stroke="currentColor"/>
  </svg>
);

export default UserOutlineIcon;
