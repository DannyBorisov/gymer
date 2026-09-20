import type { SVGProps } from "react";

const FrameContractIcon = ({ size = 20, ...props }: SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 20 20"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path fill="currentColor" d="M14.5 9h-2c-0.827 0-1.5-0.673-1.5-1.5v-2c0-0.276 0.224-0.5 0.5-0.5s0.5 0.224 0.5 0.5v2c0 0.276 0.224 0.5 0.5 0.5h2c0.276 0 0.5 0.224 0.5 0.5s-0.224 0.5-0.5 0.5z" />
    <path fill="currentColor" d="M6.5 9h-2c-0.276 0-0.5-0.224-0.5-0.5s0.224-0.5 0.5-0.5h2c0.276 0 0.5-0.224 0.5-0.5v-2c0-0.276 0.224-0.5 0.5-0.5s0.5 0.224 0.5 0.5v2c0 0.827-0.673 1.5-1.5 1.5z" />
    <path fill="currentColor" d="M11.5 16c-0.276 0-0.5-0.224-0.5-0.5v-2c0-0.827 0.673-1.5 1.5-1.5h2c0.276 0 0.5 0.224 0.5 0.5s-0.224 0.5-0.5 0.5h-2c-0.276 0-0.5 0.224-0.5 0.5v2c0 0.276-0.224 0.5-0.5 0.5z" />
    <path fill="currentColor" d="M7.5 16c-0.276 0-0.5-0.224-0.5-0.5v-2c0-0.276-0.224-0.5-0.5-0.5h-2c-0.276 0-0.5-0.224-0.5-0.5s0.224-0.5 0.5-0.5h2c0.827 0 1.5 0.673 1.5 1.5v2c0 0.276-0.224 0.5-0.5 0.5z" />
  </svg>
);

export default FrameContractIcon;
