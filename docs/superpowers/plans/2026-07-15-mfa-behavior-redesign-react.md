# authorizer-react MFA Behavior Redesign UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the withheld-token MFA contract (authorizer#686, authorizer-js#46) actually work end-to-end through this component library — today it renders nothing for the new response shape, and `AuthorizerPasskeyLogin` incorrectly treats a withheld (null-token) response as a successful login.

**Architecture:** One shared response-triage function used by every login-capable component; `AuthorizerMFASetup` (an existing, already-built multi-method picker) gains a "login mode" with a Skip action and real default wiring for email/SMS OTP; a new locked-account screen; `AuthorizerRoot` gains OAuth-redirect `mfa_required` detection.

**Tech Stack:** React, TypeScript. This repo has no component test suite (`npm test` is `tsc --noEmit` only, verified — no `*.test.tsx` files exist anywhere in `src/`). Every task's verification is (a) `npx tsc --noEmit` passing and (b) an exact manual procedure against the real linked SDK, a running backend on `localhost:8080` (already running, confirmed on the authorizer#686 branch), and the example app on `localhost:5174` (already running).

## Global Constraints

- No new fields beyond what the spec lists — do not touch anything outside this plan's file list.
- **Passkey is NOT offered as a "Set up" option in login mode** (only in the existing settings-screen mode) — `webauthn_registration_options`/`webauthn_registration_verify` require a bearer token that doesn't exist in the withheld-token state; this is a known, separately-tracked backend gap (the same class of gap `email_otp_mfa_setup`/`sms_otp_mfa_setup` had before this session's "I2" fix), not something this plan fixes. `should_offer_webauthn_mfa_setup` may still arrive from the backend in a login-mode response; the UI must not surface it as a clickable option there.
- Locked-account detection is by error `code === 'FAILED_PRECONDITION'` **and** message containing the substring `'multi-factor authentication is locked'` (verified against `internal/service/login.go`'s exact lockout message text) — `FAILED_PRECONDITION` alone is not specific enough (other MFA errors, e.g. "cannot skip... enforced", share the same code). This is a pragmatic client-side match against a stable backend message string, not a dedicated error code — documented here because there isn't a better mechanism today.
- `Types.AuthResponse`'s boolean flags (`should_show_totp_screen`, `should_offer_webauthn_mfa_verify`, `should_offer_webauthn_mfa_setup`, `should_offer_email_otp_mfa_setup`, `should_offer_sms_otp_mfa_setup`) are all `boolean | null` — treat `null`/`undefined`/`false` identically (falsy check), matching this codebase's existing convention throughout.
- Match existing code style exactly: no semicolons after JSX-returning arrow function bodies beyond what's already there, existing `Message`/`StyledButton`/`StyledFooter` component usage patterns, existing `useAuthorizer()` destructuring style.

---

## Task 1: Expose the new `meta` fields on `config`

**Files:**
- Modify: `src/types/index.ts` (`AuthorizerConfig` type ~line 4-25, `AuthorizerContextPropsType.config` ~line 41-62)
- Modify: `src/contexts/AuthorizerContext.tsx` (both default config object literals: the `createContext` default ~line 21-42, and `initialState.config` ~line 96-117)

**Interfaces:**
- Produces: `config.is_totp_mfa_enabled`, `config.is_email_otp_mfa_enabled`, `config.is_sms_otp_mfa_enabled`, `config.is_webauthn_enabled`, `config.is_mfa_enforced` (all `boolean`) — consumed by Task 3 (`AuthorizerMFASetup`'s `availableMfaMethods` derivation) and Task 4 (`AuthorizerPasskeyLogin`'s existing `is_mfa_enforced` gating, if any is added there).

**Context**: `AuthorizerContext.tsx`'s `getToken()` (~line 161-224) already spreads the full `getMetaData()` response into `config` at runtime (`config: { ...state.config, ...metaRes }`) — the runtime object already carries these fields (authorizer-js's `Meta` interface has them today). Only the TypeScript type declarations are missing, which is why no component can reference `config.is_totp_mfa_enabled` etc. without a compile error today.

- [ ] **Step 1: Extend `AuthorizerConfig` in `src/types/index.ts`**

