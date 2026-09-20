import type { SVGProps } from "react";

const PlayOutlineIcon = ({ size = 20, ...props }: SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M 19.644 9.353 C 21.765 10.506 21.765 13.494 19.644 14.647 L 6.832 21.615 C 4.769 22.736 2.235 21.276 2.235 18.967 L 2.235 5.033 C 2.235 2.724 4.769 1.264 6.832 2.385 L 19.644 9.353 Z" stroke="currentColor"/>
  </svg>
);

export default PlayOutlineIcon;
