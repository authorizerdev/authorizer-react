import React, { ReactNode } from 'react';
import '../styles/default.css';

const StyledFormGroup = ({ children }: { children: ReactNode }) => {
  return <div className="styled-form-group">{children}</div>;
};

export default StyledFormGroup;
