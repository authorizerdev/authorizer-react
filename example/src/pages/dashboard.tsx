import * as React from 'react';
import { AuthorizerMFASetup, useAuthorizer } from 'authorizer-react';

const Dashboard: React.FC = () => {
  const { user, loading, logout, authorizerRef } = useAuthorizer();
  const [mfaOffer, setMfaOffer] = React.useState<any>(() => {
    const raw = sessionStorage.getItem('mfaSetupOffer');
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const dismissMfaOffer = () => {
    sessionStorage.removeItem('mfaSetupOffer');
    setMfaOffer(null);
  };

  if (mfaOffer) {
    return (
      <AuthorizerMFASetup
        availableMfaMethods={{ totp: true }}
        totpEnrollment={mfaOffer}
        onSkip={async () => {
          await authorizerRef.skipMfaSetup();
          dismissMfaOffer();
        }}
      />
    );
  }

  return (
    <div>
      <h1>Hey 👋,</h1>
      <p>Thank you for joining Authorizer demo app.</p>
      <p>
        Your email address is{' '}
        <a href={`mailto:${user?.email}`} style={{ color: '#3B82F6' }}>
          {user?.email}
        </a>
      </p>

      <br />
      {loading ? (
        <h3>Processing....</h3>
      ) : (
        <h3
          style={{
            color: '#3B82F6',
            cursor: 'pointer',
          }}
          onClick={logout}
        >
          Logout
        </h3>
      )}
    </div>
  );
};

export default Dashboard;
