import * as React from 'react';
import { Authorizer } from '../../.';

const Login: React.FC = () => {
  return (
    <>
      <h1 style={{ textAlign: 'center' }}>Welcome to Authorizer</h1>
      <br />
      <Authorizer
        onLogin={(loginData) => {
          console.log({ loginData });
        }}
        onMagicLinkLogin={(mData) => {
          console.log({ mData });
        }}
        onSignup={(sData) => {
          console.log({ sData });
        }}
      />
    </>
  );
};

export default Login;
