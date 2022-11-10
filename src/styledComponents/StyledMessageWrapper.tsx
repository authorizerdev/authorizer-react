import React, { ReactNode } from 'react';
import { MessageType } from '../constants';
import styles from '../styles/default.css';

const StyledMessageWrapper = ({
  type = MessageType.Success,
  children,
}: {
  type: MessageType;
  children: ReactNode;
}) => {
  return (
    <div
      className={styles['styled-message-wrapper']}
      style={{
        backgroundColor:
          type === MessageType.Error
            ? 'var(--authorizer-danger-color)'
            : 'var(--authorizer-success-color)',
      }}
    >
      {children}
    </div>
  );
};

export default StyledMessageWrapper;
