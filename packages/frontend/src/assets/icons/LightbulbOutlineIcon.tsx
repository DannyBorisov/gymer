import type { SVGProps } from "react";

const LightbulbOutlineIcon = ({ size = 20, ...props }: SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M 14.5 19.5 H 9.5 M 14.5 19.5 C 14.5 18.786 14.5 18.43 14.538 18.193 C 14.661 17.43 14.682 17.381 15.169 16.781 C 15.32 16.594 15.881 16.093 17.001 15.089 C 18.535 13.716 19.5 11.721 19.5 9.5 C 19.5 5.358 16.142 2 12 2 C 7.858 2 4.5 5.358 4.5 9.5 C 4.5 11.721 5.465 13.716 6.999 15.089 C 8.119 16.093 8.68 16.594 8.831 16.781 C 9.318 17.381 9.339 17.43 9.462 18.193 C 9.5 18.43 9.5 18.786 9.5 19.5 M 14.5 19.5 C 14.5 20.435 14.5 20.902 14.299 21.25 C 14.167 21.478 13.978 21.667 13.75 21.799 C 13.402 22 12.935 22 12 22 C 11.065 22 10.598 22 10.25 21.799 C 10.022 21.667 9.833 21.478 9.701 21.25 C 9.5 20.902 9.5 20.435 9.5 19.5" stroke="currentColor"/>
    <path d="M 12 17 V 15" stroke="currentColor" stroke-linecap="round"/>
    <path d="M 13.732 14 C 13.387 14.598 12.74 15 12 15 C 11.26 15 10.613 14.598 10.268 14" stroke="currentColor" stroke-linecap="round"/>
  </svg>
);

export default LightbulbOutlineIcon;
