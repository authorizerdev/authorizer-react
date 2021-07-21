import * as React from 'react';
import { YAuthResetPassword } from '../../.';

const ResetPassword: React.FC = () => {
  return (
    <>
      <h1 style={{ textAlign: 'center' }}>Reset Password</h1>
      <br />
      <YAuthResetPassword />
    </>
  );
};

export default ResetPassword;
