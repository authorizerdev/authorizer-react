import * as React from 'react';
import { Authorizer } from 'authorizer-react';

const Login: React.FC = () => {
  return (
    <>
      <h1 style={{ textAlign: 'center' }}>Welcome to Authorizer</h1>
      <br />
      <Authorizer
        onLogin={(data: any) => {
          if (data?.should_offer_mfa_setup) {
            sessionStorage.setItem(
              'mfaSetupOffer',
              JSON.stringify({
                authenticator_scanner_image: data.authenticator_scanner_image,
                authenticator_secret: data.authenticator_secret,
                authenticator_recovery_codes: data.authenticator_recovery_codes,
              })
            );
          }
        }}
      />
    </>
  );
};

export default Login;
