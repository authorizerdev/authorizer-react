import React, { ReactNode } from 'react';

const StyledSeparator = ({ children }: { children: ReactNode }) => {
  return <div className="styled-separator">{children}</div>;
};

export default StyledSeparator;
