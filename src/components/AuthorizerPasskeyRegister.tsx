import { FC, useEffect, useState } from 'react';
import {
  AuthToken,
  WebauthnCredentialInfo,
  isWebauthnSupported,
} from '@authorizerdev/authorizer-js';

import '../styles/default.css';
import { ButtonAppearance, MessageType } from '../constants';
import { useAuthorizer } from '../contexts/AuthorizerContext';
import { StyledButton } from '../styledComponents';
import { IconPasskey } from '../icons/mfa';
import { Message } from './Message';

// AuthorizerPasskeyRegister lets a signed-in user enrol a new passkey
// (WebAuthn credential) as an MFA / passwordless method. It complements
// AuthorizerPasskeyLogin, which only handles the login ceremony.
//
// Passkeys are a browser capability - there is no server config flag - so
// this renders an "unsupported" notice (rather than nothing) when the
// browser can't run the WebAuthn JSON ceremony, since in a settings context
// the user needs to know why the option is missing.
export const AuthorizerPasskeyRegister: FC<{
  // Called after a passkey is successfully registered. On the mfaSetup path
  // (below) this carries access_token when registration also completed a
  // withheld MFA offer - a plain settings-page add never sets it.
  onSuccess?: (data: AuthToken | void) => void;
  // Optional friendly name for the credential (e.g. "MacBook Touch ID").
  // When omitted a small inline field is shown so the user can name it.
  name?: string;
  // Show the list of already-registered passkeys above the add button.
  // Requires an authenticated session; off by default so Storybook and
  // unauthenticated hosts don't trigger a failing request.
  showCredentials?: boolean;
  // Present only during a token-withheld login-time MFA offer: authenticates
  // the ceremony via the MFA session cookie instead of a bearer token (there
  // isn't one yet), and completing it issues the previously-withheld token.
  mfaSetup?: { email?: string; phoneNumber?: string; state?: string };
}> = ({ onSuccess, name, showCredentials = false, mfaSetup }) => {
  const { authorizerRef } = useAuthorizer();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [credentialName, setCredentialName] = useState(name || '');
  const [credentials, setCredentials] = useState<WebauthnCredentialInfo[]>([]);

  const supported = isWebauthnSupported();

  const loadCredentials = async () => {
    try {
      const { data, errors } = await authorizerRef.webauthnCredentials();
      if (errors && errors.length) {
        return;
      }
      setCredentials(data || []);
    } catch {
      // Non-fatal: the add-passkey flow still works without the list.
    }
  };

  useEffect(() => {
    if (supported && showCredentials) {
      loadCredentials();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supported, showCredentials]);

  if (!supported) {
    return (
      <Message
        type={MessageType.Info}
        text="Passkeys aren't supported on this browser or device. Try a different browser to add one."
        extraStyles={{ color: 'var(--authorizer-text-color)' }}
      />
    );
  }

  const onClick = async () => {
    setError('');
    setSuccess('');
    try {
      setLoading(true);
      const trimmed = credentialName.trim();
      const { data, errors } = await authorizerRef.registerPasskey(
        trimmed || undefined,
        mfaSetup
      );
      if (errors && errors.length) {
        setError(errors[0]?.message || 'Could not add passkey.');
        return;
      }
      setSuccess('Passkey added. You can now sign in with it.');
      setCredentialName('');
      if (showCredentials) {
        loadCredentials();
      }
      if (onSuccess) {
        onSuccess(data);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {error && (
        <Message
          type={MessageType.Error}
          text={error}
          onClose={() => setError('')}
        />
      )}
      {success && (
        <Message
          type={MessageType.Success}
          text={success}
          onClose={() => setSuccess('')}
        />
      )}

      {showCredentials && credentials.length > 0 && (
        <ul className="mfa-list" aria-label="Your passkeys">
          {credentials.map((cred) => (
            <li key={cred.id} className="mfa-method">
              <span className="mfa-method-icon">
                <IconPasskey size={20} />
              </span>
              <div className="mfa-method-body">
                <p className="mfa-method-title">{cred.name || 'Passkey'}</p>
                {cred.last_used_at ? (
                  <p className="mfa-method-desc">
                    Last used{' '}
                    {new Date(cred.last_used_at * 1000).toLocaleDateString()}
                  </p>
                ) : (
                  <p className="mfa-method-desc">Not used yet</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {name === undefined && (
        <div className="styled-form-group">
          <label className="form-input-label" htmlFor="passkey-name">
            Passkey name (optional)
          </label>
          <input
            id="passkey-name"
            className="form-input-field"
            type="text"
            placeholder="e.g. MacBook Touch ID"
            value={credentialName}
            onChange={(e) => setCredentialName(e.target.value)}
            disabled={loading}
          />
        </div>
      )}

      <StyledButton
        onClick={onClick}
        disabled={loading}
        appearance={ButtonAppearance.Primary}
      >
        {loading ? 'Waiting for passkey…' : 'Add a passkey'}
      </StyledButton>
    </>
  );
};
