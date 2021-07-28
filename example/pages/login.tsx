import * as React from 'react';
import { Authorizer } from '../../.';

const Login: React.FC = () => {
  return (
    <>
      <h1 style={{ textAlign: 'center' }}>Welcome to Authorizer</h1>
      <br />
      <Authorizer />
    </>
  );
};

export default Login;
