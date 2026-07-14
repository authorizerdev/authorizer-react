# Passkey as a Second MFA Factor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A user who has registered a passkey can use it to satisfy an MFA challenge at login (email + password), as an alternative to entering a TOTP code, without changing today's separate passwordless-primary-login passkey flow.

**Architecture:** `resolveMFAGate`'s `authenticatorVerified` input becomes "TOTP verified OR has a registered WebAuthn credential." The already-shipped, MFA-session-cookie-gated "scoped" `webauthn_login_options(email)` + `webauthn_login_verify` mutations (`internal/service/webauthn.go`) do the actual verification — no new backend mutation is needed. One new `AuthResponse` boolean (`should_offer_webauthn_mfa_verify`) tells the frontend a passkey option exists; the frontend calls the already-shipped SDK method `authorizerRef.loginWithPasskey(email)` to complete it.

**Tech Stack:** Go 1.x / gqlgen / GORM (SQL auto-migrates; no new schema field in this plan, so no per-backend migration work) for `authorizer`; TypeScript for `authorizer-js`; React + TypeScript for `authorizer-react`.

**Spec:** `docs/superpowers/specs/2026-07-14-passkey-as-mfa-design.md`

## Global Constraints

- **Base branch is `feat/optional-mfa-setup`, not `main`, in all three repos.** This plan's `authenticatorVerified` computation reads `resolveMFAGate`, `HasSkippedMFASetupAt`, and the `mfaGateBlockVerify` case — none of which exist on `main` yet in any of the three repos as of this writing. Branch `feat/passkey-mfa` from the tip of each repo's `feat/optional-mfa-setup` work (worktree paths: `authorizer/.worktrees/feat/optional-mfa-setup`, `authorizer-js/.worktrees/feat/optional-mfa-setup`, `authorizer-react/.worktrees/feat/optional-mfa-setup`).
- **The MFA branch guard in `login.go` (`if isMFAEnabled && isTOTPLoginEnabled`) is NOT changed.** `is_webauthn_enabled` is a hardcoded-`true` GraphQL field, not an operator config toggle — OR-ing it into the guard would make `mfaGateBlockEnroll`'s unconditional TOTP-secret generation fire even on servers with TOTP disabled. Passkey-as-MFA in this plan only becomes available on servers that already have TOTP MFA enabled (`EnableMFA && EnableTOTPLogin`); it adds passkey as an alternative *verify* method within that existing umbrella.
- **No `purpose` field on `WebauthnCredential`.** Any registered passkey — however it was registered — satisfies the passkey-MFA factor. `authenticatorVerified` (passkey) = `len(ListWebauthnCredentialsByUserID(userID)) > 0`, full stop.
- **`mfaGateBlockEnroll` (org-enforced, zero factors enrolled yet) is untouched.** Passkey enrollment in that pre-token state needs new MFA-session-gated registration mutations (today's `webauthn_registration_options`/`_verify` require a real access token) — out of scope for this plan.
- **No new frontend test framework.** This repo's `"test"` script is `tsc --noEmit` — there is no Jest/RTL component-test setup. "Testing" for `authorizer-react` tasks means: library `tsc --noEmit`, library `npm run build`, and (where noted) the `example/` app's `tsc --noEmit`. Do not add a test runner as part of this plan.

---

## Backend (`authorizer` repo)

### Task 1: Wire WebAuthn credentials into the MFA gate's verify path

**Files:**
- Modify: `internal/graph/schema.graphqls:116-131` (`AuthResponse` type — new field)
- Modify: `internal/graph/model/models_gen.go` (regenerated)
- Modify: `internal/service/login.go:377-430` (the TOTP/MFA branch)
- Test: `internal/integration_tests/mfa_gate_login_test.go` (extend `TestLoginMFAGateTokenWithholding`)

**Interfaces:**
- Consumes: `resolveMFAGate` (unchanged signature, from the already-shipped `internal/service/mfa_gate.go`), `p.StorageProvider.ListWebauthnCredentialsByUserID(ctx, userID) ([]*schemas.WebauthnCredential, error)` (already shipped, `internal/storage/provider.go:254`).
- Produces: `model.AuthResponse.ShouldOfferWebauthnMfaVerify *bool` — true on the `mfaGateBlockVerify` response when the user has ≥1 registered WebAuthn credential. Consumed by `authorizer-js` Task 2 and `authorizer-react` Tasks 4-5.

- [ ] **Step 1: Add the field to the GraphQL schema**

Edit `internal/graph/schema.graphqls`, inside `type AuthResponse {` (line 116-131), add after `should_show_totp_screen: Boolean` (line 120):

```graphql
  should_show_totp_screen: Boolean
  # should_offer_webauthn_mfa_verify is true when the authenticated-with-
  # password user has a registered passkey and MFA verification (not
  # enrollment) is required before a token is issued. The frontend should
  # offer a "verify with your passkey" action — calling the existing scoped
  # webauthn_login_options(email)/webauthn_login_verify mutations — in
  # addition to (or instead of) should_show_totp_screen's code-entry form.
  should_offer_webauthn_mfa_verify: Boolean
```

Regenerate: `cd /Users/lakhansamani/projects/authorizer/authorizer && go run github.com/99designs/gqlgen --verbose generate && go mod tidy`

Confirm: `grep -n "ShouldOfferWebauthnMfaVerify" internal/graph/model/models_gen.go` — expect a `*bool` field with `should_offer_webauthn_mfa_verify,omitempty` json tag.

- [ ] **Step 2: Write the failing integration tests**

Edit `internal/integration_tests/mfa_gate_login_test.go`. Add a helper next to `addVerifiedAuthenticator` (after line 64):

```go
	// addWebauthnCredential gives the user a registered passkey, the
	// condition login.go reads (via ListWebauthnCredentialsByUserID) as an
	// alternative authenticatorVerified=true source alongside TOTP.
	addWebauthnCredential := func(t *testing.T, ts *testSetup, ctx context.Context, userID string) {
		t.Helper()
		_, err := ts.StorageProvider.AddWebauthnCredential(ctx, &schemas.WebauthnCredential{
			UserID:       userID,
			CredentialID: uuid.NewString(),
			PublicKey:    "dummy-public-key-for-gate-test",
		})
		require.NoError(t, err)
	}
```

Add two new subtests inside `TestLoginMFAGateTokenWithholding`, after the `"mfaGateBlockVerify withholds the token"` subtest (after line 84):

```go
	t.Run("mfaGateBlockVerify offers passkey verify for a passkey-only user", func(t *testing.T) {
		cfg := getTestConfig()
		cfg.EnableMFA = true
		cfg.EnableTOTPLogin = true
		ts := initTestSetup(t, cfg)
		_, ctx := createContext(ts)

		user := signUpUser(t, ts, ctx)
		user.IsMultiFactorAuthEnabled = refs.NewBoolRef(true)
		user, err := ts.StorageProvider.UpdateUser(ctx, user)
		require.NoError(t, err)
		addWebauthnCredential(t, ts, ctx, user.ID)
		// No TOTP authenticator enrolled — passkey is this user's only factor.

		res, err := ts.GraphQLProvider.Login(ctx, &model.LoginRequest{Email: user.Email, Password: password})
		require.NoError(t, err)
		require.NotNil(t, res)
		assert.Nil(t, res.AccessToken, "a user with a registered passkey must not receive a token before verifying it")
		assert.False(t, refs.BoolValue(res.ShouldShowTotpScreen), "must not force a TOTP screen on a user who never enrolled TOTP")
		assert.True(t, refs.BoolValue(res.ShouldOfferWebauthnMfaVerify))
	})

	t.Run("mfaGateBlockVerify offers both methods for a dual-enrolled user", func(t *testing.T) {
		cfg := getTestConfig()
		cfg.EnableMFA = true
		cfg.EnableTOTPLogin = true
		ts := initTestSetup(t, cfg)
		_, ctx := createContext(ts)

		user := signUpUser(t, ts, ctx)
		user.IsMultiFactorAuthEnabled = refs.NewBoolRef(true)
		user, err := ts.StorageProvider.UpdateUser(ctx, user)
		require.NoError(t, err)
		addVerifiedAuthenticator(t, ts, ctx, user.ID)
		addWebauthnCredential(t, ts, ctx, user.ID)

		res, err := ts.GraphQLProvider.Login(ctx, &model.LoginRequest{Email: user.Email, Password: password})
		require.NoError(t, err)
		require.NotNil(t, res)
		assert.Nil(t, res.AccessToken)
		assert.True(t, refs.BoolValue(res.ShouldShowTotpScreen))
		assert.True(t, refs.BoolValue(res.ShouldOfferWebauthnMfaVerify))
	})
```

Also extend the existing `"mfaGateBlockVerify withholds the token"` subtest (lines 66-84) with one more assertion right after `assert.True(t, refs.BoolValue(res.ShouldShowTotpScreen))` (line 83):

```go
		assert.False(t, refs.BoolValue(res.ShouldOfferWebauthnMfaVerify), "a TOTP-only user must not be offered a passkey verify option they never registered")
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `cd /Users/lakhansamani/projects/authorizer/authorizer && go test ./internal/integration_tests/ -run TestLoginMFAGateTokenWithholding -v`
Expected: the two new subtests FAIL (`ShouldOfferWebauthnMfaVerify` is always nil/false because `login.go` doesn't set it yet); the extended assertion in the first subtest passes trivially (field is already nil).

- [ ] **Step 4: Implement the gate wiring in `login.go`**

Edit `internal/service/login.go`, replace lines 378-397 (the branch guard through the end of `case mfaGateBlockVerify:`):

```go
	if isMFAEnabled && isTOTPLoginEnabled {
		authenticator, authErr := p.StorageProvider.GetAuthenticatorDetailsByUserId(ctx, user.ID, constants.EnvKeyTOTPAuthenticator)
		totpVerified := authErr == nil && authenticator != nil && authenticator.VerifiedAt != nil
		// A WebAuthn credential registered for ANY purpose (passwordless
		// primary login or explicit MFA setup — there is no `purpose` field)
		// counts as a verified second factor. Ignore a list error rather than
		// failing login on it: treat "couldn't check" the same as "found
		// none," matching how a missing TOTP authenticator row is handled.
		webauthnCreds, _ := p.StorageProvider.ListWebauthnCredentialsByUserID(ctx, user.ID)
		hasWebauthnCredential := len(webauthnCreds) > 0
		authenticatorVerified := totpVerified || hasWebauthnCredential
		gate := resolveMFAGate(
			refs.BoolValue(user.IsMultiFactorAuthEnabled),
			p.Config.EnforceMFA,
			authenticatorVerified,
			user.HasSkippedMFASetupAt != nil,
		)
		switch gate {
		case mfaGateBlockVerify:
			expiresAt := time.Now().Add(3 * time.Minute).Unix()
			if err := setOTPMFaSession(expiresAt); err != nil {
				log.Debug().Msg("Failed to set mfa session")
				return nil, nil, err
			}
			res := &model.AuthResponse{Message: `Proceed to mfa verification`}
			if totpVerified {
				res.ShouldShowTotpScreen = refs.NewBoolRef(true)
			}
			if hasWebauthnCredential {
				res.ShouldOfferWebauthnMfaVerify = refs.NewBoolRef(true)
			}
			return res, side, nil
```

Leave `case mfaGateBlockEnroll:` (originally starting at line 398) and everything after it exactly as-is — only the code above it changes.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd /Users/lakhansamani/projects/authorizer/authorizer && go test ./internal/integration_tests/ -run TestLoginMFAGateTokenWithholding -v`
Expected: PASS, all 7 subtests (5 original + 2 new).

- [ ] **Step 6: Build and vet the whole repo**

Run: `cd /Users/lakhansamani/projects/authorizer/authorizer && go build ./... && go vet ./... && go test ./internal/service/ -run TestResolveMFAGate -v`
Expected: builds clean, vet clean, `TestResolveMFAGate`'s 9 subtests still pass unchanged (that function itself was not touched).

- [ ] **Step 7: Commit**

```bash
git add internal/graph/schema.graphqls internal/graph/model/models_gen.go internal/graph/generated/generated.go internal/service/login.go internal/integration_tests/mfa_gate_login_test.go
git commit -m "feat(mfa): let a registered passkey satisfy MFA verification"
```

---

## SDK (`authorizer-js` repo)

### Task 2: Expose the new response field

**Files:**
- Modify: `/Users/lakhansamani/projects/authorizer/authorizer-js/src/types.ts` (`AuthResponse` interface)
- Modify: `/Users/lakhansamani/projects/authorizer/authorizer-js/package.json` (version bump)

**Interfaces:**
- Consumes: `should_offer_webauthn_mfa_verify` from Task 1's `AuthResponse`.
- Produces: `Types.AuthResponse.should_offer_webauthn_mfa_verify: boolean | null` — consumed by `authorizer-react` Tasks 4-5. `loginWithPasskey(email?, opts?)` (already shipped, `src/index.ts:782`) needs no changes — it already accepts an `email` to scope the ceremony to one account, which is exactly the MFA-verify usage this plan needs.

- [ ] **Step 1: Add the field to `types.ts`**

Edit `/Users/lakhansamani/projects/authorizer/authorizer-js/src/types.ts`, in `interface AuthResponse`, add after `should_show_totp_screen: boolean | null;` (line 140):

```typescript
  should_show_totp_screen: boolean | null;
  should_offer_webauthn_mfa_verify: boolean | null;
```

- [ ] **Step 2: Build and bump version**

Run: `cd /Users/lakhansamani/projects/authorizer/authorizer-js && npm run build`
Expected: builds clean, `lib/index.d.ts` regenerated with the new field.

Edit `package.json`: bump `"version"` from `3.4.0-rc.0` to `3.5.0-rc.0` (new feature, matches this repo's existing prerelease convention).

- [ ] **Step 3: Commit**

```bash
git add src/types.ts package.json lib/
git commit -m "feat: expose should_offer_webauthn_mfa_verify on AuthResponse"
```

---

## Frontend (`authorizer-react` repo)

### Task 3: Point `authorizer-react` at the new local SDK build

**Files:**
- Modify: `/Users/lakhansamani/projects/authorizer/authorizer-react/package.json`

- [ ] **Step 1: Link the local SDK build**

Run: `cd /Users/lakhansamani/projects/authorizer/authorizer-react && npm install /Users/lakhansamani/projects/authorizer/authorizer-js`

This updates `package.json`'s `@authorizerdev/authorizer-js` dependency to the local `3.5.0-rc.0` build (same mechanism used for every prior local-SDK bump in this codebase).

- [ ] **Step 2: Typecheck**

Run: `cd /Users/lakhansamani/projects/authorizer/authorizer-react && npx tsc --noEmit -p tsconfig.json`
Expected: clean (confirms the new SDK type is visible; nothing consumes it yet).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): bump @authorizerdev/authorizer-js to 3.5.0-rc.0 (passkey MFA)"
```

---

### Task 4: Route the passkey-verify offer from `AuthorizerBasicAuthLogin` to `AuthorizerVerifyOtp`

**Files:**
- Modify: `src/types/index.ts:75-80` (`OtpDataType`)
- Modify: `src/components/AuthorizerBasicAuthLogin.tsx:121-133,252-265`

**Interfaces:**
- Consumes: `res.should_offer_webauthn_mfa_verify` from Task 3's linked SDK.
- Produces: `OtpDataType.offer_webauthn_verify?: boolean`, threaded through to `AuthorizerVerifyOtp`'s new `offerWebauthnVerify` prop (consumed by Task 5).

- [ ] **Step 1: Add the field to `OtpDataType`**

Edit `src/types/index.ts`, in `OtpDataType` (lines 75-80), add after `is_totp?: boolean;`:

```typescript
export type OtpDataType = {
  is_screen_visible: boolean;
  email?: string;
  phone_number?: string;
  is_totp?: boolean;
  offer_webauthn_verify?: boolean;
};
```

- [ ] **Step 2: Recognize the new flag in the login branch**

Edit `src/components/AuthorizerBasicAuthLogin.tsx`, replace the second `if` block inside the `res && !res.access_token` guard (lines 121-133):

```typescript
        if (
          res.should_show_email_otp_screen ||
          res.should_show_mobile_otp_screen ||
          res.should_show_totp_screen ||
          res.should_offer_webauthn_mfa_verify
        ) {
          setOtpData({
            is_screen_visible: true,
            email: data.email || ``,
            phone_number: data.phone_number || ``,
            is_totp: res.should_show_totp_screen || false,
            offer_webauthn_verify: res.should_offer_webauthn_mfa_verify || false,
          });
          return;
        }
```

- [ ] **Step 3: Pass it through to `AuthorizerVerifyOtp`**

Edit `src/components/AuthorizerBasicAuthLogin.tsx`, in the `otpData.is_screen_visible` render block (lines 252-265):

```typescript
  if (otpData.is_screen_visible) {
    return (
      <AuthorizerVerifyOtp
        {...{
          setView,
          onLogin,
          email: otpData.email || ``,
          phone_number: otpData.phone_number || ``,
          is_totp: otpData.is_totp || false,
          offerWebauthnVerify: otpData.offer_webauthn_verify || false,
        }}
        urlProps={urlProps}
      />
    );
  }
```

- [ ] **Step 4: Typecheck**

Run: `cd /Users/lakhansamani/projects/authorizer/authorizer-react && npx tsc --noEmit -p tsconfig.json`
Expected: an error that `offerWebauthnVerify` is not a known prop on `AuthorizerVerifyOtp` — that's Task 5's job. This is expected and confirms the wiring compiles as far as it can before Task 5.

- [ ] **Step 5: Commit**

```bash
git add src/types/index.ts src/components/AuthorizerBasicAuthLogin.tsx
git commit -m "feat(mfa): thread should_offer_webauthn_mfa_verify to the OTP screen"
```

---

### Task 5: Offer "verify with your passkey" in `AuthorizerVerifyOtp`

**Files:**
- Modify: `src/components/AuthorizerVerifyOtp.tsx`

**Interfaces:**
- Consumes: `offerWebauthnVerify` prop from Task 4, `authorizerRef.loginWithPasskey(email)` (already shipped SDK method), `isWebauthnSupported()` and `IconPasskey` (already shipped/exported — `@authorizerdev/authorizer-js` and `../icons/mfa` respectively, both already used by `AuthorizerPasskeyLogin.tsx`/`AuthorizerMFASetup.tsx`).
- Produces: nothing new — `res` flows to `onLogin`/`setAuthData` exactly like the existing code-entry `onSubmit` does.

- [ ] **Step 1: Add imports and the new prop**

Edit `src/components/AuthorizerVerifyOtp.tsx`, add to the imports at the top (after line 2):

```typescript
import { VerifyOTPRequest, isWebauthnSupported } from '@authorizerdev/authorizer-js';
import '../styles/default.css';

import { ButtonAppearance, MessageType, Views } from '../constants';
import { useAuthorizer } from '../contexts/AuthorizerContext';
import { StyledButton, StyledFooter, StyledLink } from '../styledComponents';
import { Message } from './Message';
import { TotpDataType } from '../types';
import { AuthorizerTOTPScanner } from './AuthorizerTOTPScanner';
import { IconPasskey } from '../icons/mfa';
```

Add `offerWebauthnVerify?: boolean;` to the component's prop type (line 25-32):

```typescript
export const AuthorizerVerifyOtp: FC<{
  setView?: (v: Views) => void;
  onLogin?: (data: any) => void;
  email?: string;
  phone_number?: string;
  urlProps?: Record<string, any>;
  is_totp?: boolean;
  offerWebauthnVerify?: boolean;
}> = ({ setView, onLogin, email, phone_number, urlProps, is_totp, offerWebauthnVerify }) => {
```

- [ ] **Step 2: Add passkey-verify state and handler**

Inside the component body, after the existing `useEffect` that checks `email`/`phone_number` (after line 50), add:

```typescript
  const [webauthnError, setWebauthnError] = useState(``);
  const [webauthnLoading, setWebauthnLoading] = useState(false);
  const passkeySupported = isWebauthnSupported();

  // A cancelled ceremony surfaces as NotAllowedError/AbortError (same
  // browser behavior AuthorizerPasskeyLogin already handles) - dismiss
  // silently and let the user fall back to the code form when one exists.
  const isUserDismissed = (e?: { code?: string }): boolean =>
    e?.code === `NotAllowedError` || e?.code === `AbortError`;

  const onVerifyWithPasskey = async () => {
    setWebauthnError(``);
    try {
      setWebauthnLoading(true);
      const { data: res, errors } = await authorizerRef.loginWithPasskey(email);
      if (errors && errors.length) {
        if (!isUserDismissed(errors[0])) {
          setWebauthnError(errors[0]?.message || ``);
        }
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
      if (!isUserDismissed(err as { code?: string })) {
        setWebauthnError((err as Error).message);
      }
    } finally {
      setWebauthnLoading(false);
    }
  };
```

- [ ] **Step 3: Render the passkey option and hide the code form when it's the only method**

Edit the final return block (lines 191-272). Replace the intro paragraph and form (lines 207-241) plus the `StyledFooter`'s resend-link condition:

```typescript
  const showCodeForm = !(offerWebauthnVerify && !is_totp);

  return (
    <>
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
      {offerWebauthnVerify && passkeySupported && (
        <>
          <p style={{ textAlign: 'center', margin: '10px 0px' }}>
            Verify with your passkey
          </p>
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
              {webauthnLoading ? `Waiting for passkey ...` : `Verify with a passkey`}
            </span>
          </StyledButton>
          <br />
        </>
      )}
      {showCodeForm && (
        <>
          {offerWebauthnVerify && passkeySupported && (
            <p style={{ textAlign: 'center', margin: '10px 0px' }}>
              Or enter a code instead
            </p>
          )}
          <p style={{ textAlign: 'center', margin: '10px 0px' }}>
            Please enter the OTP sent to your email or phone number or authenticator
          </p>
          <br />
          <form onSubmit={onSubmit} name="authorizer-mfa-otp-form">
            <div className="styled-form-group">
              <label className="form-input-label" htmlFor="authorizer-verify-otp">
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
              disabled={loading || !formData.otp || !!errorData.otp || isLockedOut}
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
            !offerWebauthnVerify &&
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
```

(The `!is_totp && !offerWebauthnVerify` guard on the Resend OTP link prevents it from appearing in the passkey-only case — resending a one-time code makes no sense there, and previously `!is_totp` alone would have incorrectly shown it.)

- [ ] **Step 4: Typecheck and build**

Run: `cd /Users/lakhansamani/projects/authorizer/authorizer-react && npx tsc --noEmit -p tsconfig.json && npm run build`
Expected: clean. `dist/index.d.ts` regenerated with `AuthorizerVerifyOtp`'s new `offerWebauthnVerify` prop.

Run: `cd /Users/lakhansamani/projects/authorizer/authorizer-react/example && npx tsc --noEmit -p tsconfig.json`
Expected: clean.

- [ ] **Step 5: Manual local verification**

With a recipe server running (`--enable-mfa`, `--enable-totp-login`, `--enforce-mfa=false`) and a test user who has registered a passkey (via the settings-page `AuthorizerMFASetup` "Passkey" tile, or the primary passkey-login registration flow — either satisfies the factor per this plan's scoping decision):

1. Log out, log back in with email + password.
2. Expected: no forced TOTP code screen if the user has no verified TOTP; instead, a "Verify with a passkey" button appears. Clicking it and completing the browser ceremony logs the user in.
3. For a user with both TOTP and a passkey registered: expect both the passkey button and the code-entry form to render, either one completing login.
4. Cancel the passkey ceremony (Escape/cancel dialog): expect no error banner when a code form is also available (dual-enrolled case) — the button simply becomes clickable again.

- [ ] **Step 6: Commit**

```bash
git add src/components/AuthorizerVerifyOtp.tsx
git commit -m "feat(mfa): offer passkey verification alongside the OTP code form"
```

---

## Self-Review Notes

- **Spec coverage:** Backend field + gate wiring (Task 1) ✓, SDK field (Task 2) ✓, frontend wiring through both components (Tasks 3-5) ✓. `mfaGateBlockEnroll` and delete-your-only-factor guard are spec-deferred, correctly absent from this plan.
- **Type consistency:** `ShouldOfferWebauthnMfaVerify` (Go, gqlgen-generated) → `should_offer_webauthn_mfa_verify` (GraphQL/JSON) → `should_offer_webauthn_mfa_verify` (TS `AuthResponse`) → `offer_webauthn_verify` (TS `OtpDataType`, deliberately shorter — internal state, not wire format) → `offerWebauthnVerify` (component prop) — traced end to end, no mismatches.
- **No placeholders:** every step has complete, compilable code.
