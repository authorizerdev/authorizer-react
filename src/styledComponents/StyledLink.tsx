import React, { ReactNode } from 'react';
import '../styles/default.css';

const StyledLink = ({
  marginBottom = '0px',
  children,
}: {
  marginBottom: string;
  children: ReactNode;
}) => {
  return (
    <span className="styled-link" style={{ marginBottom }}>
      {children}
    </span>
  );
};

export default StyledLink;
