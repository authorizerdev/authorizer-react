import { FC, useState } from 'react';
import { isWebauthnSupported } from '@authorizerdev/authorizer-js';

import '../styles/default.css';
import { ButtonAppearance, MessageType } from '../constants';
import {
  IconAuthenticator,
  IconEmail,
  IconPasskey,
  IconPhone,
} from '../icons/mfa';
import { StyledButton } from '../styledComponents';
import { Message } from './Message';
import { AuthorizerTOTPScanner } from './AuthorizerTOTPScanner';
import { AuthorizerPasskeyRegister } from './AuthorizerPasskeyRegister';
import { AuthorizerVerifyOtp } from './AuthorizerVerifyOtp';
import { useAuthorizer } from '../contexts/AuthorizerContext';
import { TotpEnrollment } from '../utils/mfaTriage';

const BackLink: FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    type="button"
    className="mfa-icon-button"
    onClick={onClick}
    style={{ border: 'none', background: 'none', padding: '4px 0' }}
  >
    &larr; All methods
  </button>
);

export type MfaMethod = 'totp' | 'passkey' | 'email_otp' | 'sms_otp';

// Which MFA methods the server offers. This shape is designed to map 1:1
// onto the public `meta` query the server will expose next:
//
//   totp     <- meta.is_totp_mfa_enabled
//   passkey  <- meta.is_webauthn_enabled   (also gated at runtime by the
//               browser via isWebauthnSupported())
//   emailOtp <- meta.is_email_otp_mfa_enabled
//   smsOtp   <- meta.is_sms_otp_mfa_enabled
//
// Until those fields land, drive it via this prop. An omitted / false value
// hides the method entirely, so the user only ever sees real options.
export type AvailableMfaMethods = {
  totp?: boolean;
  passkey?: boolean;
  emailOtp?: boolean;
  smsOtp?: boolean;
};

type AuthTokenLike = { access_token?: string | null; [key: string]: any };

