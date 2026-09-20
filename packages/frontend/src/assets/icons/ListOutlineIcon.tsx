import type { SVGProps } from "react";

const ListOutlineIcon = ({ size = 20, ...props }: SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M 20 7 H 4" stroke="currentColor" stroke-linecap="round"/>
    <path d="M 20 12 H 4" stroke="currentColor" stroke-linecap="round"/>
    <path d="M 20 17 H 4" stroke="currentColor" stroke-linecap="round"/>
  </svg>
);

export default ListOutlineIcon;
