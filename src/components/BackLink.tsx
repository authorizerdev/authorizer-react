import { FC } from 'react';

const ArrowLeftIcon: FC<{ size?: number }> = ({ size = 16 }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ width: size, height: size, display: 'block' }}
    aria-hidden="true"
  >
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);

// The one back-navigation control every MFA/OTP screen uses - kept at the
// top of the screen (not the bottom) so it's the first thing a user sees
// when they land on a multi-step or content-heavy screen (e.g. the TOTP
// scanner with recovery codes below it), not something they have to scroll
// past a form to find.
export const BackLink: FC<{ onClick: () => void; label?: string }> = ({
  onClick,
  label = 'Back',
}) => (
  <button
    type="button"
    className="mfa-icon-button mfa-back-link"
    onClick={onClick}
  >
    <ArrowLeftIcon />
    {label}
  </button>
);