Find (ends at `is_phone_verification_enabled: boolean;` followed by `};`):
```typescript
export type AuthorizerConfig = {
  authorizerURL: string;
  redirectURL: string;
  client_id: string;
  is_google_login_enabled: boolean;
  is_github_login_enabled: boolean;
  is_facebook_login_enabled: boolean;
  is_linkedin_login_enabled: boolean;
  is_apple_login_enabled: boolean;
  is_twitter_login_enabled: boolean;
  is_microsoft_login_enabled: boolean;
  is_twitch_login_enabled: boolean;
  is_roblox_login_enabled: boolean;
  is_email_verification_enabled: boolean;
  is_basic_authentication_enabled: boolean;
  is_magic_link_login_enabled: boolean;
  is_sign_up_enabled: boolean;
  is_strong_password_enabled: boolean;
  is_multi_factor_auth_enabled: boolean;
  is_mobile_basic_authentication_enabled: boolean;
  is_phone_verification_enabled: boolean;
};
```
Replace the closing 4 lines with:
```typescript
  is_mobile_basic_authentication_enabled: boolean;
  is_phone_verification_enabled: boolean;
  is_totp_mfa_enabled: boolean;
  is_email_otp_mfa_enabled: boolean;
  is_sms_otp_mfa_enabled: boolean;
  is_webauthn_enabled: boolean;
  is_mfa_enforced: boolean;
};
```

- [ ] **Step 2: Apply the identical addition to `AuthorizerContextPropsType.config` in the same file**

Same 5 lines, same position (after `is_phone_verification_enabled: boolean;`), inside the `config: { ... }` block of `AuthorizerContextPropsType` (~line 41-62).

- [ ] **Step 3: Add matching default values to both config literals in `src/contexts/AuthorizerContext.tsx`**

In the `createContext` default (~line 21-42) and in `initialState.config` (~line 96-117), both currently end with `is_phone_verification_enabled: false,`. Add after it, in BOTH places:
```typescript
    is_totp_mfa_enabled: false,
    is_email_otp_mfa_enabled: false,
    is_sms_otp_mfa_enabled: false,
    is_webauthn_enabled: false,
    is_mfa_enforced: false,
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: PASS, no errors.

- [ ] **Step 5: Commit**

```bash
git add src/types/index.ts src/contexts/AuthorizerContext.tsx
git commit -m "feat(mfa): expose is_totp/email_otp/sms_otp/webauthn_mfa_enabled + is_mfa_enforced on config"
```

---

## Task 2: Shared `AuthResponse` triage helper

**Files:**
- Create: `src/utils/mfaTriage.ts`

**Interfaces:**
- Consumes: `Types.AuthResponse`, `Types.AuthorizerSDKError` from `@authorizerdev/authorizer-js` (already linked, verified: `AuthResponse` has `message, should_show_email_otp_screen, should_show_mobile_otp_screen, should_show_totp_screen, should_offer_webauthn_mfa_verify, should_offer_webauthn_mfa_setup, should_offer_email_otp_mfa_setup, should_offer_sms_otp_mfa_setup, access_token, id_token, refresh_token, expires_in, user, authenticator_scanner_image, authenticator_secret, authenticator_recovery_codes` — all boolean/string fields except `message` are `| null`; `AuthorizerSDKError` has `message: string` and `code?: string`).
- Produces: `AuthStep` type and `resolveAuthStep(res: Types.AuthResponse | undefined, errors: Types.AuthorizerSDKError[]) => AuthStep` — consumed by Task 4 (login/signup/passkey-login components) and Task 5 (OAuth redirect handling in `AuthorizerRoot`).

- [ ] **Step 1: Create `src/utils/mfaTriage.ts`**

```typescript
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
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: PASS, no errors.

- [ ] **Step 3: Commit**

```bash
git add src/utils/mfaTriage.ts
git commit -m "feat(mfa): add shared AuthResponse triage helper"
```

