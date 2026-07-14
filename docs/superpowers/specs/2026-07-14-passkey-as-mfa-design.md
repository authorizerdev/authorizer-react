# Passkey as a Second MFA Factor — Design

**Status:** Approved, ready for implementation planning.

**Goal:** Let a user who already has a registered passkey use it to satisfy an MFA challenge — instead of, or alongside, TOTP — when logging in with email + password. Passkey continues to also work as today's separate passwordless *primary* login method; this plan does not touch that.

**Relationship to prior work:** This is the "Passkey-as-MFA" item explicitly deferred at the end of `docs/superpowers/plans/2026-07-13-optional-mfa-with-skip.md`, which shipped optional TOTP-based MFA with a skip action. That plan's `resolveMFAGate` decision function, `has_skipped_mfa_setup_at` field, and MFA-session-cookie mechanism are reused as-is here.

**Architecture, in one sentence:** almost everything needed already exists — `webauthn_login_options`(scoped by email) + `webauthn_login_verify` already run as an MFA-session-gated "prove your passkey" ceremony, and `AuthorizerMFASetup`'s Passkey tile already enrolls credentials post-login — so this plan is mostly *wiring the MFA gate to recognize a WebAuthn credential as a verified factor* and *exposing one new response flag* to tell the frontend which verify option(s) to render.

## Credential scoping decision

No "purpose" field on `WebauthnCredential`. Any registered passkey — whether the user registered it for passwordless primary login or explicitly for MFA — satisfies the passkey-MFA factor. This is deliberately simple because the passkey-primary-login feature itself is still pre-release (no installed base to break by changing its semantics). If that assumption stops holding after release, a `purpose` field can be added later without disturbing this plan's gate logic (`authenticatorVerified` would just become `hasWebauthnCredential(purpose=mfa)`).

## Backend (`authorizer` repo)

### Task: Broaden the MFA branch guard and wire WebAuthn into `resolveMFAGate`

**Files:**
- Modify: `internal/service/login.go` (the MFA branch — currently guarded by `isMFAEnabled && isTOTPLoginEnabled`, and the TOTP-specific `authenticatorVerified` computation)
- Modify: `internal/graph/schema.graphqls` (`AuthResponse` — new field)
- Modify: `internal/graph/model/models_gen.go` (regenerated)

**Changes:**

