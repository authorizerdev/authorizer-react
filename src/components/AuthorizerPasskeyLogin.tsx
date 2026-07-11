import { FC, useState } from 'react';
import { AuthToken, isWebauthnSupported } from '@authorizerdev/authorizer-js';

import '../styles/default.css';
import { ButtonAppearance, MessageType } from '../constants';
import { useAuthorizer } from '../contexts/AuthorizerContext';
import { StyledButton, StyledSeparator } from '../styledComponents';
import { Message } from './Message';

// AuthorizerPasskeyLogin offers a full passwordless, usernameless "Sign in
// with a passkey" option (discoverable-credential login) alongside the other
// login methods. It only renders when the browser actually supports the
// WebAuthn JSON ceremony APIs the SDK relies on - there is no server-side
// config flag for passkeys (unlike social login), it's purely a browser
// capability.
export const AuthorizerPasskeyLogin: FC<{
  onLogin?: (data: AuthToken | void) => void;
}> = ({ onLogin }) => {
  const [error, setError] = useState(``);
  const [loading, setLoading] = useState(false);
  const { setAuthData, config, authorizerRef } = useAuthorizer();

  if (!isWebauthnSupported()) {
    return null;
  }

  const onClick = async () => {
    setError(``);
    try {
      setLoading(true);
      const { data: res, errors } = await authorizerRef.loginWithPasskey();
      if (errors && errors.length) {
        setError(errors[0]?.message || ``);
        return;
      }
      if (res) {
        setAuthData({
          user: res.user || null,
          token: res,
          config,
          loading: false,
        });
      }
      if (onLogin) {
        onLogin(res);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const onErrorClose = () => setError(``);

  return (
    <>
      {error && (
        <Message type={MessageType.Error} text={error} onClose={onErrorClose} />
      )}
      <StyledButton
        onClick={onClick}
        disabled={loading}
        appearance={ButtonAppearance.Default}
      >
        {loading ? `Waiting for passkey ...` : `Sign in with a passkey`}
      </StyledButton>
      <StyledSeparator>OR</StyledSeparator>
    </>
  );
};
