import type { SVGProps } from "react";

const CalendarOutlineIcon = ({ size = 20, ...props }: SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M 2 11.75 C 2 7.979 2 6.093 3.172 4.922 C 4.343 3.75 6.229 3.75 10 3.75 H 14 C 17.771 3.75 19.657 3.75 20.828 4.922 C 22 6.093 22 7.979 22 11.75 V 13.75 C 22 17.521 22 19.407 20.828 20.578 C 19.657 21.75 17.771 21.75 14 21.75 H 10 C 6.229 21.75 4.343 21.75 3.172 20.578 C 2 19.407 2 17.521 2 13.75 V 11.75 Z" stroke="currentColor"/>
    <path d="M 7 3.75 V 2.25" stroke="currentColor" stroke-linecap="round"/>
    <path d="M 17 3.75 V 2.25" stroke="currentColor" stroke-linecap="round"/>
    <path d="M 2.5 8.75 H 21.5" stroke="currentColor" stroke-linecap="round"/>
    <path d="M 18 16.75 C 18 17.302 17.552 17.75 17 17.75 C 16.448 17.75 16 17.302 16 16.75 C 16 16.198 16.448 15.75 17 15.75 C 17.552 15.75 18 16.198 18 16.75 Z" fill="currentColor"/>
    <path d="M 18 12.75 C 18 13.302 17.552 13.75 17 13.75 C 16.448 13.75 16 13.302 16 12.75 C 16 12.198 16.448 11.75 17 11.75 C 17.552 11.75 18 12.198 18 12.75 Z" fill="currentColor"/>
    <path d="M 13 16.75 C 13 17.302 12.552 17.75 12 17.75 C 11.448 17.75 11 17.302 11 16.75 C 11 16.198 11.448 15.75 12 15.75 C 12.552 15.75 13 16.198 13 16.75 Z" fill="currentColor"/>
    <path d="M 13 12.75 C 13 13.302 12.552 13.75 12 13.75 C 11.448 13.75 11 13.302 11 12.75 C 11 12.198 11.448 11.75 12 11.75 C 12.552 11.75 13 12.198 13 12.75 Z" fill="currentColor"/>
    <path d="M 8 16.75 C 8 17.302 7.552 17.75 7 17.75 C 6.448 17.75 6 17.302 6 16.75 C 6 16.198 6.448 15.75 7 15.75 C 7.552 15.75 8 16.198 8 16.75 Z" fill="currentColor"/>
    <path d="M 8 12.75 C 8 13.302 7.552 13.75 7 13.75 C 6.448 13.75 6 13.302 6 12.75 C 6 12.198 6.448 11.75 7 11.75 C 7.552 11.75 8 12.198 8 12.75 Z" fill="currentColor"/>
  </svg>
);

export default CalendarOutlineIcon;
