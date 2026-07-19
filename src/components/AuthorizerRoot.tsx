import { FC, useState } from 'react';
import { AuthToken, parseMfaRedirectParams } from '@authorizerdev/authorizer-js';

import { AuthorizerBasicAuthLogin } from './AuthorizerBasicAuthLogin';
import { useAuthorizer } from '../contexts/AuthorizerContext';
import { StyledWrapper } from '../styledComponents';
import { Views, MessageType } from '../constants';
import { AuthorizerSignup } from './AuthorizerSignup';
import type {  FormFieldsOverrides } from './AuthorizerSignup';
import { AuthorizerForgotPassword } from './AuthorizerForgotPassword';
import { AuthorizerSocialLogin } from './AuthorizerSocialLogin';
import { AuthorizerPasskeyLogin } from './AuthorizerPasskeyLogin';
import { AuthorizerMagicLinkLogin } from './AuthorizerMagicLinkLogin';
import { AuthorizerMFASetup } from './AuthorizerMFASetup';
import { AuthorizerVerifyOtp } from './AuthorizerVerifyOtp';
import { Message } from './Message';
import { createRandomString } from '../utils/common';
import { hasWindow } from '../utils/window';

export const AuthorizerRoot: FC<{
  onLogin?: (data: AuthToken | void) => void;
  onSignup?: (data: AuthToken | void) => void;
  onMagicLinkLogin?: (data: any) => void;
  onForgotPassword?: (data: any) => void;
  onPasswordReset?: () => void;
  roles?: string[];
	signupFieldsOverrides?: FormFieldsOverrides
  // When present, a "Back" link is shown on the MFA setup/verify screens
  // (URL-param-driven, see mfaRedirect below) so the host can send the user
  // somewhere sane - e.g. back to the login URL with the mfa params cleared.
  onCancelMfa?: () => void;
}> = ({
  onLogin,
  onSignup,
  onMagicLinkLogin,
  onForgotPassword,
  onPasswordReset,
  roles,
	signupFieldsOverrides,
  onCancelMfa,
}) => {
  const [view, setView] = useState(Views.Login);
  // AuthorizerPasskeyLogin and AuthorizerBasicAuthLogin each take over the
  // whole login surface once their own sign-in needs a second factor (their
  // own MFA setup/verify/locked screens) - every other login option, and the
  // login attempt not currently in flight, don't belong stacked on top of
  // those screens.
  const [passkeyStep, setPasskeyStep] = useState<
    'button' | 'mfa-setup' | 'mfa-verify' | 'locked'
  >('button');
  const [basicAuthStep, setBasicAuthStep] = useState<
    'form' | 'mfa-setup' | 'otp-verify' | 'locked'
  >('form');
  const passkeyIdle = passkeyStep === 'button';
  const basicAuthIdle = basicAuthStep === 'form';
  const showChrome = passkeyIdle && basicAuthIdle;
  const { config, configLoadError } = useAuthorizer();
  const searchParams = new URLSearchParams(
    hasWindow() ? window.location.search : ``
  );
  const mfaRedirect = hasWindow()
    ? parseMfaRedirectParams(window.location.href)
    : null;
  const state = searchParams.get('state') || createRandomString();
  const scope = searchParams.get('scope')
    ? searchParams
        .get('scope')
        ?.toString()
        .split(' ')
    : ['openid', 'profile', 'email'];

  const urlProps: Record<string, any> = {
    state,
    scope,
  };

  const redirectURL =
    searchParams.get('redirect_uri') || searchParams.get('redirectURL');
  if (redirectURL) {
    urlProps.redirectURL = redirectURL;
  } else {
    urlProps.redirectURL = hasWindow() ? window.location.origin : redirectURL;
  }

  urlProps.redirect_uri = urlProps.redirectURL;
  return (
    <StyledWrapper>
      {configLoadError && (
        <Message
          type={MessageType.Error}
          text={`Unable to reach the Authorizer server (${configLoadError}). Login methods that depend on it - such as basic auth, signup, and social login - won't appear until it's reachable.`}
        />
      )}
      {mfaRedirect && mfaRedirect.mfaGate === 'verify' && (
        // An already-configured factor must be challenged, not offered setup
        // again - no email/phone_number in hand (OAuth/magic-link return),
        // but verify_otp resolves the pending user from the MFA session
        // cookie alone, same as the passkey-primary-login continuation.
        <AuthorizerVerifyOtp
          is_totp={mfaRedirect.mfaMethods.includes('totp')}
          offerWebauthnVerify={mfaRedirect.mfaMethods.includes('webauthn')}
          hasCodeFactor={
            mfaRedirect.mfaMethods.includes('totp') ||
            mfaRedirect.mfaMethods.includes('email_otp') ||
            mfaRedirect.mfaMethods.includes('sms_otp')
          }
          onBack={onCancelMfa}
          onLogin={(data: any) => {
            if (onLogin) {
              onLogin(data);
            }
          }}
        />
      )}
      {mfaRedirect && mfaRedirect.mfaGate === 'offer' && (
        <AuthorizerMFASetup
          availableMfaMethods={{
            totp: mfaRedirect.mfaMethods.includes('totp'),
            passkey: mfaRedirect.mfaMethods.includes('webauthn'),
            emailOtp: mfaRedirect.mfaMethods.includes('email_otp'),
            smsOtp: mfaRedirect.mfaMethods.includes('sms_otp'),
          }}
          heading="Set up multi-factor authentication"
          onBack={onCancelMfa}
          loginContext={{
            onComplete: (data: any) => {
              if (onLogin) {
                onLogin(data);
              }
            },
          }}
        />
      )}
      {!mfaRedirect && view === Views.Login && showChrome && (
        <AuthorizerSocialLogin urlProps={urlProps} roles={roles} />
      )}
      {!mfaRedirect && view === Views.Login && basicAuthIdle && (
        <AuthorizerPasskeyLogin onLogin={onLogin} onStepChange={setPasskeyStep} />
      )}
      {!mfaRedirect &&
        view === Views.Login &&
        passkeyIdle &&
        (config.is_basic_authentication_enabled ||
          config.is_mobile_basic_authentication_enabled) &&
        !config.is_magic_link_login_enabled && (
          <AuthorizerBasicAuthLogin
            setView={setView}
            onLogin={onLogin}
            urlProps={urlProps}
            roles={roles}
            onStepChange={setBasicAuthStep}
          />
        )}

      {view === Views.Signup &&
        (config.is_basic_authentication_enabled ||
          config.is_mobile_basic_authentication_enabled) &&
        !config.is_magic_link_login_enabled &&
        config.is_sign_up_enabled && (
          <AuthorizerSignup
            setView={setView}
            onSignup={onSignup}
            urlProps={urlProps}
            roles={roles}
						fieldOverrides={signupFieldsOverrides}
          />
        )}

      {!mfaRedirect &&
        view === Views.Login &&
        showChrome &&
        config.is_magic_link_login_enabled && (
          <AuthorizerMagicLinkLogin
            onMagicLinkLogin={onMagicLinkLogin}
            urlProps={urlProps}
            roles={roles}
          />
        )}

      {view === Views.ForgotPassword && (
        <AuthorizerForgotPassword
          setView={setView}
          onForgotPassword={onForgotPassword}
          onPasswordReset={onPasswordReset}
          urlProps={urlProps}
        />
      )}
    </StyledWrapper>
  );
};
