import { FC } from 'react';

type IconProps = {
  size?: number;
};

const base = (size: number) => ({
  width: `${size}px`,
  height: `${size}px`,
  display: 'block',
});

export const IconEye: FC<IconProps> = ({ size = 18 }) => (
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
    <path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7-10.5-7-10.5-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const IconEyeOff: FC<IconProps> = ({ size = 18 }) => (
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
    <path d="M17.94 17.94A10.5 10.5 0 0 1 12 19.5C5 19.5 1.5 12 1.5 12a19.1 19.1 0 0 1 4.22-5.44M9.9 4.66A10.8 10.8 0 0 1 12 4.5c7 0 10.5 7.5 10.5 7.5a19.15 19.15 0 0 1-2.16 3.19M14.12 14.12a3 3 0 1 1-4.24-4.24" />
    <path d="M1.5 1.5l21 21" />
  </svg>
);
