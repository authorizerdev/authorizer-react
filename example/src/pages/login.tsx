import * as React from 'react';
import { Authorizer } from 'authorizer-react';

const Login: React.FC = () => {
  return (
    <>
      <h1 style={{ textAlign: 'center' }}>Welcome to Authorizer</h1>
      <br />
      <Authorizer
        onLogin={(loginData: any) => {
          console.log({ loginData });
        }}
        onMagicLinkLogin={(mData: any) => {
          console.log({ mData });
        }}
        onSignup={(sData: any) => {
          console.log({ sData });
        }}
      />
    </>
  );
};

export default Login;
