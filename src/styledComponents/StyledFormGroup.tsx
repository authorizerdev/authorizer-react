import React, { ReactNode } from 'react';
import styles from '../styles/default.mod.css';

const StyledFormGroup = ({ children }: { children: ReactNode }) => {
  return <div className={styles['styled-form-group']}>{children}</div>;
};

export default StyledFormGroup;
