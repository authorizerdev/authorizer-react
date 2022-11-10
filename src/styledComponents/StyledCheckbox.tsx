import React, { ReactNode } from 'react';
import '../styles/default.css';

const StyledCheckbox = ({ children }: { children: ReactNode }) => {
  return <div className="styled-checkbox">{children}</div>;
};

export default StyledCheckbox;
