import { FC } from 'react';

// Shared MFA icons. All use `currentColor` so they inherit the surrounding
// text color and stay theme-consistent. Decorative by default
// (aria-hidden) - the accessible label lives on the button/element around
// them.
type IconProps = {
  size?: number;
};

const base = (size: number) => ({
  width: `${size}px`,
  height: `${size}px`,
  display: 'block',
});

export const IconAuthenticator: FC<IconProps> = ({ size = 22 }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={base(size)}
    aria-hidden="true"
  >
    <rect x="6" y="2" width="12" height="20" rx="2.5" />
    <path d="M12 6h.01M9 18h6" />
  </svg>
);

export const IconPasskey: FC<IconProps> = ({ size = 22 }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={base(size)}
    aria-hidden="true"
  >
    <circle cx="8" cy="9" r="4" />
    <path d="M8 13v7l2-2 2 2 2-2M15 9h6M18 6v6" />
  </svg>
);

export const IconEmail: FC<IconProps> = ({ size = 22 }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={base(size)}
    aria-hidden="true"
  >
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </svg>
);

export const IconPhone: FC<IconProps> = ({ size = 22 }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={base(size)}
    aria-hidden="true"
  >
    <rect x="7" y="2" width="10" height="20" rx="2.5" />
    <path d="M11 18h2" />
  </svg>
);

export const IconCopy: FC<IconProps> = ({ size = 15 }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={base(size)}
    aria-hidden="true"
  >
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

export const IconDownload: FC<IconProps> = ({ size = 15 }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={base(size)}
    aria-hidden="true"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
  </svg>
);

export const IconPrint: FC<IconProps> = ({ size = 15 }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={base(size)}
    aria-hidden="true"
  >
    <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" rx="1" />
  </svg>
);

export const IconCheck: FC<IconProps> = ({ size = 15 }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={base(size)}
    aria-hidden="true"
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
);