(No manual UI test for this task in isolation — it's a pure function with no rendering; it's exercised end-to-end by Task 4's manual test procedures.)

---

## Task 3: `AuthorizerMFASetup` login mode

**Files:**
- Modify: `src/components/AuthorizerMFASetup.tsx` (entire file — new props, new Skip UI, real email/SMS OTP wiring)

**Interfaces:**
- Consumes: `Types.SkipMfaSetupRequest`, `Types.OtpMfaSetupRequest` from `@authorizerdev/authorizer-js`; `TotpEnrollment` from `src/utils/mfaTriage.ts` (Task 2; identical shape to this file's own pre-existing local `TotpEnrollment` type — replace the local one with the shared import to avoid duplication).
- Produces: new `loginContext` prop — consumed by Task 4.

**Context**: This component already exists and is fully built for the settings-screen (logged-in, bearer-token) case. This task adds an opt-in "login mode" without breaking that existing usage — when `loginContext` is omitted, behavior is unchanged byte-for-byte.

- [ ] **Step 1: Add the `loginContext` prop and Skip handler**

Replace the component's prop type and destructuring (currently ~line 58-74):
```typescript
export const AuthorizerMFASetup: FC<{
  availableMfaMethods: AvailableMfaMethods;
  totpEnrollment?: TotpEnrollment;
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
```

Remove this file's own local `TotpEnrollment` type (currently ~line 48-52):
```typescript
type TotpEnrollment = {
  authenticator_scanner_image: string;
  authenticator_secret: string;
  authenticator_recovery_codes: string[];
};
```
Replace it with an import from the shared util (added in Task 2) — `src/utils/mfaTriage.ts` only imports from `@authorizerdev/authorizer-js`, never from any component, so importing it here creates no cycle:
```typescript
import { TotpEnrollment } from '../utils/mfaTriage';
```

Also add this new type above the component (there is no existing local type to place it near — it's new):
```typescript
type AuthTokenLike = { access_token?: string | null; [key: string]: any };
```

- [ ] **Step 2: Add the Skip action UI and handler**

Add state near the existing `useState` calls (~line 75-76):
```typescript
  const [skipping, setSkipping] = useState(false);
  const [skipError, setSkipError] = useState('');
```

Add the handler (place it near `handleSetup`, ~line 124):
```typescript
  const { authorizerRef } = useAuthorizer();

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
```
Add the `useAuthorizer` import at the top of the file:
```typescript
import { useAuthorizer } from '../contexts/AuthorizerContext';
```

Render the Skip button and any `skipError` in the main return block (the one that renders `visibleMethods`, ~line 172-217) — add right after the closing `)}` of the `visibleMethods.length === 0 ? ... : (...)` conditional, still inside the outer `<>...</>`:
```typescript
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
```

- [ ] **Step 3: Wire login-mode completion into the existing TOTP and passkey enrollment branches**

Find the TOTP branch (~line 149-160):
```typescript
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
```
Replace with:
```typescript
  if (selected === 'totp' && totpEnrollment) {
    return (
      <>
        <BackLink onClick={backToList} />
        <AuthorizerTOTPScanner
          {...totpEnrollment}
          email={loginContext?.email}
          phone_number={loginContext?.phone_number}
          setView={() => setSelected(null)}
          onLogin={(data) => {
            if (loginContext && data && (data as AuthTokenLike).access_token) {
              loginContext.onComplete(data as AuthTokenLike);
              return;
            }
            setSelected(null);
          }}
        />
      </>
    );
  }
```
(`AuthorizerTOTPScanner`'s existing `email`/`phone_number`/`onLogin` props are used elsewhere in this codebase already — read `src/components/AuthorizerTOTPScanner.tsx` before this step to confirm its exact prop names/`onLogin` call signature match this usage; adapt only if they genuinely differ from what `AuthorizerBasicAuthLogin.tsx`'s existing usage of the same component shows.)

The passkey branch (~line 162-170) is UNCHANGED — per this plan's Global Constraint, passkey "Set up" is not offered when `loginContext` is present (Step 4 handles hiding it from the list entirely), so this branch is only ever reached in settings mode, where its existing behavior is already correct.

- [ ] **Step 4: Hide the passkey option when in login mode**

Find the `methods` array (~line 80-120), the `passkey` entry:
```typescript
    {
      key: 'passkey',
      available: !!availableMfaMethods.passkey,
      icon: <IconPasskey />,
      title: 'Passkey',
      description: 'Sign in with your fingerprint, face, or device PIN.',
      disabled: !passkeySupported,
      disabledReason: 'Not supported on this browser or device.',
    },
```
Change `available` to also require the absence of `loginContext`:
```typescript
    {
      key: 'passkey',
      available: !!availableMfaMethods.passkey && !loginContext,
      icon: <IconPasskey />,
      title: 'Passkey',
      description: 'Sign in with your fingerprint, face, or device PIN.',
      disabled: !passkeySupported,
      disabledReason: 'Not supported on this browser or device.',
    },
```

- [ ] **Step 5: Real default wiring for email/SMS OTP setup**

Find `handleSetup` (~line 124-145):
```typescript
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
```
Replace with:
```typescript
  const handleSetup = async (method: MfaMethod) => {
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
```

Add the new state alongside the ones from Step 2:
```typescript
  const [sendingOtpSetup, setSendingOtpSetup] = useState(false);
  const [otpSetupError, setOtpSetupError] = useState('');
  const [otpMethodPending, setOtpMethodPending] = useState<
    'email_otp' | 'sms_otp' | null
  >(null);
```

Add a new render branch, placed alongside the existing `selected === 'totp'`/`selected === 'passkey'` early-return branches (~after line 170, before the main return):
```typescript
  if (otpMethodPending) {
    return (
      <>
        <BackLink onClick={() => setOtpMethodPending(null)} />
        <AuthorizerVerifyOtp
          email={loginContext?.email}
          phone_number={loginContext?.phone_number}
          is_totp={false}
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
```
Add the import:
```typescript
import { AuthorizerVerifyOtp } from './AuthorizerVerifyOtp';
```
(`AuthorizerVerifyOtp` calls `verifyOtp` internally, which — per Task 6 of the authorizer backend plan — marks the pending unverified Authenticator row `VerifiedAt` and, in the withheld-token state, mints the token via the MFA session cookie. No changes needed to `AuthorizerVerifyOtp.tsx` itself for this to work correctly, since it's driven purely by the cookie the browser already holds, not by anything this component passes explicitly beyond `email`/`phone_number` to identify the pending user — same mechanism `skip_mfa_setup`/`lock_mfa` already rely on.)

Render `otpSetupError`/`sendingOtpSetup` feedback: add near the top of the main return block's JSX, alongside the existing `notice` message (~line 175-181):
```typescript
      {otpSetupError && (
        <Message
          type={MessageType.Error}
          text={otpSetupError}
          onClose={() => setOtpSetupError('')}
        />
      )}
```
And disable the relevant "Set up" button while `sendingOtpSetup` — find the `StyledButton` inside the `visibleMethods.map` (~line 202-210) and add `disabled={m.disabled || sendingOtpSetup}`.

- [ ] **Step 6: Verify**

Run: `npx tsc --noEmit`
Expected: PASS, no errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/AuthorizerMFASetup.tsx
git commit -m "feat(mfa): add login mode (skip + email/SMS OTP wiring) to AuthorizerMFASetup"
```

(Manual test deferred to Task 4, where this component is actually reachable from the login flow.)

---

## Task 4: Wire the triage helper into login, signup, and passkey login; fix the null-token bug

**Files:**
- Modify: `src/components/AuthorizerBasicAuthLogin.tsx` (login response handling)
- Modify: `src/components/AuthorizerPasskeyLogin.tsx` (fixes the null-token bug)
- Modify: `src/components/AuthorizerSignup.tsx` (signup response handling — read the full file first; it wasn't included in this brief's research, mirror whatever pattern `AuthorizerBasicAuthLogin.tsx` used before this task for its own signup call, adapting to this task's new triage-based approach)

**Interfaces:**
- Consumes: `resolveAuthStep` (Task 2), `AuthorizerMFASetup` with `loginContext` (Task 3).

- [ ] **Step 1: Replace `AuthorizerBasicAuthLogin`'s response handling**

Find the entire block from `const { data: res, errors } = await authorizerRef.login(data);` through `if (onLogin) { onLogin(res); }` (~line 96-146):
```typescript
      const { data: res, errors } = await authorizerRef.login(data);
      if (errors && errors.length) {
        setError(errors[0].message);
        return;
      }
      // if totp is enabled for the first time show totp screen with scanner
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
      if (
        res &&
        (res?.should_show_email_otp_screen ||
          res?.should_show_mobile_otp_screen ||
          res?.should_show_totp_screen)
      ) {
        setOtpData({
          is_screen_visible: true,
          email: data.email || ``,
          phone_number: data.phone_number || ``,
          is_totp: res?.should_show_totp_screen || false,
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
```
Replace with:
```typescript
      const { data: res, errors } = await authorizerRef.login(data);
      const step = resolveAuthStep(res, errors || []);
      if (step.kind === 'error') {
        setError(step.message);
        return;
      }
      if (step.kind === 'locked') {
        setLocked(true);
        return;
      }
      if (step.kind === 'offer') {
        setMfaOfferData({
          is_screen_visible: true,
          email: data.email || ``,
          phone_number: data.phone_number || ``,
          totpEnrollment: step.totpEnrollment,
          emailOtp: step.emailOtp,
          smsOtp: step.smsOtp,
          state: urlProps?.state,
        });
        return;
      }
      if (step.kind === 'verify') {
        if (step.totp) {
          setOtpData({
            is_screen_visible: true,
            email: data.email || ``,
            phone_number: data.phone_number || ``,
            is_totp: true,
          });
          return;
        }
        if (step.email || step.mobile) {
          setOtpData({
            is_screen_visible: true,
            email: data.email || ``,
            phone_number: data.phone_number || ``,
            is_totp: false,
          });
          return;
        }
        // WebAuthn-verify-only case (should_offer_webauthn_mfa_verify with no
        // TOTP/email/mobile fallback offered) - this component has no passkey-
        // verify ceremony of its own; report the situation via the existing
        // error banner rather than silently doing nothing.
        setError(
          'This account requires passkey verification. Use "Sign in with a passkey" instead.',
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
```

Add the import:
```typescript
import { resolveAuthStep } from '../utils/mfaTriage';
```

- [ ] **Step 2: Replace the `otpData`/`totpData` state with a unified `mfaOfferData` state and a `locked` flag**

Replace (~line 16-29):
```typescript
const initOtpData: OtpDataType = {
  is_screen_visible: false,
  email: '',
  phone_number: '',
};

const initTotpData: TotpDataType = {
  is_screen_visible: false,
  email: '',
  phone_number: '',
  authenticator_scanner_image: '',
  authenticator_secret: '',
  authenticator_recovery_codes: [],
};
```
with:
```typescript
const initOtpData: OtpDataType = {
  is_screen_visible: false,
  email: '',
  phone_number: '',
};

type MfaOfferData = {
  is_screen_visible: boolean;
  email: string;
  phone_number: string;
  totpEnrollment: TotpEnrollment | null;
  emailOtp: boolean;
  smsOtp: boolean;
  state?: string;
};

const initMfaOfferData: MfaOfferData = {
  is_screen_visible: false,
  email: '',
  phone_number: '',
  totpEnrollment: null,
  emailOtp: false,
  smsOtp: false,
};
```
Remove the `TotpDataType` import (no longer used in this file) and add:
```typescript
import { resolveAuthStep, TotpEnrollment } from '../utils/mfaTriage';
```
(keep the existing `OtpDataType` import from `'../types'`).

Replace the `totpData` state declaration (~line 45) with:
```typescript
  const [mfaOfferData, setMfaOfferData] = useState<MfaOfferData>({
    ...initMfaOfferData,
  });
  const [locked, setLocked] = useState(false);
```
(remove the old `const [totpData, setTotpData] = useState<TotpDataType>({ ...initTotpData });` line — it's fully superseded).

- [ ] **Step 3: Render the offer screen and locked screen**

Find the existing early-return render block (~line 232-263):
```typescript
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

  if (otpData.is_screen_visible) {
    return (
      <AuthorizerVerifyOtp
        {...{
          setView,
          onLogin,
          email: otpData.email || ``,
          phone_number: otpData.phone_number || ``,
          is_totp: otpData.is_totp || false,
        }}
        urlProps={urlProps}
      />
    );
  }
```
Replace with:
```typescript
  if (locked) {
    return <AuthorizerMfaLocked />;
  }

  if (mfaOfferData.is_screen_visible) {
    return (
      <AuthorizerMFASetup
        availableMfaMethods={{
          totp: !!mfaOfferData.totpEnrollment || config.is_totp_mfa_enabled,
          passkey: false,
          emailOtp: mfaOfferData.emailOtp,
          smsOtp: mfaOfferData.smsOtp,
        }}
        totpEnrollment={mfaOfferData.totpEnrollment || undefined}
        heading="Set up multi-factor authentication"
        loginContext={{
          email: mfaOfferData.email,
          phone_number: mfaOfferData.phone_number,
          state: mfaOfferData.state,
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

  if (otpData.is_screen_visible) {
    return (
      <AuthorizerVerifyOtp
        {...{
          setView,
          onLogin,
          email: otpData.email || ``,
          phone_number: otpData.phone_number || ``,
          is_totp: otpData.is_totp || false,
        }}
        urlProps={urlProps}
      />
    );
  }
```
Add imports:
```typescript
import { AuthorizerMFASetup } from './AuthorizerMFASetup';
import { AuthorizerMfaLocked } from './AuthorizerMfaLocked';
```
Remove the now-unused `AuthorizerTOTPScanner` import from this file if nothing else in it references `AuthorizerTOTPScanner` directly (check before removing — `AuthorizerMFASetup` uses its own internally, this file no longer needs a direct reference).

`availableMfaMethods.totp` uses `!!mfaOfferData.totpEnrollment || config.is_totp_mfa_enabled` because the `offer` step only includes `totpEnrollment` when TOTP is actually available server-side (per `resolveAuthStep`'s construction in Task 2) — this is a belt-and-suspenders match against `config.is_totp_mfa_enabled` (Task 1) for consistency with how the other three methods are driven, but `totpEnrollment` presence is the authoritative signal for whether TOTP is actually selectable here.

- [ ] **Step 4: Fix `AuthorizerPasskeyLogin`'s null-token bug**

Find (~line 86-115):
```typescript
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
```
Replace with:
```typescript
  const [mfaStep, setMfaStep] = useState<AuthStep | null>(null);

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
```
Add imports:
```typescript
import { resolveAuthStep, AuthStep } from '../utils/mfaTriage';
```

Add rendering for `mfaStep` before the component's main `return` (~line 119):
```typescript
  if (mfaStep?.kind === 'locked') {
    return <AuthorizerMfaLocked />;
  }
  if (mfaStep?.kind === 'offer') {
    return (
      <AuthorizerMFASetup
        availableMfaMethods={{
          totp: !!mfaStep.totpEnrollment || config.is_totp_mfa_enabled,
          passkey: false,
          emailOtp: mfaStep.emailOtp,
          smsOtp: mfaStep.smsOtp,
        }}
        totpEnrollment={mfaStep.totpEnrollment || undefined}
        heading="Set up multi-factor authentication"
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
    // email/phone_number in hand (usernameless login) - the existing
    // AuthorizerVerifyOtp component requires one of those to identify the
    // pending user via the MFA session cookie, so TOTP/email/SMS verify
    // can't be completed from here. This is a real, narrower gap than the
    // password-login path (which always has an email/phone from the form) -
    // report it plainly rather than rendering a broken form.
    return (
      <Message
        type={MessageType.Error}
        text="Additional verification is required. Please sign in with your password instead to continue."
      />
    );
  }
```
Add the `AuthorizerMFASetup`/`AuthorizerMfaLocked` imports:
```typescript
import { AuthorizerMFASetup } from './AuthorizerMFASetup';
import { AuthorizerMfaLocked } from './AuthorizerMfaLocked';
```

- [ ] **Step 5: Read and update `AuthorizerSignup.tsx`**

Read the full file first (it wasn't part of this plan's research). Find its `authorizerRef.signup(...)` call and whatever response handling follows it. Apply the same triage pattern as Step 1 (`resolveAuthStep`, then branch on `step.kind` exactly as in `AuthorizerBasicAuthLogin.tsx`), reusing the same `mfaOfferData`/`locked` state shape and the same `AuthorizerMFASetup`/`AuthorizerMfaLocked` rendering added in Steps 2-3. Do not invent a different pattern — mirror Steps 1-3 exactly, adapted only for whatever field names `AuthorizerSignup.tsx`'s local state currently uses for its own email/phone/otp tracking.

- [ ] **Step 6: Verify**

Run: `npx tsc --noEmit`
Expected: PASS, no errors. (Task 5 creates `AuthorizerMfaLocked` — if this task is executed before Task 5 in a different order, this step will fail on the missing import; execute Task 5 first if reordering, or accept this task will not compile standalone until Task 5 lands. As numbered, Task 5 follows this task in the plan's sequence — but `AuthorizerMfaLocked` has no dependency on Tasks 1-4, so an implementer MAY do Task 5's `AuthorizerMfaLocked` component creation first if that ordering is more convenient; note this explicitly rather than treat the numeric order as rigid.)

- [ ] **Step 7: Manual test — first-time MFA offer (TOTP)**

Prerequisite: backend running on `localhost:8080` with `--disable-webauthn-mfa` NOT set and MFA available (default config already running, confirmed earlier).
1. Open `http://localhost:5174` in a browser with no existing session (private/incognito window).
2. Sign up a brand-new account (email + password) via the example app's signup form.
3. Expected: after signup, the multi-method picker (`AuthorizerMFASetup`) renders with "Authenticator app", "Email one-time code" (if `EnableEmailOTP`+SMTP configured on the backend - likely NOT visible with default backend config, that's correct), and a "Skip for now" button. No passkey tile.
4. Click "Set up" on "Authenticator app" — a QR code and secret should render (via the existing `AuthorizerTOTPScanner`).
5. Scan it with any TOTP app (or use the secret to generate a code manually), submit the 6-digit code.
6. Expected: the app transitions to the logged-in dashboard view — confirms `onComplete` correctly received a real token and `setAuthData` fired.

- [ ] **Step 8: Manual test — Skip**

1. Repeat steps 1-3 above with a second new account.
2. Click "Skip for now".
3. Expected: the app transitions directly to the logged-in dashboard — confirms `skipMfaSetup` was called and its returned token was used.
4. Log out, log back in with the same account/password.
5. Expected: logs in directly with no MFA offer screen (matches `HasSkippedMFASetupAt` being set — the backend's `mfaGateSkippedSetup` path).

- [ ] **Step 9: Manual test — `AuthorizerPasskeyLogin` no longer treats a withheld response as success**

1. Using an account created in Step 7 that has TOTP enrolled (not skipped), register a passkey for that account too (via the settings-screen `AuthorizerMFASetup`/`AuthorizerPasskeyRegister` flow — may require a small amount of manual GraphQL/dashboard interaction if no settings page is wired in the example app yet; if genuinely not reachable through the UI, register the passkey directly via a `webauthn_registration_options`/`_verify` GraphQL Playground call using that account's bearer token, then proceed).
3. Log out. On the login page, click "Sign in with a passkey" and complete the ceremony for that account.
4. Expected (this is the bug fix under test): since the account also has TOTP enrolled, the backend's gate returns `mfaGateBlockVerify` (withheld) for passkey-primary login — the UI must NOT show a logged-in dashboard with a blank/null user. It should show the `verify` branch's message ("Additional verification is required...") rather than silently completing. Confirm the browser's network tab shows `access_token: null` in the `webauthn_login_verify` response and that `setAuthData` was correctly NOT called (no dashboard transition).

- [ ] **Step 10: Commit**

```bash
git add src/components/AuthorizerBasicAuthLogin.tsx src/components/AuthorizerPasskeyLogin.tsx src/components/AuthorizerSignup.tsx
git commit -m "feat(mfa): wire triage helper into login/signup/passkey-login, fix null-token bug"
```

---

## Task 5: Locked-account screen

**Files:**
- Create: `src/components/AuthorizerMfaLocked.tsx`

**Interfaces:**
- Produces: `AuthorizerMfaLocked` component — consumed by Task 4.

- [ ] **Step 1: Create the component**

```typescript
import { FC } from 'react';
import '../styles/default.css';
import { MessageType } from '../constants';
import { Message } from './Message';

// Shown when the backend rejects a login/verify attempt because the
// account's MFA is permanently locked (schemas.User.MFALockedAt set, via
// the lock_mfa mutation) - distinct from the transient failed-attempt
// lockout AuthorizerVerifyOtp already handles (TOO_MANY_REQUESTS). Only an
// admin can clear this (_update_user with reset_mfa: true), so there is no
// retry action here - matching the backend's own message, which already
// tells the user what to do.
export const AuthorizerMfaLocked: FC = () => (
  <Message
    type={MessageType.Error}
    text="Your account's multi-factor authentication is locked. Contact your administrator to regain access."
  />
);
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: PASS, no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/AuthorizerMfaLocked.tsx
git commit -m "feat(mfa): add locked-account screen"
```

(Manual test: exercised as part of Task 4's flow once a locked account exists — to produce one for testing, use the backend's `lock_mfa` mutation directly via GraphQL Playground with a valid MFA session cookie from an in-progress login, since there's no UI path to self-lock yet in this example app; confirms `AuthorizerMfaLocked` renders when `AuthorizerBasicAuthLogin`/`AuthorizerPasskeyLogin` receive a `FAILED_PRECONDITION` error containing the locked message.)

---

## Task 6: OAuth redirect `mfa_required` handling in `AuthorizerRoot`

**Files:**
- Modify: `src/components/AuthorizerRoot.tsx`

**Interfaces:**
- Consumes: `parseMfaRedirectParams` from `@authorizerdev/authorizer-js` (already linked; verified export exists: `parseMfaRedirectParams(url: string | URL): { mfaRequired: true; mfaMethods: string[] } | null`), `AuthorizerMFASetup`/`AuthorizerMfaLocked` (Tasks 3/5).

**Context**: `AuthorizerRoot.tsx` already parses `window.location.search` for `state`/`scope`/`redirect_uri` on every render (~line 37-59) — the OAuth callback lands on this same component (the example app's `login.tsx` renders `<Authorizer />` at `/`, which is the configured `redirectURL`, confirmed: no separate OAuth-callback page exists in `example/`). This task adds `mfa_required` detection alongside that existing parsing.

- [ ] **Step 1: Detect `mfa_required` on render**

Find (~line 36-40):
```typescript
  const { config, configLoadError } = useAuthorizer();
  const searchParams = new URLSearchParams(
    hasWindow() ? window.location.search : ``
  );
  const state = searchParams.get('state') || createRandomString();
```
Add immediately after (still before `const scope = ...`):
```typescript
  const mfaRedirect = hasWindow()
    ? parseMfaRedirectParams(window.location.href)
    : null;
```
Add the import:
```typescript
import { parseMfaRedirectParams } from '@authorizerdev/authorizer-js';
```

- [ ] **Step 2: Render the MFA flow instead of the normal login view when present**

Find the component's main return statement's opening (~line 62-70):
```typescript
  return (
    <StyledWrapper>
      {configLoadError && (
        <Message
          type={MessageType.Error}
          text={`Unable to reach the Authorizer server (${configLoadError}). Login methods that depend on it - such as basic auth, signup, and social login - won't appear until it's reachable.`}
        />
      )}
      {view === Views.Login && (
```
Insert a new branch immediately after the `configLoadError` block, before `{view === Views.Login && (`:
```typescript
      {mfaRedirect && (
        <AuthorizerMFASetup
          availableMfaMethods={{
            totp: mfaRedirect.mfaMethods.includes('totp'),
            passkey: false,
            emailOtp: mfaRedirect.mfaMethods.includes('email_otp'),
            smsOtp: mfaRedirect.mfaMethods.includes('sms_otp'),
          }}
          heading="Set up multi-factor authentication"
          loginContext={{
            onComplete: (data: any) => {
              if (onLogin) {
                onLogin(data);
              }
            },
          }}
        />
      )}
      {!mfaRedirect && view === Views.Login && (
```
(The remaining `{view === Views.Signup && ...}`, `{view === Views.Login && config.is_magic_link_login_enabled && ...}`, and `{view === Views.ForgotPassword && ...}` blocks are unchanged — they're already correctly conditioned on `view`, which stays `Views.Login` throughout since nothing sets it otherwise on an OAuth redirect. `mfaRedirect` being present short-circuits before any of them render meaningfully, but leaving their conditions as-is is simpler and safer than threading a new "hide everything else" flag through each one individually.)

Note: this task doesn't have an `AuthorizerMFASetup`-reachable `email`/`phone_number` for `loginContext` (`mfa_required` redirects don't carry them in the URL — the MFA session cookie alone identifies the pending user for `skip_mfa_setup`/OTP setup in this flow, same as the passkey-login `verify` case in Task 4 Step 4 had no email/phone available). `skipMfaSetup`/`emailOtpMfaSetup`/`smsOtpMfaSetup` all accept an OMITTED `email`/`phone_number` and still work via the bearer-token-absent, cookie-only path IF the backend can resolve the user from the cookie alone — **verify this against the actual backend code before assuming it**: `internal/service/skip_mfa_setup.go`/`otp_mfa_setup.go` currently REQUIRE `email` or `phone_number` to look up the user (the MFA session store is keyed by `(userID, sessionToken)`, not reverse-lookupable from the token alone) per this session's earlier backend research. This means the OAuth-redirect MFA flow, AS SPECIFIED, cannot actually complete skip/setup without an email/phone_number the redirect doesn't carry. **This is a real gap this task's implementer must escalate rather than silently ship a broken flow** — report status `NEEDS_CONTEXT` if this is confirmed still true against the live backend, rather than completing Step 2 with a `loginContext` that will fail every real call. A minimal fix within this task's scope (once confirmed necessary): extend `oauth_mfa_gate.go`'s redirect query params to also carry the resolved user's `email` (already available server-side at that point — `oauth_callback.go` has the resolved `user` object right there) and have this component's `mfaRedirect` parsing pick it up; this is a small, targeted backend change, not the full scope this plan avoided pulling in for passkey registration - flag it as a decision point rather than either silently building broken UI or unilaterally expanding scope back into the backend.

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: PASS, no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/AuthorizerRoot.tsx
git commit -m "feat(mfa): detect mfa_required OAuth redirect param in AuthorizerRoot"
```

(Manual test: requires a configured OAuth provider (Google/GitHub client ID+secret) on the backend to exercise end-to-end — if none is configured in this environment, this task's implementer should note that in their report as an untested-but-implemented path, consistent with how the backend plan handled the same limitation for its own OAuth gate work, rather than block on setting up a real OAuth app registration.)

---

## Final Step: Full verification

- [ ] Run `npx tsc --noEmit` once more across the whole package.
- [ ] Grep for `should_offer_mfa_setup` (the deprecated, unqualified field — distinct from the new qualified ones) across `src/` — confirm zero hits.
- [ ] Confirm `git log --oneline` shows the expected commits since branching from `main`.
- [ ] Re-run Task 4's manual test procedures once more end-to-end after all tasks land, since Tasks 5/6 touch files Task 4's tests exercise.
