# Close the EnforceMFA Bypass via Passkey Primary Login — Design

**Status:** Approved, ready for implementation planning.

**Goal:** When an organization has `--enforce-mfa` on, a user cannot bypass password + MFA verification by using the pre-existing "Sign in with a passkey" (primary, passwordless) login button instead. Today they can: `WebauthnLoginVerify` issues a token unconditionally, with no `EnforceMFA` check at all.

**Relationship to prior work:** Found while manually testing `docs/superpowers/plans/2026-07-14-passkey-as-mfa.md`'s shipped feature. That plan deliberately scoped "passkey as a second factor" only, explicitly declining to touch passkey-as-primary-login's relationship to MFA (framed as "Direction B" during brainstorming and initially deferred). This spec is that deferred work, narrowed to close the specific bypass rather than resolve the broader "is a passkey itself AAL2-equivalent" question — it does not claim a passkey satisfies MFA; it makes passkey-only login *unavailable* when the org demands two factors.

**Two-part fix, both required:**
1. **Backend (the actual security boundary):** `WebauthnLoginVerify` refuses to issue a token unconditionally when `EnforceMFA=true` — it reuses the same TOTP-verify/enrollment machinery `login.go`'s password path already uses.
2. **Frontend (UX correctness, not a security control on its own):** `AuthorizerPasskeyLogin`'s primary button doesn't render at all when MFA is enforced — matching standard MFA UX (Okta/Auth0-style): authenticator methods surface only *after* a first factor has identified the user, never as a standalone bypass on the anonymous login screen. Hiding the button does **not** replace the backend fix — the GraphQL mutations remain directly callable regardless of what the UI shows.

## Backend design

**Gate condition:** `p.Config.EnforceMFA && refs.BoolValue(user.IsMultiFactorAuthEnabled)` — mirrors the exact precondition `login.go`'s TOTP branch and `resolveMFAGate` use, so a user for whom MFA isn't individually enabled is unaffected, consistent with today's password-login behavior.

**Inside the gate**, in `WebauthnLoginVerify`, after the existing revoked/email-verified checks and before the `issueAuthResponse` call:
- If TOTP login is disabled server-wide (`!p.Config.EnableTOTPLogin`): there is no enrollment-tracked second factor to pair with the passkey today (email/SMS OTP have no enrollment state — confirmed in the original plan's research). Refuse the passkey login outright with a clear, actionable error telling the user to sign in with their password instead. Do not silently fall through to email/SMS OTP.
- Else, check the user's TOTP authenticator (same `GetAuthenticatorDetailsByUserId` call `login.go` makes):
  - **Already verified:** set the MFA session cookie (same mechanism `login.go` uses) and respond with `should_show_totp_screen=true`, no token — the user must enter their TOTP code via the *existing* `verify_otp` mutation and `AuthorizerVerifyOtp` screen.
  - **Not yet enrolled:** set the MFA session cookie, generate a fresh TOTP secret/QR (same `generateTOTPEnrollment` helper `login.go` uses), and respond with `should_show_totp_screen=true` plus the enrollment payload, no token.
- If the gate condition is false (`EnforceMFA=false`, or this specific user doesn't have MFA individually enabled): **completely unchanged** — passkey login issues a token directly, exactly as it does today. The fast, one-tap passkey convenience stays intact for the common case; only the org-enforced-and-applicable-to-this-user case changes.

**Refactor needed to support this cleanly:** `login.go`'s `setOTPMFaSession` is currently a closure local to `Login()`, capturing `user`/`meta`/`side`. Extract it into a shared provider method (e.g. `p.setMFASession(meta RequestMetadata, side *ResponseSideEffects, userID string, expiresAt int64) error`) so both `Login` and `WebauthnLoginVerify` can call it — pure mechanical extraction, no behavior change to the password path.

**New `Meta` field:** `is_mfa_enforced: Boolean!` (mirrors `p.Config.EnforceMFA`), added the same way `is_webauthn_enabled` etc. already are. This is what the frontend uses to decide whether to render the primary passkey button — it's the only new piece of server-exposed configuration this fix needs.

## Frontend design

**`AuthorizerPasskeyLogin.tsx`:** its existing early return (`if (!isWebauthnSupported()) return null;`) gains the new condition: also return `null` when `config.is_mfa_enforced` is true. No other component needs to change — `AuthorizerRoot.tsx` already renders this component unconditionally on the login view and lets it self-manage visibility (including its own trailing "OR" separator logic), so this is fully self-contained.

**Defense in depth in the same component's `onClick` handler:** today it treats any non-error `loginWithPasskey()` result as a successful login and calls `setAuthData`/`onLogin` unconditionally. Once the backend can return a tokenless `should_show_totp_screen` response (reachable only if this component's button somehow rendered despite `is_mfa_enforced` — e.g. a brief pre-config-load window — since the backend is authoritative regardless of the UI), the handler must not misinterpret that as a successful login. Guard on `res.access_token` before calling `setAuthData`/`onLogin`, matching the pattern `AuthorizerBasicAuthLogin` already uses. On a tokenless response, show a message directing the user to sign in with their password instead, rather than building out a full TOTP-verify flow inside this compact button component — the real, fully-built verify path is password login, which this state should never normally be reachable from.

## Deferred (explicitly out of scope)

- **The narrower case of a user who has personally enrolled TOTP but `EnforceMFA` is org-wide false.** Per the original passkey-as-MFA plan's constraint ("a user's own opted-in MFA is never skippable"), `resolveMFAGate` already blocks password login for such a user regardless of `EnforceMFA`. This fix does **not** extend that same guarantee to passkey-primary-login — a user who set up TOTP for themselves, in a non-enforced org, could still use "Sign in with a passkey" to skip their own TOTP. Closing this would mean gating on `resolveMFAGate`'s full decision (not just `EnforceMFA`), which also pulls in the offer/skip states that don't make sense for a primary-login button. Left for a future pass if it turns out to matter in practice.
- **Whether a passkey itself should count as AAL2/MFA-equivalent** (the NIST research question from earlier in this session) remains untouched — this fix does not make that determination either way; it only prevents passkey login from silently satisfying an org's explicit two-factor requirement.
