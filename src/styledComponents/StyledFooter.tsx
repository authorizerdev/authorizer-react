import React, { ReactNode } from 'react';
import styles from '../styles/default.mod.css';

const StyledFooter = ({ children }: { children: ReactNode }) => {
  return <div className={styles['styled-footer']}>{children}</div>;
};

export default StyledFooter;