1. Guard: **unchanged** — stays `if isMFAEnabled && isTOTPLoginEnabled {`. `is_webauthn_enabled` in the GraphQL schema is hardcoded `true` (no operator toggle — see `schema.graphqls:44`'s comment), so it can't be used as a second `||` arm the way `isTOTPLoginEnabled` is: doing so would make this branch (and `mfaGateBlockEnroll`'s unconditional TOTP-secret generation, see below) fire even on servers where TOTP is deliberately disabled. Passkey-as-MFA in this plan is therefore scoped to *servers that already have TOTP MFA enabled* — it adds passkey as an alternative verify method within that existing umbrella, not a standalone way to turn MFA on. See "Deferred" for the TOTP-independent case.
2. `authenticatorVerified` computation: currently `authErr == nil && authenticator != nil && authenticator.VerifiedAt != nil` (TOTP only). Change to:
   ```go
   totpVerified := authErr == nil && authenticator != nil && authenticator.VerifiedAt != nil
   webauthnCreds, _ := p.StorageProvider.ListWebauthnCredentialsByUserID(ctx, user.ID)
   hasWebauthnCredential := len(webauthnCreds) > 0
   authenticatorVerified := totpVerified || hasWebauthnCredential
   ```
   (Ignore the WebAuthn list-credentials error rather than failing login on it — treat "couldn't check" as "no credential found," matching how a fresh/never-enrolled user is handled today. Same fail-open-to-"not verified" posture as a missing TOTP authenticator row.)
3. `resolveMFAGate` itself is unchanged — it already takes a single `authenticatorVerified` bool and doesn't care which factor produced it.
4. On the `mfaGateBlockVerify` case (today: unconditionally `ShouldShowTotpScreen: true`), branch by which factor(s) the user actually has, so a passkey-only user isn't forced through a TOTP screen they never set up, and a dual-enrolled user is offered a choice:
   ```go
   case mfaGateBlockVerify:
       expiresAt := time.Now().Add(3 * time.Minute).Unix()
       if err := setOTPMFaSession(expiresAt); err != nil { ... }
       res := &model.AuthResponse{Message: `Proceed to mfa verification`}
       if totpVerified {
           res.ShouldShowTotpScreen = refs.NewBoolRef(true)
       }
       if hasWebauthnCredential {
           res.ShouldOfferWebauthnMfaVerify = refs.NewBoolRef(true)
       }
       return res, side, nil
   ```
5. `mfaGateBlockEnroll` (org-*enforced*, first-time, no factor yet at all) is **unchanged** — stays TOTP-only. See "Deferred" below.
6. `mfaGateOfferSetup` / `mfaGateSkippedSetup` are **unchanged** — no code here even knows about WebAuthn, because enrollment for these two states happens later, post-token, through the already-shipped `AuthorizerMFASetup` hub.
7. New `AuthResponse` field, added the same way `should_show_totp_screen` was:
   ```graphql
   should_show_totp_screen: Boolean
   # should_offer_webauthn_mfa_verify is true when the user has a registered
   # passkey and MFA verification (not enrollment) is required at login. The
   # frontend should offer a "verify with your passkey" action in addition to
   # (or instead of) should_show_totp_screen's code-entry form.
   should_offer_webauthn_mfa_verify: Boolean
   ```

**Testing:** extend the existing TOTP branch's integration test coverage with cases for: a user who enrolled only a passkey (no verified TOTP) reaching `mfaGateBlockVerify` and getting only `should_offer_webauthn_mfa_verify`; a dual-enrolled user getting both flags; confirm a server with `isTOTPLoginEnabled=false` still skips this whole branch unchanged (guard untouched).

## SDK (`authorizer-js` repo)

### Task: Expose the new field

**Files:** `src/types.ts` (`AuthResponse` interface — add `should_offer_webauthn_mfa_verify: boolean | null;` next to `should_show_totp_screen`).

No new methods. `loginWithPasskey(email)` (already shipped, drives `webauthn_login_options` → browser ceremony → `webauthn_login_verify`) is reused verbatim for the verify step — passing the user's email is what makes the backend treat it as the scoped/MFA flow instead of a discoverable primary login.

## Frontend (`authorizer-react` repo)

### Task: Offer "verify with passkey" during MFA challenge

**Files:**
- `src/components/AuthorizerBasicAuthLogin.tsx` — the `res && !res.access_token` branch that currently checks `should_show_totp_screen`/`should_show_email_otp_screen`/`should_show_mobile_otp_screen` gains a check for `should_offer_webauthn_mfa_verify`, routing to `AuthorizerVerifyOtp` with a new prop (e.g. `offerWebauthnVerify`) instead of (or alongside) the existing OTP-screen routing.
- `src/components/AuthorizerVerifyOtp.tsx` — when `offerWebauthnVerify` is true, render a "Verify with your passkey" button above/alongside the code-entry form (hide the form entirely when the user has *only* a passkey and no TOTP, i.e. `should_show_totp_screen` was false). Clicking it calls `authorizerRef.loginWithPasskey(email)` directly and, on success, follows the exact same `setAuthData` + `onLogin(res)` path the form's `onSubmit` already uses.
- No changes needed to `AuthorizerMFASetup.tsx` (enrollment already works) or `AuthorizerPasskeyRegister.tsx`.

**Error handling:** a cancelled/failed passkey ceremony (`NotAllowedError`/`AbortError`, same as `AuthorizerPasskeyLogin`'s existing handling) should silently return the user to the code-entry form when one is available (dual-enrolled case), or show a dismissible message when it's the only option (passkey-only case) — never a raw browser exception.

**Testing:** one assert-based smoke check that `should_offer_webauthn_mfa_verify: true` on the login response results in the passkey verify affordance being offered (component-level), matching the existing pattern for `should_show_totp_screen`.

## Deferred (explicitly out of scope)

- **Passkey enrollment during org-*enforced* first-time MFA** (`mfaGateBlockEnroll`, no factor enrolled yet, no token issued yet). Today's `webauthn_registration_options`/`_verify` mutations require a real access token (`callerTokenData`), which doesn't exist at this point — only an MFA-session cookie does. Offering passkey here would need new MFA-session-gated (not bearer-token-gated) registration mutations, a materially bigger and higher-risk change (unauthenticated-but-scoped credential registration). TOTP remains the only forced-enrollment path until this is tackled as its own plan.
- **Blocking/warning when deleting your only remaining verified MFA factor** (e.g. `WebauthnDeleteCredential` leaving a user with zero verified factors while MFA is enabled for them). Not handled for TOTP today either; left as future work.
- **`AvailableMfaMethods.passkey` sourced from a real backend capability field** instead of a host-app-supplied prop. Pre-existing gap in `AuthorizerMFASetup`, orthogonal to this plan.
