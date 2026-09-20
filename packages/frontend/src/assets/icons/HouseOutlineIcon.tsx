import type { SVGProps } from "react";

const HouseOutlineIcon = ({ size = 20, ...props }: SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M 2 12.204 C 2 9.915 2 8.771 2.519 7.823 C 3.038 6.874 3.987 6.286 5.884 5.108 L 7.884 3.867 C 9.889 2.622 10.892 2 12 2 C 13.108 2 14.111 2.622 16.116 3.867 L 18.116 5.108 C 20.013 6.286 20.962 6.874 21.481 7.823 C 22 8.771 22 9.915 22 12.204 V 13.725 C 22 17.626 22 19.576 20.828 20.788 C 19.657 22 17.771 22 14 22 H 10 C 6.229 22 4.343 22 3.172 20.788 C 2 19.576 2 17.626 2 13.725 V 12.204 Z" stroke="currentColor"/>
    <path d="M 15 18 H 9" stroke="currentColor" stroke-linecap="round"/>
  </svg>
);

export default HouseOutlineIcon;
