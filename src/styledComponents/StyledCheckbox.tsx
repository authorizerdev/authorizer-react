import React, { ReactNode } from 'react';

const StyledCheckbox = ({ children }: { children: ReactNode }) => {
  return <div className="styled-checkbox">{children}</div>;
};

export default StyledCheckbox;
