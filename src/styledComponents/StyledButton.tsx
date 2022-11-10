import React, { ReactNode } from 'react';
import '../styles/default.css';
import { ButtonAppearance } from '../constants';

const StyledButton = ({
  style = {
    width: '100%',
  },
  appearance = ButtonAppearance.Default,
  disabled = false,
  children,
}: {
  style: Record<string, string>;
  appearance: ButtonAppearance;
  disabled: boolean;
  children: ReactNode;
}) => {
  return (
    <button
      className="styled-button"
      style={{
        width: style.width,
        backgroundColor: disabled
          ? 'var(--authorizer-primary-disabled-color)'
          : appearance === ButtonAppearance.Primary
          ? 'var(--authorizer-primary-color)'
          : 'var(--authorizer-white-color)',
        color:
          appearance === ButtonAppearance.Default
            ? 'var(--authorizer-text-color)'
            : 'var(--authorizer-white-color)',
        border: appearance === ButtonAppearance.Primary ? '0px' : '1px',
      }}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export default StyledButton;
