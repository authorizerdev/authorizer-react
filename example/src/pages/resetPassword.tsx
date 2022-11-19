import * as React from 'react';
import { AuthorizerResetPassword } from 'authorizer-react';

const ResetPassword: React.FC = () => {
  return (
    <>
      <h1 style={{ textAlign: 'center' }}>Reset Password</h1>
      <br />
      <AuthorizerResetPassword />
    </>
  );
};

export default ResetPassword;
