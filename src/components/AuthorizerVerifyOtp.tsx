import { FC, useEffect, useRef, useState } from 'react';
import {
  VerifyOTPRequest,
  isWebauthnSupported,
} from '@authorizerdev/authorizer-js';
import '../styles/default.css';

import { ButtonAppearance, MessageType, Views } from '../constants';
import { useAuthorizer } from '../contexts/AuthorizerContext';
import { StyledButton, StyledFooter, StyledLink } from '../styledComponents';
import { Message } from './Message';
import { BackLink } from './BackLink';
import { TotpDataType } from '../types';
import { AuthorizerTOTPScanner } from './AuthorizerTOTPScanner';
import { AuthorizerMfaLocked } from './AuthorizerMfaLocked';
import { IconPasskey } from '../icons/mfa';
import { resolveAuthStep } from '../utils/mfaTriage';
import { hasWindow } from '../utils/window';

interface InputDataType {
  otp: string | null;
}

const initTotpData: TotpDataType = {
  is_screen_visible: false,
  email: '',
  phone_number: '',
  authenticator_scanner_image: '',
  authenticator_secret: '',
  authenticator_recovery_codes: [],
};

export const AuthorizerVerifyOtp: FC<{
  setView?: (v: Views) => void;
  onLogin?: (data: any) => void;
  email?: string;
  phone_number?: string;
  urlProps?: Record<string, any>;
  is_totp?: boolean;
  offerWebauthnVerify?: boolean;
  hasCodeFactor?: boolean;
  // True specifically when the pending code factor is SMS-delivered (as
  // opposed to email OTP or TOTP) - gates the WebOTP auto-fill call, which
  // only makes sense for an actual incoming SMS.
  hasSmsOtp?: boolean;
  // When present, a "Back" link lets the user leave this challenge (e.g.
  // return to the login screen) instead of being stuck once a factor is
  // being verified.
  onBack?: () => void;
}> = ({
  setView,
  onLogin,
  email,
  phone_number,
  urlProps,
  is_totp,
  offerWebauthnVerify,
  hasCodeFactor,
  hasSmsOtp,
  onBack,
}) => {
  const [error, setError] = useState(``);
  const [successMessage, setSuccessMessage] = useState(``);
  const [loading, setLoading] = useState(false);
  const [totpData, setTotpData] = useState<TotpDataType>({ ...initTotpData });
  const [sendingOtp, setSendingOtp] = useState(false);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [formData, setFormData] = useState<InputDataType>({
    otp: null,
  });
  const [errorData, setErrorData] = useState<InputDataType>({
    otp: null,
  });
  const { authorizerRef, config, setAuthData } = useAuthorizer();
  // No email/phone_number is a legitimate state here, not an error: the
  // OAuth-return and passkey-primary-login MFA continuations resolve the
  // pending user from the MFA session cookie alone (see verify_otp.go's
  // sessionResolved path) - the frontend never learns their email/phone in
  // those flows.

  const [webauthnError, setWebauthnError] = useState(``);
  // Distinct from webauthnError: the passkey ceremony itself succeeded, this
  // just tells the user a second factor is still needed - showing that as a
  // red error would read as "your passkey failed," which it didn't.
  const [webauthnNotice, setWebauthnNotice] = useState(``);
  const [webauthnLoading, setWebauthnLoading] = useState(false);
  const [webauthnLocked, setWebauthnLocked] = useState(false);
  const passkeySupported = isWebauthnSupported();

  // A cancelled ceremony surfaces as NotAllowedError/AbortError (same
  // browser behavior AuthorizerPasskeyLogin already handles) - dismiss
  // silently and let the user fall back to the code form when one exists.
  const isUserDismissed = (e?: { code?: string }): boolean =>
    e?.code === `NotAllowedError` || e?.code === `AbortError`;

  const onVerifyWithPasskey = async () => {
    setWebauthnError(``);
    setWebauthnNotice(``);
    try {
      setWebauthnLoading(true);
      const { data: res, errors } = await authorizerRef.loginWithPasskey(email);
      if (errors && errors.length) {
        if (!isUserDismissed(errors[0])) {
          setWebauthnError(errors[0]?.message || ``);
        }
        return;
      }
      // Route through resolveAuthStep rather than treating any truthy `res`
      // as success - webauthn_login_verify can return the same withheld
      // (null access_token) shape any other login endpoint can, the exact
      // bug the MFA redesign fixed at every other call site.
      const step = resolveAuthStep(res, errors || []);
      if (step.kind === 'error') {
        setWebauthnError(step.message);
        return;
      }
      if (step.kind === 'locked') {
        setWebauthnLocked(true);
        return;
      }
      if (step.kind === 'offer') {
        // Unexpected here - this screen only renders once a factor is
        // already verified, so a first-time-offer response would mean the
        // server's state disagrees with what got us to this screen. Surface
        // it as an error rather than silently completing or guessing at a
        // setup UI.
        setWebauthnError(`Unable to verify with passkey. Please try again.`);
        return;
      }
      if (step.kind === 'verify') {
        setWebauthnNotice(
          `Your passkey was verified. Enter the code below to finish signing in.`
        );
        return;
      }
      // step.kind === 'complete'
      setError(``);
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
        setWebauthnError((err as Error).message);
      }
    } finally {
      setWebauthnLoading(false);
    }
  };

  const onInputChange = async (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  // WebOTP: races navigator.credentials.get() against the user manually
  // typing/pasting the SMS code, so the code auto-fills where the platform
  // supports it. autoComplete="one-time-code" on the input below is only a
  // declarative hint - browsers require this explicit call to actually
  // fill the field. Scoped to SMS-OTP alone (not TOTP/email-OTP), since
  // those codes never arrive by SMS. Feature-detected via
  // window.OTPCredential, matching what the autocomplete hint already
  // implies; unsupported platforms simply never resolve/reject here.
  const otpAbortControllerRef = useRef<AbortController | null>(null);
  useEffect(() => {
    if (
      !hasCodeFactor ||
      is_totp ||
      !hasSmsOtp ||
      totpData.is_screen_visible ||
      webauthnLocked ||
      !hasWindow() ||
      !('OTPCredential' in window)
    ) {
      return;
    }

    const controller = new AbortController();
    otpAbortControllerRef.current = controller;

    (
      navigator.credentials.get({
        otp: { transport: ['sms'] },
        signal: controller.signal,
      } as any) as Promise<{ code?: string } | null>
    )
      .then((otpCredential) => {
        if (otpCredential?.code) {
          setFormData((prev) => ({ ...prev, otp: otpCredential.code as string }));
        }
      })
      .catch(() => {
        // Aborted on unmount/submit, or the platform declined - the user
        // can still type/paste the code manually, so this isn't an error.
      });

    return () => {
      controller.abort();
    };
  }, [
    hasCodeFactor,
    is_totp,
    hasSmsOtp,
    totpData.is_screen_visible,
    webauthnLocked,
  ]);

  const onSubmit = async (e: any) => {
    e.preventDefault();
    // Stop racing WebOTP once the user (or an auto-filled value) submits -
    // otherwise a late resolution could overwrite formData.otp after the
    // fact on a re-shown form (e.g. a failed attempt).
    otpAbortControllerRef.current?.abort();
    setSuccessMessage(``);
    try {
      setLoading(true);
      const data: VerifyOTPRequest = {
        email,
        phone_number,
        otp: formData.otp || '',
      };
      if (urlProps?.state) {
        data.state = urlProps.state;
      }
      data.is_totp = !!is_totp;
      const { data: res, errors } = await authorizerRef.verifyOtp(data);
      if (errors && errors.length) {
        if (errors[0]?.code === 'TOO_MANY_REQUESTS') {
          setIsLockedOut(true);
          // Fall back to a fixed message if the server ever sends an empty
          // one: the form is about to go fully disabled (input + submit),
          // so this is the user's only explanation for why - an empty
          // string here would mean no message renders at all (Message
          // returns null for blank text) and the form goes silently dead.
          setError(
            errors[0]?.message ||
              `Too many attempts. Please wait a while before trying again.`
          );
          return;
        }
        setError(errors[0]?.message || ``);
        return;
      }

      // If TOTP validated using recovery code then show totp screen with scanner
      if (
        res &&
        res.should_show_totp_screen &&
        res.authenticator_scanner_image &&
        res.authenticator_secret &&
        res.authenticator_recovery_codes
      ) {
        setTotpData({
          is_screen_visible: true,
          email: data.email || ``,
          phone_number: data.phone_number || ``,
          authenticator_scanner_image: res.authenticator_scanner_image,
          authenticator_secret: res.authenticator_secret,
          authenticator_recovery_codes: res.authenticator_recovery_codes,
        });
        return;
      }

      if (res) {
        setError(``);
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

  const onErrorClose = () => {
    setError(``);
  };

  const onSuccessClose = () => {
    setSuccessMessage(``);
  };

  const resendOtp = async () => {
    setSuccessMessage(``);
    try {
      setSendingOtp(true);

      const { data: res, errors } = await authorizerRef.resendOtp({
        email,
        phone_number,
      });
      setSendingOtp(false);
      if (errors && errors.length) {
        setError(errors[0]?.message || ``);
        return;
      }

      if (res && res?.message) {
        setError(``);
        setSuccessMessage(res.message);
      }

      if (onLogin) {
        onLogin(res);
      }
    } catch (err) {
      setSendingOtp(false);
      setError((err as Error).message);
    }
  };

  useEffect(() => {
    if (formData.otp === '') {
      setErrorData({ ...errorData, otp: 'OTP is required' });
    } else {
      setErrorData({ ...errorData, otp: null });
    }
  }, [formData.otp]);

  if (totpData.is_screen_visible) {
    return (
      <AuthorizerTOTPScanner
        {...{
          setView,
          onLogin,
          email: totpData.email || ``,
          phone_number: totpData.phone_number || ``,
          authenticator_scanner_image: totpData.authenticator_scanner_image,
          authenticator_secret: totpData.authenticator_secret,
          authenticator_recovery_codes:
            totpData.authenticator_recovery_codes || [],
        }}
        urlProps={urlProps}
      />
    );
  }

  if (webauthnLocked) {
    return <AuthorizerMfaLocked />;
  }

  // A code-based factor (TOTP or a verified email/SMS OTP authenticator)
  // was offered alongside webauthn: show the passkey button first, with the
  // code form as a fallback below it. The code form is only hidden when no
  // code factor exists at all - resolveAuthStep guarantees 'verify' never
  // has all of totp/webauthn/email/mobile false, so !hasCodeFactor already
  // implies webauthn is the sole option, regardless of passkeySupported
  // (an unsupported browser still shouldn't render a dead-end code form -
  // passkeyOnlyUnsupported below covers that case with an explanation).
  const showCodeForm = !!hasCodeFactor;
  // Passkey is the user's only MFA factor but this browser can't do WebAuthn:
  // no code factor exists to fall back to, so the code form below would be
  // a dead end.
  const passkeyOnlyUnsupported =
    !!offerWebauthnVerify && !passkeySupported && !hasCodeFactor;

  return (
    <>
      {onBack && <BackLink onClick={onBack} />}
      {successMessage && (
        <Message
          type={MessageType.Success}
          text={successMessage}
          onClose={onSuccessClose}
        />
      )}
      {error && (
        <Message
          type={MessageType.Error}
          text={error}
          onClose={isLockedOut ? undefined : onErrorClose}
        />
      )}
      {webauthnError && (
        <Message
          type={MessageType.Error}
          text={webauthnError}
          onClose={() => setWebauthnError(``)}
        />
      )}
      {webauthnNotice && (
        <Message
          type={MessageType.Info}
          text={webauthnNotice}
          onClose={() => setWebauthnNotice(``)}
        />
      )}
      {offerWebauthnVerify && passkeySupported && (
        <>
          <p style={{ margin: '10px 0px' }}>Verify with your passkey</p>
          <StyledButton
            type="button"
            appearance={ButtonAppearance.Default}
            disabled={webauthnLoading}
            onClick={onVerifyWithPasskey}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <IconPasskey />
              {webauthnLoading
                ? `Waiting for passkey ...`
                : `Verify with a passkey`}
            </span>
          </StyledButton>
          <br />
        </>
      )}
      {passkeyOnlyUnsupported && (
        <Message
          type={MessageType.Info}
          text={`This browser doesn't support passkeys. Please try again on a device or browser that does.`}
          extraStyles={{
            color: 'var(--authorizer-text-color)',
          }}
        />
      )}
      {showCodeForm && (
        <>
          {offerWebauthnVerify && passkeySupported && (
            <p style={{ margin: '10px 0px' }}>Or enter a code instead</p>
          )}
          <p style={{ margin: '10px 0px' }}>
            Please enter the OTP sent to your email or phone number or
            authenticator
          </p>
          <br />
          <form onSubmit={onSubmit} name="authorizer-mfa-otp-form">
            <div className="styled-form-group">
              <label
                className="form-input-label"
                htmlFor="authorizer-verify-otp"
              >
                <span>* </span>OTP (One Time Password)
              </label>
              <input
                name="otp"
                id="authorizer-verify-otp"
                className={`form-input-field ${
                  errorData.otp ? 'input-error-content' : ''
                }`}
                placeholder="e.g.- AB123C"
                type="password"
                autoComplete="one-time-code"
                value={formData.otp || ''}
                onChange={(e) => onInputChange('otp', e.target.value)}
                disabled={isLockedOut}
              />
              {errorData.otp && (
                <div className="form-input-error">{errorData.otp}</div>
              )}
              {is_totp && (
                <Message
                  type={MessageType.Info}
                  text={`If you have lost access to your device, please enter recovery code that were shared while enabling Multifactor Authentication.`}
                  extraStyles={{
                    color: 'var(--authorizer-text-color)',
                  }}
                />
              )}
            </div>
            <br />
            <StyledButton
              type="submit"
              disabled={
                loading || !formData.otp || !!errorData.otp || isLockedOut
              }
              appearance={ButtonAppearance.Primary}
            >
              {loading ? `Processing ...` : `Submit`}
            </StyledButton>
          </form>
        </>
      )}
      {setView && (
        <StyledFooter>
          {!is_totp &&
            showCodeForm &&
            (sendingOtp ? (
              <div style={{ marginBottom: '10px' }}>Sending ...</div>
            ) : (
              <StyledLink onClick={resendOtp} marginBottom="10px">
                Resend OTP
              </StyledLink>
            ))}
          {config.is_sign_up_enabled && (
            <div>
              Don't have an account?{' '}
              <StyledLink onClick={() => setView(Views.Signup)}>
                Sign Up
              </StyledLink>
            </div>
          )}
        </StyledFooter>
      )}
    </>
  );
};
