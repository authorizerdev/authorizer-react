import React, { ReactNode } from 'react';

const StyledPasswordStrengthWrapper = ({
  children,
}: {
  children: ReactNode;
}) => {
  return <div className="styled-password-strength-wrapper">{children}</div>;
};

export default StyledPasswordStrengthWrapper;
