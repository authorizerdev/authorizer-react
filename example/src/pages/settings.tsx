import * as React from 'react';
import { Link } from 'react-router-dom';
import { AuthorizerMFASetup, useAuthorizer } from 'authorizer-react';

// A real settings-screen usage of AuthorizerMFASetup: every method tile is
// driven entirely by what the server actually has enabled (config.is_*_enabled),
// not hardcoded per-app booleans - toggle any of them via CLI flags
// (--disable-webauthn-mfa, --disable-mfa, EnableEmailOTP/EnableSMSOTP + a
// configured email/SMS provider) and this page reflects it automatically on
// next load, with no code change here.
const Settings: React.FC = () => {
  const { config, user } = useAuthorizer();

  return (
    <div>
      <h1>Manage sign-in methods</h1>
      <AuthorizerMFASetup
        availableMfaMethods={{
          totp: config.is_totp_mfa_enabled,
          passkey: config.is_webauthn_enabled,
          emailOtp: config.is_email_otp_mfa_enabled,
          smsOtp: config.is_sms_otp_mfa_enabled,
        }}
        // What this user already enrolled, so those tiles read
        // "Enabled"/"Manage" instead of offering a fresh setup.
        enrolledMethods={user?.enrolled_mfa_methods}
        heading="Add a second step to sign in"
      />
      <br />
      <Link to="/">Back to dashboard</Link>
    </div>
  );
};

export default Settings;
