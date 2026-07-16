import * as Types from '@authorizerdev/authorizer-js';

// The message text internal/service/login.go (and webauthn.go, oauth_mfa_gate.go)
// use for a locked account, verified against the backend source. There is no
// dedicated error code for "locked" - FAILED_PRECONDITION is shared with other
// MFA errors (e.g. "cannot skip, MFA is enforced"), so matching on this stable
// message substring is the only reliable client-side signal today.
const LOCKED_MESSAGE_SUBSTRING = 'multi-factor authentication is locked';

export type TotpEnrollment = {
  authenticator_scanner_image: string;
  authenticator_secret: string;
  authenticator_recovery_codes: string[];
};

export type AuthStep =
  | { kind: 'complete'; response: Types.AuthResponse }
  | {
      kind: 'verify';
      totp: boolean;
      webauthn: boolean;
      email: boolean;
      mobile: boolean;
    }
  | {
      kind: 'offer';
      totpEnrollment: TotpEnrollment | null;
      // Passkey is intentionally excluded from the offer surface here - see
      // this plan's Global Constraints: webauthn_registration_options/verify
      // require a bearer token that doesn't exist in this withheld-token
      // state, a known backend gap tracked separately, not fixed by this
      // component.
      emailOtp: boolean;
      smsOtp: boolean;
    }
  | { kind: 'locked' }
  | { kind: 'error'; message: string };

function isLockedError(errors: Types.AuthorizerSDKError[]): boolean {
  return errors.some(
    (e) =>
      e.code === 'FAILED_PRECONDITION' &&
      (e.message || '').includes(LOCKED_MESSAGE_SUBSTRING),
  );
}

// resolveAuthStep is the single place every login-capable component decides
// what to render next from an SDK call's { data, errors } result. Replaces
// each component's own ad hoc should_show_*/should_offer_* checks - the bug
// that caused a withheld (null access_token) response to be silently treated
// as a successful login in AuthorizerPasskeyLogin was exactly this kind of
// duplicated, incomplete check.
export function resolveAuthStep(
  res: Types.AuthResponse | undefined,
  errors: Types.AuthorizerSDKError[],
): AuthStep {
  if (errors && errors.length) {
    if (isLockedError(errors)) {
      return { kind: 'locked' };
    }
    return { kind: 'error', message: errors[0]?.message || '' };
  }
  if (!res) {
    return { kind: 'error', message: 'No response from server' };
  }
  if (res.access_token) {
    return { kind: 'complete', response: res };
  }
  // Withheld: either a verify (user already has a completed factor) or an
  // offer (first-time, nothing completed yet). should_show_totp_screen is
  // shared between both - the enrollment fields being present is what
  // distinguishes "offer TOTP setup" from "verify with your existing TOTP".
  const hasTotpEnrollment = !!(
    res.authenticator_scanner_image &&
    res.authenticator_secret &&
    res.authenticator_recovery_codes
  );
  if (res.should_show_totp_screen && !hasTotpEnrollment) {
    // Verified TOTP factor exists; asking for a code, not enrollment.
    return {
      kind: 'verify',
      totp: true,
      webauthn: !!res.should_offer_webauthn_mfa_verify,
      email: !!res.should_show_email_otp_screen,
      mobile: !!res.should_show_mobile_otp_screen,
    };
  }
  if (
    res.should_offer_webauthn_mfa_verify ||
    res.should_show_email_otp_screen ||
    res.should_show_mobile_otp_screen
  ) {
    return {
      kind: 'verify',
      totp: !!res.should_show_totp_screen && !hasTotpEnrollment,
      webauthn: !!res.should_offer_webauthn_mfa_verify,
      email: !!res.should_show_email_otp_screen,
      mobile: !!res.should_show_mobile_otp_screen,
    };
  }
  if (
    hasTotpEnrollment ||
    res.should_offer_email_otp_mfa_setup ||
    res.should_offer_sms_otp_mfa_setup
  ) {
    return {
      kind: 'offer',
      totpEnrollment: hasTotpEnrollment
        ? {
            authenticator_scanner_image: res.authenticator_scanner_image as string,
            authenticator_secret: res.authenticator_secret as string,
            authenticator_recovery_codes: res.authenticator_recovery_codes as string[],
          }
        : null,
      emailOtp: !!res.should_offer_email_otp_mfa_setup,
      smsOtp: !!res.should_offer_sms_otp_mfa_setup,
    };
  }
  // No access_token and none of the known MFA flags set - treat as an error
  // rather than silently completing with a null token (the exact bug this
  // helper exists to close).
  return { kind: 'error', message: res.message || 'Unable to sign in' };
}