// AuthorizerMFASetup is the hub where a signed-in user opts into the MFA
// methods the server supports. TOTP and passkey have complete in-component
// enrolment flows; email- and SMS-OTP are enabled server-side, so they are
// delegated to the host via onSetupMethod.
export const AuthorizerMFASetup: FC<{
  availableMfaMethods: AvailableMfaMethods;
  // Enrolment payload for the authenticator-app flow. When present, choosing
  // "Set up" for TOTP renders the scanner inline. When absent, onSetupMethod
  // is called so the host can fetch it (the server returns the QR + secret +
  // recovery codes) and re-render with this prop populated.
  totpEnrollment?: TotpEnrollment;
  // Fired when a method is chosen that this component can't complete on its
  // own (email/SMS OTP, or TOTP without an enrolment payload).
  onSetupMethod?: (method: MfaMethod) => void;
  heading?: string;
  // When present, this is the login-time (withheld-token) offer screen, not
  // the settings-screen "add a second factor" hub: a Skip action appears,
  // and completing a method calls onComplete with the token issued by
  // skip_mfa_setup / verify_otp / the OTP setup+verify cycle instead of the
  // settings-screen's "just close/refresh" behavior.
  loginContext?: {
    email?: string;
    phone_number?: string;
    state?: string;
    onComplete: (response: AuthTokenLike) => void;
  };
}> = ({
  availableMfaMethods,
  totpEnrollment,
  onSetupMethod,
  heading = 'Add a second step to sign in',
  loginContext,
}) => {
  const [selected, setSelected] = useState<MfaMethod | null>(null);
  const [notice, setNotice] = useState('');
  const [skipping, setSkipping] = useState(false);
  const [skipError, setSkipError] = useState('');
  const [sendingOtpSetup, setSendingOtpSetup] = useState(false);
  const [otpSetupError, setOtpSetupError] = useState('');
  const [otpMethodPending, setOtpMethodPending] = useState<
    'email_otp' | 'sms_otp' | null
  >(null);
  // Fetched via totpMfaSetup when the host didn't already supply a
  // totpEnrollment prop or an onSetupMethod override - the default,
  // host-free path, mirroring email/SMS OTP's own direct-SDK-call fallback.
  const [fetchedTotpEnrollment, setFetchedTotpEnrollment] =
    useState<TotpEnrollment | null>(null);

  const { authorizerRef } = useAuthorizer();

  const passkeySupported = isWebauthnSupported();

  const methods: {
    key: MfaMethod;
    available: boolean;
    icon: JSX.Element;
    title: string;
    description: string;
    disabled?: boolean;
    disabledReason?: string;
  }[] = [
    {
      key: 'totp',
      available: !!availableMfaMethods.totp,
      icon: <IconAuthenticator />,
      title: 'Authenticator app',
      description: 'Use a TOTP app like Google Authenticator or Authy.',
    },
    {
      key: 'passkey',
      available: !!availableMfaMethods.passkey && !loginContext,
      icon: <IconPasskey />,
      title: 'Passkey',
      description: 'Sign in with your fingerprint, face, or device PIN.',
      disabled: !passkeySupported,
      disabledReason: 'Not supported on this browser or device.',
    },
    {
      key: 'email_otp',
      available: !!availableMfaMethods.emailOtp,
      icon: <IconEmail />,
      title: 'Email one-time code',
      description: 'Get a single-use code by email each time you sign in.',
    },
    {
      key: 'sms_otp',
      available: !!availableMfaMethods.smsOtp,
      icon: <IconPhone />,
      title: 'SMS one-time code',
      description:
        'Get a single-use code by text message each time you sign in.',
    },
  ];

  const visibleMethods = methods.filter((m) => m.available);

  const handleSetup = async (method: MfaMethod) => {
    setNotice('');
    if (method === 'totp') {
      if (totpEnrollment) {
        setSelected('totp');
        return;
      }
      // If the host supplied onSetupMethod, defer to it (escape hatch for
      // custom behavior) - otherwise fetch a fresh enrollment via the SDK
      // directly, same default host-free path email/SMS OTP already have.
      if (onSetupMethod) {
        onSetupMethod('totp');
        return;
      }
      setOtpSetupError('');
      setSendingOtpSetup(true);
      try {
        const { data, errors } = await authorizerRef.totpMfaSetup({
          email: loginContext?.email,
          phone_number: loginContext?.phone_number,
        });
        if (errors && errors.length) {
          setOtpSetupError(
            errors[0]?.message || 'Failed to start authenticator app setup',
          );
          return;
        }
        if (data?.authenticator_secret && data?.authenticator_scanner_image) {
          setFetchedTotpEnrollment({
            authenticator_scanner_image: data.authenticator_scanner_image,
            authenticator_secret: data.authenticator_secret,
            authenticator_recovery_codes:
              data.authenticator_recovery_codes || [],
          });
          setSelected('totp');
        } else {
          setOtpSetupError('Failed to start authenticator app setup');
        }
      } catch (err) {
        setOtpSetupError((err as Error).message);
      } finally {
        setSendingOtpSetup(false);
      }
      return;
    }
    if (method === 'passkey') {
      setSelected('passkey');
      return;
    }
    // email_otp / sms_otp: if the host supplied onSetupMethod, defer to it
    // (escape hatch for custom behavior). Otherwise use the real SDK calls
    // directly - this is the default, host-free path this task adds.
    if (onSetupMethod) {
      onSetupMethod(method);
      setNotice(
        method === 'email_otp'
          ? 'Email one-time codes will be sent the next time you sign in.'
          : 'SMS one-time codes will be sent the next time you sign in.'
      );
      return;
    }
    setOtpSetupError('');
    setSendingOtpSetup(true);
    try {
      const params = {
        email: loginContext?.email,
        phone_number: loginContext?.phone_number,
      };
      const { errors } =
        method === 'email_otp'
          ? await authorizerRef.emailOtpMfaSetup(params)
          : await authorizerRef.smsOtpMfaSetup(params);
      if (errors && errors.length) {
        setOtpSetupError(errors[0]?.message || 'Failed to send code');
        return;
      }
      setOtpMethodPending(method);
    } catch (err) {
      setOtpSetupError((err as Error).message);
    } finally {
      setSendingOtpSetup(false);
    }
  };

  const handleSkip = async () => {
    if (!loginContext) return;
    setSkipError('');
    setSkipping(true);
    try {
      const { data, errors } = await authorizerRef.skipMfaSetup({
        email: loginContext.email,
        phone_number: loginContext.phone_number,
        state: loginContext.state,
      });
      if (errors && errors.length) {
        setSkipError(errors[0]?.message || 'Failed to skip MFA setup');
        return;
      }
      if (data) {
        loginContext.onComplete(data);
      }
    } catch (err) {
      setSkipError((err as Error).message);
    } finally {
      setSkipping(false);
    }
  };

  const backToList = () => {
    setSelected(null);
    setFetchedTotpEnrollment(null);
  };

  const effectiveTotpEnrollment = totpEnrollment || fetchedTotpEnrollment || undefined;

  if (selected === 'totp' && effectiveTotpEnrollment) {
    return (
      <>
        <BackLink onClick={backToList} />
        <AuthorizerTOTPScanner
          {...effectiveTotpEnrollment}
          email={loginContext?.email}
          phone_number={loginContext?.phone_number}
          setView={backToList}
          onLogin={(data) => {
            if (loginContext && data && (data as AuthTokenLike).access_token) {
              loginContext.onComplete(data as AuthTokenLike);
              return;
            }
            backToList();
          }}
        />
      </>
    );
  }

  if (otpMethodPending) {
    return (
      <>
        <BackLink onClick={() => setOtpMethodPending(null)} />
        <AuthorizerVerifyOtp
          email={loginContext?.email}
          phone_number={loginContext?.phone_number}
          is_totp={false}
          hasCodeFactor
          onLogin={(data) => {
            if (loginContext && data && (data as AuthTokenLike).access_token) {
              loginContext.onComplete(data as AuthTokenLike);
              return;
            }
            setOtpMethodPending(null);
          }}
        />
      </>
    );
  }

  if (selected === 'passkey') {
    return (
      <>
        <BackLink onClick={backToList} />
        <p style={{ margin: '10px 0px', fontWeight: 'bold' }}>Add a passkey</p>
        <AuthorizerPasskeyRegister onSuccess={backToList} showCredentials />
      </>
    );
  }

  return (
    <>
      <p style={{ margin: '10px 0px', fontWeight: 'bold' }}>{heading}</p>
      {notice && (
        <Message
          type={MessageType.Success}
          text={notice}
          onClose={() => setNotice('')}
        />
      )}
      {otpSetupError && (
        <Message
          type={MessageType.Error}
          text={otpSetupError}
          onClose={() => setOtpSetupError('')}
        />
      )}
      {visibleMethods.length === 0 ? (
        <Message
          type={MessageType.Info}
          text="No additional sign-in methods are available right now."
          extraStyles={{ color: 'var(--authorizer-text-color)' }}
        />
      ) : (
        <ul className="mfa-list" aria-label="Available multi-factor methods">
          {visibleMethods.map((m) => (
            <li key={m.key} className="mfa-method">
              <span className="mfa-method-icon">{m.icon}</span>
              <div className="mfa-method-body">
                <p className="mfa-method-title">{m.title}</p>
                <p className="mfa-method-desc">
                  {m.disabled && m.disabledReason
                    ? m.disabledReason
                    : m.description}
                </p>
              </div>
              <div className="mfa-method-action">
                <StyledButton
                  type="button"
                  appearance={ButtonAppearance.Default}
                  disabled={m.disabled || sendingOtpSetup}
                  onClick={() => handleSetup(m.key)}
                  style={{ width: 'auto' }}
                >
                  Set up
                </StyledButton>
              </div>
            </li>
          ))}
        </ul>
      )}
      {skipError && (
        <Message
          type={MessageType.Error}
          text={skipError}
          onClose={() => setSkipError('')}
        />
      )}
      {loginContext && (
        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <StyledButton
            type="button"
            appearance={ButtonAppearance.Default}
            disabled={skipping}
            onClick={handleSkip}
          >
            {skipping ? 'Skipping ...' : 'Skip for now'}
          </StyledButton>
        </div>
      )}
    </>
  );
};
