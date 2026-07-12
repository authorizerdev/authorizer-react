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
// PasskeyIcon is an inline fingerprint glyph (no icon-library dependency) that
// inherits the button's text color via currentColor.
const PasskeyIcon: FC = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M2 12C2 6.5 6.5 2 12 2a10 10 0 0 1 8 4" />
    <path d="M5 19.5C5.5 18 6 15 6 12c0-.7.12-1.37.34-2" />
    <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" />
    <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
    <path d="M8.65 22c.21-.66.45-1.32.57-2" />
    <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
    <path d="M2 16h.01" />
    <path d="M21.8 16c.2-2 .131-5.354 0-6" />
    <path d="M9 6.8a6 6 0 0 1 9 5.2c0 .47 0 1.17-.02 2" />
  </svg>
);

export const AuthorizerPasskeyLogin: FC<{
  onLogin?: (data: AuthToken | void) => void;
}> = ({ onLogin }) => {
  const [error, setError] = useState(``);
  const [loading, setLoading] = useState(false);
  const { setAuthData, config, authorizerRef } = useAuthorizer();

  if (!isWebauthnSupported()) {
    return null;
  }

  // Only show the "OR" separator if AuthorizerRoot is actually going to
  // render something below it - otherwise the passkey button ends up
  // followed by a trailing separator with nothing underneath. Mirrors the
  // exact set of conditions AuthorizerRoot uses to decide whether
  // AuthorizerSocialLogin, AuthorizerBasicAuthLogin, or
  // AuthorizerMagicLinkLogin render anything on the login view.
  const hasSocialLogin =
    config.is_google_login_enabled ||
    config.is_github_login_enabled ||
    config.is_facebook_login_enabled ||
    config.is_linkedin_login_enabled ||
    config.is_apple_login_enabled ||
    config.is_twitter_login_enabled ||
    config.is_microsoft_login_enabled ||
    config.is_twitch_login_enabled ||
    config.is_roblox_login_enabled;
  const hasBasicAuthLogin =
    (config.is_basic_authentication_enabled ||
      config.is_mobile_basic_authentication_enabled) &&
    !config.is_magic_link_login_enabled;
  const hasAnotherLoginMethod =
    hasSocialLogin || hasBasicAuthLogin || config.is_magic_link_login_enabled;

  // A cancelled ceremony or an account with no passkey surfaces as
  // NotAllowedError/AbortError (the browser deliberately does not distinguish
  // "cancelled" from "no credential" to avoid leaking account state). Neither is
  // a real failure - the user simply falls back to password/social login - so we
  // dismiss silently instead of showing a scary error banner. The button is
  // always visible when the browser supports WebAuthn, so this path is common.
  const isUserDismissed = (e?: { code?: string }): boolean =>
    e?.code === `NotAllowedError` || e?.code === `AbortError`;

  const onClick = async () => {
    setError(``);
    try {
      setLoading(true);
      const { data: res, errors } = await authorizerRef.loginWithPasskey();
      if (errors && errors.length) {
        if (!isUserDismissed(errors[0])) {
          setError(errors[0]?.message || ``);
        }
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
      if (!isUserDismissed(err as { code?: string })) {
        setError((err as Error).message);
      }
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
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <PasskeyIcon />
          {loading ? `Waiting for passkey ...` : `Sign in with a passkey`}
        </span>
      </StyledButton>
      {hasAnotherLoginMethod && <StyledSeparator>OR</StyledSeparator>}
    </>
  );
};
