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

type TotpEnrollment = {
  authenticator_scanner_image: string;
  authenticator_secret: string;
  authenticator_recovery_codes: string[];
};

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
  // Fired when the user explicitly declines to set up MFA right now. Absent
  // when MFA is organization-enforced — the host app must not render this
  // component with onSkip set in that case (check config before rendering).
  onSkip?: () => void;
  heading?: string;
}> = ({
  availableMfaMethods,
  totpEnrollment,
  onSetupMethod,
  onSkip,
  heading = 'Add a second step to sign in',
}) => {
  const [selected, setSelected] = useState<MfaMethod | null>(null);
  const [notice, setNotice] = useState('');

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
      available: !!availableMfaMethods.passkey,
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

  const handleSetup = (method: MfaMethod) => {
    setNotice('');
    if (method === 'totp') {
      if (totpEnrollment) {
        setSelected('totp');
      } else {
        onSetupMethod?.('totp');
      }
      return;
    }
    if (method === 'passkey') {
      setSelected('passkey');
      return;
    }
    // email_otp / sms_otp are enabled on the server; hand off to the host.
    onSetupMethod?.(method);
    setNotice(
      method === 'email_otp'
        ? 'Email one-time codes will be sent the next time you sign in.'
        : 'SMS one-time codes will be sent the next time you sign in.'
    );
  };

  const backToList = () => setSelected(null);

  if (selected === 'totp' && totpEnrollment) {
    return (
      <>
        <BackLink onClick={backToList} />
        <AuthorizerTOTPScanner
          {...totpEnrollment}
          setView={() => setSelected(null)}
          onLogin={() => setSelected(null)}
        />
      </>
    );
  }

  if (selected === 'passkey') {
    return (
      <>
        <BackLink onClick={backToList} />
        <p style={{ margin: '10px 0px', fontWeight: 'bold' }}>Add a passkey</p>
        <AuthorizerPasskeyRegister onSuccess={backToList} />
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
                  disabled={m.disabled}
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
      {onSkip && (
        <button
          type="button"
          className="mfa-icon-button"
          onClick={onSkip}
          style={{ border: 'none', background: 'none', padding: '8px 0' }}
        >
          Skip for now
        </button>
      )}
    </>
  );
};
