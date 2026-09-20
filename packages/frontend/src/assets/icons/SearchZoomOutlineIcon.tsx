import type { SVGProps } from "react";

const SearchZoomOutlineIcon = ({ size = 20, ...props }: SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <circle cx="11.5" cy="11.5" r="9.5" stroke="currentColor"/>
    <path d="M 20 20 L 22 22" stroke="currentColor" stroke-linecap="round"/>
  </svg>
);

export default SearchZoomOutlineIcon;
