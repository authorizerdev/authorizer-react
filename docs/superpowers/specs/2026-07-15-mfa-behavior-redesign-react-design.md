# authorizer-react: MFA Behavior Redesign UI — Design

## Status

Closes the gap discovered during manual testing: the component library has
zero wiring for the withheld-token MFA contract shipped in authorizer#686
and authorizer-js#46 (merged into this session's work). Login/signup/passkey
responses that carry `should_offer_*`/`should_show_totp_screen` flags with
no `access_token` currently render nothing, or — worse, in
`AuthorizerPasskeyLogin` — get treated as a successful login with a null
token. This is a real defect, not unfinished polish.

Supersedes authorizer-react PR #61 (closed as superseded earlier this
session — built against the pre-#686 "issue token immediately, offer setup
after" contract).

## What already exists and is being reused, not rebuilt

- **`AuthorizerMFASetup.tsx`** — a complete multi-method picker UI
  (TOTP/passkey/email-OTP/SMS-OTP), built in an earlier PR with the explicit
  stated intent of mapping onto exactly this kind of server-driven
  `should_offer_*` flag set. It has no Skip action and is never invoked from
  the login flow today — both close gaps, not a rewrite.
- **`AuthorizerVerifyOtp.tsx`** — the code-entry screen for TOTP/email/SMS
  OTP verification, including existing lockout UI (from the older
  failed-attempt lockout feature, PR #53 — distinct from the new permanent
  `MFALockedAt` lockout this spec adds a screen for).
- **`AuthorizerTOTPScanner.tsx`**, **`AuthorizerPasskeyRegister.tsx`** —
  existing enrollment-ceremony components, reused as-is.

## Root causes, precisely

1. `AuthorizerBasicAuthLogin.tsx`'s login handler (~line 96-152) only checks
   `should_show_totp_screen` (+ TOTP enrollment fields) and the old
   `should_show_email_otp_screen`/`should_show_mobile_otp_screen` flags. No
   reference anywhere to `should_offer_webauthn_mfa_setup`,
   `should_offer_email_otp_mfa_setup`, `should_offer_sms_otp_mfa_setup`, or
   `should_offer_webauthn_mfa_verify`.
2. `AuthorizerPasskeyLogin.tsx`'s `onClick` (~line 86-115) unconditionally
   calls `setAuthData` whenever `res` is truthy, without checking whether
   `res.access_token` is actually present — a withheld-token response is
   silently treated as a successful login with a null token.
3. `skipMfaSetup`/`lockMfa`/`emailOtpMfaSetup`/`smsOtpMfaSetup` (the 4 new
   SDK methods from authorizer-js#46) are referenced nowhere in this
   package.
4. No locked-account UI exists for the new permanent `MFALockedAt` case
   (distinct from the existing transient failed-attempt lockout UI).
5. No component wires `parseMfaRedirectParams` for the OAuth
   `mfa_required=1` redirect case.
6. `example/` doesn't exercise any of the above, so none of it is
   end-to-end testable today.

## Design

### 1. Shared response-triage helper

One function, `resolveAuthResponseStep(res: Types.AuthResponse)`, used by
every entry point that can receive a withheld-token response (login,
signup, passkey login, OAuth redirect). Returns a discriminated union:

```typescript
type AuthStep =
  | { kind: 'complete'; response: Types.AuthResponse } // access_token present
  | { kind: 'verify'; totp: boolean; webauthn: boolean; email: boolean; mobile: boolean }
  | { kind: 'offer'; totp: TotpEnrollment | null; webauthn: boolean; email: boolean; sms: boolean }
  | { kind: 'locked' };
```

`'locked'` is inferred from the login/verify call's *error* (the backend
returns a `FailedPrecondition` error for a locked account, not a flag on a
successful `AuthResponse` — there is no `should_show_locked_screen` field,
confirmed against the backend contract), not from response fields — the
triage helper's actual signature takes the `{ data, errors }` shape every
SDK call already returns, and the `'locked'` case is detected from the
error message/kind, not `res`.

