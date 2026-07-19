import { FC, useEffect, useState } from 'react';
import { AuthToken, isWebauthnSupported } from '@authorizerdev/authorizer-js';

import '../styles/default.css';
import { ButtonAppearance, MessageType } from '../constants';
import { useAuthorizer } from '../contexts/AuthorizerContext';
import { StyledButton, StyledSeparator } from '../styledComponents';
import { Message } from './Message';
import { AuthorizerMFASetup } from './AuthorizerMFASetup';
import { AuthorizerMfaLocked } from './AuthorizerMfaLocked';
import { AuthorizerVerifyOtp } from './AuthorizerVerifyOtp';
import { resolveAuthStep, AuthStep } from '../utils/mfaTriage';

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
  // Fired whenever this component switches between its own button and its
  // internal MFA offer/verify/locked screens. A passkey-primary login that
  // needs a second factor takes over the whole login surface - hosts
  // rendering other login options (social buttons, password form) alongside
  // this component need this to hide them while an MFA screen is showing.
  onStepChange?: (step: 'button' | 'mfa-setup' | 'mfa-verify' | 'locked') => void;
}> = ({ onLogin, onStepChange }) => {
  const [error, setError] = useState(``);
  const [loading, setLoading] = useState(false);
  const [mfaStep, setMfaStep] = useState<AuthStep | null>(null);
  const { setAuthData, config, authorizerRef } = useAuthorizer();

  useEffect(() => {
    if (!onStepChange) return;
    if (mfaStep?.kind === 'locked') {
      onStepChange('locked');
    } else if (mfaStep?.kind === 'offer') {
      onStepChange('mfa-setup');
    } else if (mfaStep?.kind === 'verify') {
      onStepChange('mfa-verify');
    } else {
      onStepChange('button');
    }
  }, [mfaStep?.kind]);

  // When the org enforces MFA, passkey must never be offered as a
  // standalone primary-login path - it would let a user skip the org's
  // two-factor requirement entirely. The server refuses this independently
  // (webauthn_login_verify checks EnforceMFA itself, surfaced here via
  // resolveAuthStep's 'verify' branch below), but the button shouldn't
  // invite the attempt in the first place: authenticator methods belong
  // after a first factor has identified the user, not before.
  if (!isWebauthnSupported() || config.is_mfa_enforced) {
    return null;
  }

  // Only show the "OR" separator if AuthorizerRoot is actually going to
  // render something below it - otherwise the passkey button ends up
  // followed by a trailing separator with nothing underneath. Mirrors the
  // exact set of conditions AuthorizerRoot uses to decide whether
  // AuthorizerSocialLogin, AuthorizerBasicAuthLogin, or
  // AuthorizerMagicLinkLogin render anything on the login view.
  // Deliberately excludes hasSocialLogin: social login always renders above
  // this button in every known composition (AuthorizerRoot, web/app's
  // login.tsx), so it's never "below" the passkey button - counting it here
  // produced a second, redundant "OR" stacked under the first one AND a
  // dangling "OR" with nothing beneath when social was the only other method.
  const hasBasicAuthLogin =
    (config.is_basic_authentication_enabled ||
      config.is_mobile_basic_authentication_enabled) &&
    !config.is_magic_link_login_enabled;
  const hasAnotherLoginMethod =
    hasBasicAuthLogin || config.is_magic_link_login_enabled;

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
      const step = resolveAuthStep(res, errors || []);
      if (step.kind === 'error') {
        setError(step.message);
        return;
      }
      if (step.kind === 'locked' || step.kind === 'offer' || step.kind === 'verify') {
        setMfaStep(step);
        return;
      }
      setAuthData({
        user: step.response.user || null,
        token: step.response,
        config,
        loading: false,
      });
      if (onLogin) {
        onLogin(step.response);
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

  if (mfaStep?.kind === 'locked') {
    return <AuthorizerMfaLocked />;
  }
  if (mfaStep?.kind === 'offer') {
    return (
      <AuthorizerMFASetup
        availableMfaMethods={{
          totp: !!mfaStep.totpEnrollment || config.is_totp_mfa_enabled,
          passkey: mfaStep.passkey,
          emailOtp: mfaStep.emailOtp,
          smsOtp: mfaStep.smsOtp,
        }}
        totpEnrollment={mfaStep.totpEnrollment || undefined}
        heading="Set up multi-factor authentication"
        onBack={() => setMfaStep(null)}
        loginContext={{
          onComplete: (data) => {
            setAuthData({
              user: (data as any).user || null,
              token: data as any,
              config,
              loading: false,
            });
            if (onLogin) {
              onLogin(data as any);
            }
          },
        }}
      />
    );
  }
  if (mfaStep?.kind === 'verify') {
    // A passkey-primary login that still needs a second factor has no
    // email/phone_number in hand (usernameless login). AuthorizerVerifyOtp
    // still works here: verify_otp/resend_otp resolve the pending user from
    // the MFA session cookie alone when no identifier is supplied (the same
    // session-only path the OAuth-return continuation uses).
    return (
      <AuthorizerVerifyOtp
        is_totp={mfaStep.totp}
        offerWebauthnVerify={mfaStep.webauthn}
        hasCodeFactor={mfaStep.totp || mfaStep.email || mfaStep.mobile}
        onBack={() => setMfaStep(null)}
        onLogin={(data) => {
          setAuthData({
            user: data?.user || null,
            token: data,
            config,
            loading: false,
          });
          if (onLogin) {
            onLogin(data);
          }
        }}
      />
    );
  }

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
