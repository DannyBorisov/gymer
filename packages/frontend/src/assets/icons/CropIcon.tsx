import type { SVGProps } from "react";

const CropIcon = ({ size = 20, ...props }: SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 20 20"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path fill="currentColor" d="M19.5 15h-3c-0.276 0-0.5-0.224-0.5-0.5s0.224-0.5 0.5-0.5h3c0.276 0 0.5 0.224 0.5 0.5s-0.224 0.5-0.5 0.5z" />
    <path fill="currentColor" d="M12.5 15h-7c-0.276 0-0.5-0.224-0.5-0.5v-7c0-0.276 0.224-0.5 0.5-0.5s0.5 0.224 0.5 0.5v6.5h6.5c0.276 0 0.5 0.224 0.5 0.5s-0.224 0.5-0.5 0.5z" />
    <path fill="currentColor" d="M5.5 4c-0.276 0-0.5-0.224-0.5-0.5v-3c0-0.276 0.224-0.5 0.5-0.5s0.5 0.224 0.5 0.5v3c0 0.276-0.224 0.5-0.5 0.5z" />
    <path fill="currentColor" d="M14.5 20c-0.276 0-0.5-0.224-0.5-0.5v-13.5h-13.5c-0.276 0-0.5-0.224-0.5-0.5s0.224-0.5 0.5-0.5h14c0.276 0 0.5 0.224 0.5 0.5v14c0 0.276-0.224 0.5-0.5 0.5z" />
  </svg>
);

export default CropIcon;