Every call site (`AuthorizerBasicAuthLogin`, `AuthorizerSignup`,
`AuthorizerPasskeyLogin`, the new OAuth-redirect handler) calls this once
right after its SDK call, then renders based on the returned `AuthStep`
instead of hand-rolling its own flag checks. This directly fixes root cause
2 (`AuthorizerPasskeyLogin` can no longer skip the access-token check) as a
side effect of using the shared helper instead of ad hoc `if (res)`.

### 2. `AuthorizerMFASetup` gains a "login mode"

New optional prop, e.g. `loginContext?: { email?: string; phone_number?: string; state?: string; onComplete: (res: Types.AuthResponse) => void }`.
When present:
- A "Skip for now" action appears (absent in the existing settings-screen
  usage, which has no `loginContext`).
- Skip calls the real `skipMfaSetup({ email, phone_number, state })` and,
  on success, calls `onComplete` with the returned (now-populated)
  `AuthResponse` — same completion path `AuthorizerBasicAuthLogin` already
  uses for a normal successful login.
- Completing a method (TOTP scan+verify, passkey registration, email/SMS
  OTP send+verify) also calls `onComplete` once the corresponding
  `verify_otp`/`webauthn_registration_verify` call returns a token — these
  ceremonies already exist (`AuthorizerTOTPScanner`,
  `AuthorizerPasskeyRegister`); this spec doesn't change their internals, only
  makes sure the login-mode wrapper wires their result into `onComplete`.
- When `loginContext` is absent (existing settings-screen usage): unchanged
  behavior, no Skip button, no `onComplete` callback — a signed-in user
  enrolling a second factor from account settings, not from the login gate.

### 3. Real default wiring for email/SMS OTP setup

`AuthorizerMFASetup`'s `onSetupMethod` currently only *delegates* to the
host app for `email_otp`/`sms_otp` (per its own doc comment — "email- and
SMS-OTP are... delegated to the host") since those SDK methods didn't exist
yet when it was built. They exist now
(`emailOtpMfaSetup`/`smsOtpMfaSetup`). Add a real internal
implementation — selecting email/SMS OTP triggers the send-code call
directly, then renders `AuthorizerVerifyOtp` (already built, reused as-is)
for the code-entry step. `onSetupMethod` stays as an *override* escape
hatch for a host that wants custom behavior, but the package now works
correctly with zero host-side wiring required, closing the exact gap this
session's manual testing hit.

### 4. Locked-account screen

New, small component: shows the backend's own error message ("contact your
administrator to regain access") with no retry action — matches the
existing session's established pattern (`login.go`/`webauthn.go`/etc. all
already produce a clear, complete message; the UI's only job is to display
it distinctly from a generic error banner, not invent new copy).

### 5. OAuth redirect handling

New: whatever page/component in `example/` handles the OAuth callback
redirect calls `parseMfaRedirectParams(window.location.href)`. If non-null,
route into the same `AuthorizerMFASetup`/`AuthorizerVerifyOtp` flow the
password-login path uses (same triage helper, same components) rather than
assuming a token is present. This is example-app wiring plus, if needed, a
small exported helper in the library itself for a host app to reuse (follow
whatever pattern `AuthorizerRoot`/`AuthorizerContext` already establish for
similar cross-cutting concerns — decided at plan time by reading those
files, not speculated here).

### 6. `example/` app

Update the example to actually mount and exercise all of the above end to
end — this is what manual testing hit first, so it's explicitly in scope,
not an afterthought.

## Explicitly out of scope

- Self-service deletion of a single non-passkey MFA method (tracked
  separately, see the `mfa_self_service_method_deletion_gap` project
  memory).
- Any new visual design system, icon set, or styling beyond what
  `AuthorizerMFASetup`/`AuthorizerVerifyOtp` already establish.

## Testing

This package has no existing Jest/RTL unit-test suite for components (spot-
checked: none of `AuthorizerBasicAuthLogin.tsx`/`AuthorizerMFASetup.tsx`
have a corresponding `*.test.tsx` file) — manual testing via `example/` is
the established verification method for this repo, confirmed at plan time
before assuming otherwise. The plan's tasks each end with a concrete manual
test procedure against the real linked backend + SDK, not a fabricated unit
test suite this repo doesn't otherwise have.
