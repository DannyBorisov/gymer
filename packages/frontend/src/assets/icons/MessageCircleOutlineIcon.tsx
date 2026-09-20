import type { SVGProps } from "react";

const MessageCircleOutlineIcon = ({ size = 20, ...props }: SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M 12 22 C 17.523 22 22 17.523 22 12 C 22 6.477 17.523 2 12 2 C 6.477 2 2 6.477 2 12 C 2 13.6 2.376 15.112 3.043 16.452 C 3.221 16.809 3.28 17.216 3.177 17.601 L 2.582 19.827 C 2.323 20.793 3.207 21.677 4.173 21.418 L 6.399 20.823 C 6.784 20.72 7.191 20.779 7.548 20.957 C 8.888 21.624 10.4 22 12 22 Z" stroke="currentColor"/>
  </svg>
);

export default MessageCircleOutlineIcon;
