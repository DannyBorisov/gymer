import type { SVGProps } from "react";

const TrashOutlineIcon = ({ size = 20, ...props }: SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M 9.171 4.5 C 9.583 3.335 10.694 2.5 12 2.5 C 13.306 2.5 14.418 3.335 14.829 4.5" stroke="currentColor" stroke-linecap="round"/>
    <path d="M 20.5 6.5 H 3.5" stroke="currentColor" stroke-linecap="round"/>
    <path d="M 18.833 9 L 18.373 15.899 C 18.196 18.554 18.108 19.881 17.243 20.691 C 16.378 21.5 15.047 21.5 12.387 21.5 H 11.613 C 8.952 21.5 7.622 21.5 6.757 20.691 C 5.892 19.881 5.803 18.554 5.626 15.899 L 5.167 9" stroke="currentColor" stroke-linecap="round"/>
    <path d="M 9.5 11.5 L 10 16.5" stroke="currentColor" stroke-linecap="round"/>
    <path d="M 14.5 11.5 L 14 16.5" stroke="currentColor" stroke-linecap="round"/>
  </svg>
);

export default TrashOutlineIcon;
