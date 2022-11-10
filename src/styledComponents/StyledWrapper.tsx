import React, { ReactNode } from 'react';

const StyledWrapper = ({ children }: { children: ReactNode }) => {
  return <div className="styled-wrapper">{children}</div>;
};

export default StyledWrapper;
