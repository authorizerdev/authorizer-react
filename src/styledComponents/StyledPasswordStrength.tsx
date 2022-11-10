import React, { ReactNode } from 'react';
import '../styles/default.css';
import { passwordStrengthIndicatorOpacity } from '../constants';

const StyledPasswordStrength = ({
  strength = 'default',
  children,
}: {
  strength: string;
  children: ReactNode;
}) => {
  return (
    <div
      className="styled-password-strength"
      style={{ opacity: passwordStrengthIndicatorOpacity[strength] }}
    >
      {children}
    </div>
  );
};

export default StyledPasswordStrength;
