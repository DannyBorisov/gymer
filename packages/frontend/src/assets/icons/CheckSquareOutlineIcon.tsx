import type { SVGProps } from "react";

const CheckSquareOutlineIcon = ({ size = 20, ...props }: SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M 2 12 C 2 7.286 2 4.929 3.464 3.464 C 4.929 2 7.286 2 12 2 C 16.714 2 19.071 2 20.536 3.464 C 22 4.929 22 7.286 22 12 C 22 16.714 22 19.071 20.536 20.536 C 19.071 22 16.714 22 12 22 C 7.286 22 4.929 22 3.464 20.536 C 2 19.071 2 16.714 2 12 Z" stroke="currentColor"/>
    <path d="M 7 14 L 9.293 11.707 C 9.683 11.317 10.317 11.317 10.707 11.707 L 12.293 13.293 C 12.683 13.683 13.317 13.683 13.707 13.293 L 17 10 M 14.5 10 H 17 V 12.5" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
);

export default CheckSquareOutlineIcon;
