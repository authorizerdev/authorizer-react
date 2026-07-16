import * as React from 'react';
import { Link } from 'react-router-dom';
import { AuthorizerMFASetup } from 'authorizer-react';

const Settings: React.FC = () => {
  return (
    <div>
      <h1>Manage sign-in methods</h1>
      <AuthorizerMFASetup
        availableMfaMethods={{
          totp: false,
          passkey: true,
          emailOtp: false,
          smsOtp: false,
        }}
        heading="Add a passkey"
      />
      <br />
      <Link to="/">Back to dashboard</Link>
    </div>
  );
};

export default Settings;
