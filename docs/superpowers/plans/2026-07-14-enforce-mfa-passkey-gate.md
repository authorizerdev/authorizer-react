# Close the EnforceMFA Passkey-Login Bypass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A user cannot bypass an org's `--enforce-mfa` policy by using "Sign in with a passkey" (primary, passwordless login) instead of password + MFA verify. `WebauthnLoginVerify` gains the same TOTP-verify/enrollment gate `login.go`'s password path already has; the frontend stops offering the primary passkey button at all once MFA is enforced.

**Architecture:** Backend-first, three small Go changes in `authorizer` (extract a shared session-setting helper, expose one new `Meta` field, wire the gate into `WebauthnLoginVerify`), then two small frontend changes (`authorizer-js` exposes the field, `authorizer-react` uses it to hide a button and guard a response handler).

**Tech Stack:** Go 1.x / gqlgen for `authorizer`; TypeScript for `authorizer-js`; React + TypeScript for `authorizer-react`.

**Spec:** `docs/superpowers/specs/2026-07-14-enforce-mfa-passkey-gate-design.md`

## Global Constraints

- **`EnforceMFA=false` (or `IsMultiFactorAuthEnabled=false` for the specific user) leaves `WebauthnLoginVerify` completely unchanged.** Only the org-enforced-and-applicable-to-this-user case changes behavior. The fast, one-tap passkey login stays intact for everyone else.
- **Do not call `resolveMFAGate` for this fix.** It would pull in the offer/skip states (`mfaGateOfferSetup`/`mfaGateSkippedSetup`), which don't apply to a primary-login button. Write the gate condition and TOTP-verify/enroll branching directly, mirroring `login.go`'s shape without reusing the gate function itself.
- **When TOTP login is disabled server-wide (`!EnableTOTPLogin`) and the gate would otherwise apply, refuse the passkey login outright** with an actionable error pointing at password login — do not silently fall through to email/SMS OTP (those have no enrollment state, per the original passkey-as-MFA plan's research) and do not issue a token.
- **The refactor of `setOTPMFaSession` into a shared method must not change `login.go`'s behavior.** It is a pure extraction — every existing `login.go` test must pass unchanged after Task 1, before any new behavior is added in Task 3.

---

## Backend (`authorizer` repo)

### Task 1: Extract `setOTPMFaSession` into a shared provider method

**Files:**
- Modify: `internal/service/login.go:166-176` (closure definition), and its 6 call sites at lines 215, 256, 329, 358, 398, 412

**Interfaces:**
- Produces: `func (p *provider) setMFASession(meta RequestMetadata, side *ResponseSideEffects, userID string, expiresAt int64) error` — consumed by Task 3's `WebauthnLoginVerify` change, and by `login.go`'s own 6 existing call sites (updated in place).

- [ ] **Step 1: Add the shared method**

Add to `internal/service/login.go` (or a new small file `internal/service/mfa_session.go` — either is fine, this plan uses `login.go` to keep the diff in one place), near the top of the file after the imports:

```go
// setMFASession arms a short-lived MFA session (memory-store entry + cookie)
// proving the caller already completed a first authentication factor for
// userID. verify_otp and the scoped webauthn_login_options/_verify flow both
// require this session before they'll act. Shared by Login's TOTP branch and
// WebauthnLoginVerify's EnforceMFA gate.
func (p *provider) setMFASession(meta RequestMetadata, side *ResponseSideEffects, userID string, expiresAt int64) error {
	mfaSession := uuid.NewString()
	if err := p.MemoryStoreProvider.SetMfaSession(userID, mfaSession, expiresAt); err != nil {
		return err
	}
	for _, c := range cookie.BuildMfaSessionCookies(meta.HostURL, mfaSession, p.Config.AppCookieSecure) {
		side.AddCookie(c)
	}
	return nil
}
```

Check `internal/service/login.go`'s existing imports already include `github.com/google/uuid` and `github.com/authorizerdev/authorizer/internal/cookie` (the closure being replaced already used both) — no new imports needed in this file.

- [ ] **Step 2: Remove the closure and update call sites**

Delete the closure definition at `internal/service/login.go:166-176`:

```go
	setOTPMFaSession := func(expiresAt int64) error {
		mfaSession := uuid.NewString()
		err = p.MemoryStoreProvider.SetMfaSession(user.ID, mfaSession, expiresAt)
		if err != nil {
			log.Debug().Msg("Failed to set mfa session")
			return err
		}
		for _, c := range cookie.BuildMfaSessionCookies(meta.HostURL, mfaSession, p.Config.AppCookieSecure) {
			side.AddCookie(c)
		}
		return nil
	}
```

Replace every one of its 6 call sites (`internal/service/login.go:215,256,329,358,398,412`) — each currently reads `if err := setOTPMFaSession(expiresAt); err != nil {` — with:

```go
			if err := p.setMFASession(meta, side, user.ID, expiresAt); err != nil {
```

(Match each call site's existing indentation — they vary between the email/mobile OTP branches and the TOTP branch's switch cases. Only the function being called changes; the surrounding `if err := ...; err != nil { log.Debug()...; return nil, nil, err }` blocks are untouched.)

- [ ] **Step 3: Build and run the existing login test suite to confirm no behavior change**

Run: `cd /Users/lakhansamani/projects/authorizer/authorizer && go build ./... && go test ./internal/integration_tests/ -run 'TestLogin|TestLoginMFAGateTokenWithholding|TestVerifyOtp' -v`

Expected: builds clean, all existing subtests still pass unchanged — this is the regression guard proving the extraction didn't alter behavior.

- [ ] **Step 4: Commit**

```bash
git add internal/service/login.go
git commit -m "refactor(mfa): extract setOTPMFaSession into a shared setMFASession method"
```

---

### Task 2: Expose `is_mfa_enforced` on the `Meta` query

**Files:**
- Modify: `internal/graph/schema.graphqls` (`Meta` type)
- Modify: `internal/service/meta.go`
- Modify: `internal/graph/model/models_gen.go` (regenerated)
- Test: `internal/integration_tests/meta_test.go`

**Interfaces:**
- Produces: `model.Meta.IsMfaEnforced bool` (GraphQL field `is_mfa_enforced`) — consumed by `authorizer-js` Task 4 and `authorizer-react` Task 6.

- [ ] **Step 1: Add the field to the schema**

Edit `internal/graph/schema.graphqls`, in `type Meta {`, add after `is_webauthn_enabled: Boolean!`:

```graphql
  # is_webauthn_enabled indicates WebAuthn/passkey enrollment is available (always on; no operator flag).
  is_webauthn_enabled: Boolean!
  # is_mfa_enforced mirrors EnforceMFA — when true, the frontend must not
  # offer a standalone passkey primary-login path (it would bypass the org's
  # two-factor requirement); passkey should only be offered as a second
  # factor after password/social login. The server enforces this
  # independently in webauthn_login_verify regardless of what the frontend
  # shows.
  is_mfa_enforced: Boolean!
}
```

- [ ] **Step 2: Write the failing test**

Edit `internal/integration_tests/meta_test.go`, add a new subtest inside `TestMeta` (after the `"should reflect disabled basic auth"` subtest, or anywhere in the same `t.Run` sequence):

```go
	t.Run("should reflect enforced MFA", func(t *testing.T) {
		cfg2 := getTestConfig()
		cfg2.EnforceMFA = true
		ts2 := initTestSetup(t, cfg2)
		_, ctx2 := createContext(ts2)

		meta, err := ts2.GraphQLProvider.Meta(ctx2)
		require.NoError(t, err)
		assert.NotNil(t, meta)
		assert.True(t, meta.IsMfaEnforced)
	})

	t.Run("should reflect non-enforced MFA by default", func(t *testing.T) {
		meta, err := ts.GraphQLProvider.Meta(ctx)
		require.NoError(t, err)
		assert.False(t, meta.IsMfaEnforced)
	})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd /Users/lakhansamani/projects/authorizer/authorizer && go build ./... 2>&1 | head -20`
Expected: FAIL at compile time — `meta.IsMfaEnforced undefined` (field doesn't exist on `model.Meta` yet).

- [ ] **Step 4: Regenerate GraphQL code**

Run: `cd /Users/lakhansamani/projects/authorizer/authorizer && go run github.com/99designs/gqlgen --verbose generate && go mod tidy`

Confirm: `grep -n "IsMfaEnforced" internal/graph/model/models_gen.go` — expect a `bool` field with `is_mfa_enforced` json tag.

- [ ] **Step 5: Implement**

Edit `internal/service/meta.go`, add after `IsWebauthnEnabled: true,`:

```go
		// WebAuthn/passkey ships always-on with no operator flag.
		IsWebauthnEnabled: true,
		IsMfaEnforced:     c.EnforceMFA,
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `cd /Users/lakhansamani/projects/authorizer/authorizer && go test ./internal/integration_tests/ -run TestMeta -v`
Expected: PASS, all subtests including the two new ones.

- [ ] **Step 7: Commit**

```bash
git add internal/graph/schema.graphqls internal/graph/model/models_gen.go internal/graph/generated/generated.go internal/service/meta.go internal/integration_tests/meta_test.go
git commit -m "feat(mfa): expose is_mfa_enforced on the meta query"
```

---

### Task 3: Gate `WebauthnLoginVerify` on `EnforceMFA`

**Files:**
- Modify: `internal/service/webauthn.go:133-171` (`WebauthnLoginVerify`)
- Test: `internal/integration_tests/webauthn_enforce_mfa_test.go` (new file)

**Interfaces:**
- Consumes: `p.setMFASession` from Task 1, `p.generateTOTPEnrollment` (already shipped, `internal/service/login.go:67`), `p.StorageProvider.GetAuthenticatorDetailsByUserId` (already shipped).
- Produces: nothing new for other tasks — this is the actual security fix, self-contained.

- [ ] **Step 1: Write the failing tests**

Create `internal/integration_tests/webauthn_enforce_mfa_test.go`:

```go
package integration_tests

import (
	"testing"
	"time"

	"github.com/descope/virtualwebauthn"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/authorizerdev/authorizer/internal/constants"
	"github.com/authorizerdev/authorizer/internal/graph/model"
	"github.com/authorizerdev/authorizer/internal/refs"
	"github.com/authorizerdev/authorizer/internal/storage/schemas"
)

// registerPasskeyForNewUser signs up a fresh verified user, registers one
// passkey via a simulated ceremony, and returns everything a login-time
// assertion needs. Mirrors the setup in webauthn_test.go's
// TestWebauthnPasskeyRegistrationAndLogin.
func registerPasskeyForNewUser(t *testing.T, ts *testSetup) (*schemas.User, virtualwebauthn.RelyingParty, virtualwebauthn.Authenticator, virtualwebauthn.Credential) {
	t.Helper()
	req, ctx := createContext(ts)
	rp := testRelyingParty(t, ts)
	credential := virtualwebauthn.NewCredential(virtualwebauthn.KeyTypeEC2)

	email := "enforce_mfa_" + uuid.New().String() + "@authorizer.dev"
	password := "Password@123"
	signupRes, err := ts.GraphQLProvider.SignUp(ctx, &model.SignUpRequest{
		Email: &email, Password: password, ConfirmPassword: password,
	})
	require.NoError(t, err)
	require.NotNil(t, signupRes.AccessToken)
	req.Header.Set("Authorization", "Bearer "+*signupRes.AccessToken)

	optRes, err := ts.GraphQLProvider.WebauthnRegistrationOptions(ctx, nil)
	require.NoError(t, err)
	attOpts, err := virtualwebauthn.ParseAttestationOptions(optRes.Options)
	require.NoError(t, err)
	authenticator := virtualwebauthn.NewAuthenticatorWithOptions(virtualwebauthn.AuthenticatorOptions{
		UserHandle: []byte(attOpts.UserID),
	})
	authenticator.AddCredential(credential)
	attResp := virtualwebauthn.CreateAttestationResponse(rp, authenticator, credential, *attOpts)
	_, err = ts.GraphQLProvider.WebauthnRegistrationVerify(ctx, &model.WebauthnRegistrationVerifyRequest{Credential: attResp})
	require.NoError(t, err)

	user, err := ts.StorageProvider.GetUserByEmail(ctx, email)
	require.NoError(t, err)
	req.Header.Del("Authorization")
	return user, rp, authenticator, credential
}

func assertPasskeyLogin(t *testing.T, ts *testSetup, rp virtualwebauthn.RelyingParty, authenticator virtualwebauthn.Authenticator, credential virtualwebauthn.Credential) (*model.AuthResponse, error) {
	t.Helper()
	_, ctx := createContext(ts)
	optRes, err := ts.GraphQLProvider.WebauthnLoginOptions(ctx, nil)
	require.NoError(t, err)
	assertOpts, err := virtualwebauthn.ParseAssertionOptions(optRes.Options)
	require.NoError(t, err)
	assertResp := virtualwebauthn.CreateAssertionResponse(rp, authenticator, credential, *assertOpts)
	return ts.GraphQLProvider.WebauthnLoginVerify(ctx, &model.WebauthnLoginVerifyRequest{Credential: assertResp})
}

func TestWebauthnLoginVerifyEnforceMFA(t *testing.T) {
	t.Run("EnforceMFA=false — unchanged, issues token", func(t *testing.T) {
		cfg := getTestConfig()
		ts := initTestSetup(t, cfg)
		user, rp, authenticator, credential := registerPasskeyForNewUser(t, ts)
		user.IsMultiFactorAuthEnabled = refs.NewBoolRef(true)
		_, err := ts.StorageProvider.UpdateUser(t.Context(), user)
		require.NoError(t, err)

		authRes, err := assertPasskeyLogin(t, ts, rp, authenticator, credential)
		require.NoError(t, err)
		require.NotNil(t, authRes.AccessToken, "EnforceMFA=false must not block passkey login")
	})

	t.Run("EnforceMFA=true, user MFA not individually enabled — unaffected", func(t *testing.T) {
		cfg := getTestConfig()
		cfg.EnforceMFA = true
		ts := initTestSetup(t, cfg)
		_, rp, authenticator, credential := registerPasskeyForNewUser(t, ts)
		// IsMultiFactorAuthEnabled left false: mirrors resolveMFAGate's own
		// precondition, consistent with password login's existing behavior.

		authRes, err := assertPasskeyLogin(t, ts, rp, authenticator, credential)
		require.NoError(t, err)
		require.NotNil(t, authRes.AccessToken)
	})

	t.Run("EnforceMFA=true, TOTP verified — blocks token, offers totp screen", func(t *testing.T) {
		cfg := getTestConfig()
		cfg.EnforceMFA = true
		ts := initTestSetup(t, cfg)
		user, rp, authenticator, credential := registerPasskeyForNewUser(t, ts)
		user.IsMultiFactorAuthEnabled = refs.NewBoolRef(true)
		_, err := ts.StorageProvider.UpdateUser(t.Context(), user)
		require.NoError(t, err)
		now := time.Now().Unix()
		_, err = ts.StorageProvider.AddAuthenticator(t.Context(), &schemas.Authenticator{
			UserID: user.ID, Method: constants.EnvKeyTOTPAuthenticator,
			Secret: "dummy-secret", VerifiedAt: &now,
		})
		require.NoError(t, err)

		authRes, err := assertPasskeyLogin(t, ts, rp, authenticator, credential)
		require.NoError(t, err)
		require.NotNil(t, authRes)
		assert.Nil(t, authRes.AccessToken, "a user with verified TOTP must not get a token straight off a passkey login when MFA is enforced")
		assert.True(t, refs.BoolValue(authRes.ShouldShowTotpScreen))
		assert.Nil(t, authRes.AuthenticatorSecret, "already-enrolled path must not hand back a fresh enrollment payload")
	})

	t.Run("EnforceMFA=true, TOTP not enrolled — blocks token, returns enrollment payload", func(t *testing.T) {
		cfg := getTestConfig()
		cfg.EnforceMFA = true
		ts := initTestSetup(t, cfg)
		user, rp, authenticator, credential := registerPasskeyForNewUser(t, ts)
		user.IsMultiFactorAuthEnabled = refs.NewBoolRef(true)
		_, err := ts.StorageProvider.UpdateUser(t.Context(), user)
		require.NoError(t, err)

		authRes, err := assertPasskeyLogin(t, ts, rp, authenticator, credential)
		require.NoError(t, err)
		require.NotNil(t, authRes)
		assert.Nil(t, authRes.AccessToken)
		assert.True(t, refs.BoolValue(authRes.ShouldShowTotpScreen))
		assert.NotNil(t, authRes.AuthenticatorSecret, "not-yet-enrolled path must hand back a fresh TOTP enrollment payload")
	})

	t.Run("EnforceMFA=true, TOTP disabled server-wide — refuses passkey login entirely", func(t *testing.T) {
		cfg := getTestConfig()
		cfg.EnforceMFA = true
		cfg.EnableTOTPLogin = false
		ts := initTestSetup(t, cfg)
		user, rp, authenticator, credential := registerPasskeyForNewUser(t, ts)
		user.IsMultiFactorAuthEnabled = refs.NewBoolRef(true)
		_, err := ts.StorageProvider.UpdateUser(t.Context(), user)
		require.NoError(t, err)

		authRes, err := assertPasskeyLogin(t, ts, rp, authenticator, credential)
		require.Error(t, err, "must refuse rather than silently issue a token with no compatible second factor available")
		assert.Nil(t, authRes)
	})
}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd /Users/lakhansamani/projects/authorizer/authorizer && go test ./internal/integration_tests/ -run TestWebauthnLoginVerifyEnforceMFA -v`
Expected: the `EnforceMFA=false` and `not individually enabled` subtests PASS already (current unconditional-issue behavior happens to satisfy them); the three `EnforceMFA=true` subtests FAIL (today's code always issues a token / never refuses).

- [ ] **Step 3: Implement the gate**

Edit `internal/service/webauthn.go`. Add `"time"` to the import block (currently `context`, `strings`, then the internal packages, then `gin`):

```go
import (
	"context"
	"strings"
	"time"

	"github.com/authorizerdev/authorizer/internal/audit"
	"github.com/authorizerdev/authorizer/internal/constants"
	"github.com/authorizerdev/authorizer/internal/cookie"
	"github.com/authorizerdev/authorizer/internal/graph/model"
	"github.com/authorizerdev/authorizer/internal/refs"
	"github.com/gin-gonic/gin"
)
```

In `WebauthnLoginVerify`, insert this block immediately after the email-verified check (after the `if user.EmailVerifiedAt == nil { ... }` block, i.e. right before the `p.AuditProvider.LogEvent(...)` call that currently precedes `issueAuthResponse`):

```go
	// EnforceMFA is absolute and applies to passkey primary login exactly
	// like it applies to password login: a passkey may not silently satisfy
	// an org's two-factor requirement. This does not claim a passkey is
	// itself insufficient as a factor - it only prevents passkey login from
	// becoming an unintended bypass of a policy the org explicitly turned on.
	if p.Config.EnforceMFA && refs.BoolValue(user.IsMultiFactorAuthEnabled) {
		if !p.Config.EnableTOTPLogin {
			log.Debug().Msg("EnforceMFA is on but no compatible second factor is configured for passkey login")
			return nil, nil, FailedPrecondition("multi-factor authentication is required but no compatible verification method is available for passkey sign-in; please sign in with your password instead")
		}
		authenticator, authErr := p.StorageProvider.GetAuthenticatorDetailsByUserId(ctx, user.ID, constants.EnvKeyTOTPAuthenticator)
		totpVerified := authErr == nil && authenticator != nil && authenticator.VerifiedAt != nil
		expiresAt := time.Now().Add(3 * time.Minute).Unix()
		if err := p.setMFASession(meta, side, user.ID, expiresAt); err != nil {
			log.Debug().Msg("Failed to set mfa session")
			return nil, nil, err
		}
		if totpVerified {
			return &model.AuthResponse{
				Message:              `Proceed to mfa verification`,
				ShouldShowTotpScreen: refs.NewBoolRef(true),
			}, side, nil
		}
		enrollment, err := p.generateTOTPEnrollment(ctx, user.ID)
		if err != nil {
			log.Debug().Msg("Failed to generate totp")
			return nil, nil, err
		}
		return &model.AuthResponse{
			Message:                    `Proceed to totp verification screen`,
			ShouldShowTotpScreen:       refs.NewBoolRef(true),
			AuthenticatorScannerImage:  refs.NewStringRef(enrollment.ScannerImage),
			AuthenticatorSecret:        refs.NewStringRef(enrollment.Secret),
			AuthenticatorRecoveryCodes: enrollment.RecoveryCodes,
		}, side, nil
	}
```

Note `side` already exists in this function (`side := &ResponseSideEffects{}` at the top) — reuse it, don't redeclare.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd /Users/lakhansamani/projects/authorizer/authorizer && go test ./internal/integration_tests/ -run TestWebauthnLoginVerifyEnforceMFA -v`
Expected: PASS, all 5 subtests.

- [ ] **Step 5: Run the full webauthn and login test files to confirm no regressions**

Run: `cd /Users/lakhansamani/projects/authorizer/authorizer && go build ./... && go vet ./... && go test ./internal/integration_tests/ -run 'TestWebauthn|TestLogin' -v`
Expected: builds clean, vet clean, all subtests pass — including the original `TestWebauthnPasskeyRegistrationAndLogin`'s usernameless/scoped login subtests (both run with `EnforceMFA` unset/false via `getTestConfig()`, so they must be completely unaffected).

- [ ] **Step 6: Commit**

```bash
git add internal/service/webauthn.go internal/integration_tests/webauthn_enforce_mfa_test.go
git commit -m "feat(mfa): refuse passkey primary login to silently bypass EnforceMFA"
```

---

## SDK (`authorizer-js` repo)

### Task 4: Expose `is_mfa_enforced`

**Files:**
- Modify: `/Users/lakhansamani/projects/authorizer/authorizer-js/src/types.ts` (`Meta` interface)
- Modify: `/Users/lakhansamani/projects/authorizer/authorizer-js/package.json` (version bump)

**Interfaces:**
- Consumes: `is_mfa_enforced` from Task 2's `Meta` query.
- Produces: `Types.Meta.is_mfa_enforced: boolean` — consumed by `authorizer-react` Task 6. This flows into React's `config` object automatically via the existing `getMetaData()` → context-merge path (no SDK method changes needed — `Meta` is already fetched and merged wholesale).

- [ ] **Step 1: Add the field to `types.ts`**

Edit `/Users/lakhansamani/projects/authorizer/authorizer-js/src/types.ts`, in `interface Meta`, add after `is_webauthn_enabled: boolean;`:

```typescript
  is_webauthn_enabled: boolean;
  is_mfa_enforced: boolean;
```

- [ ] **Step 2: Build and bump version**

Run: `cd /Users/lakhansamani/projects/authorizer/authorizer-js && npm run build`
Expected: builds clean, `lib/index.d.ts` regenerated with the new field.

Edit `package.json`: bump `"version"` from `3.5.0-rc.0` to `3.6.0-rc.0`.

- [ ] **Step 3: Commit**

```bash
git add src/types.ts package.json lib/
git commit -m "feat: expose is_mfa_enforced on Meta"
```

---

## Frontend (`authorizer-react` repo)

### Task 5: Point `authorizer-react` at the new local SDK build

**Files:**
- Modify: `/Users/lakhansamani/projects/authorizer/authorizer-react/package.json`

- [ ] **Step 1: Link the local SDK build**

Run: `cd /Users/lakhansamani/projects/authorizer/authorizer-react && npm install /Users/lakhansamani/projects/authorizer/authorizer-js`

- [ ] **Step 2: Typecheck**

Run: `cd /Users/lakhansamani/projects/authorizer/authorizer-react && npx tsc --noEmit -p tsconfig.json`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): bump @authorizerdev/authorizer-js to 3.6.0-rc.0 (enforce-mfa passkey gate)"
```

---

### Task 6: Hide the primary passkey button when MFA is enforced, guard the response handler

**Files:**
- Modify: `src/components/AuthorizerPasskeyLogin.tsx`

**Interfaces:**
- Consumes: `config.is_mfa_enforced` (from Task 5's linked SDK, already flows into `config` via the existing `useAuthorizer()` context — same pattern as `config.is_google_login_enabled` etc. already used in this same file).

- [ ] **Step 1: Hide the button when MFA is enforced**

In `src/components/AuthorizerPasskeyLogin.tsx`, find the early return:

```typescript
  if (!isWebauthnSupported()) {
    return null;
  }
```

Replace with:

```typescript
  // When the org enforces MFA, passkey must never be offered as a
  // standalone primary-login path - it would let a user skip the org's
  // two-factor requirement entirely. The server refuses this independently
  // (webauthn_login_verify checks EnforceMFA itself), but the button
  // shouldn't invite the attempt in the first place: authenticator methods
  // belong after a first factor has identified the user, not before.
  if (!isWebauthnSupported() || config.is_mfa_enforced) {
    return null;
  }
```

- [ ] **Step 2: Guard the response handler against a tokenless response**

Find the `onClick` handler's success path:

```typescript
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
```

Replace with:

```typescript
      if (res && !res.access_token) {
        // Reachable only if this button somehow rendered despite the
        // is_mfa_enforced guard above (e.g. a brief pre-config-load
        // window) - the server is the real boundary and just refused to
        // issue a token. Don't treat this as a successful login.
        setError(
          `Additional verification is required. Please sign in with your email and password instead.`
        );
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
```

- [ ] **Step 3: Typecheck and build**

Run: `cd /Users/lakhansamani/projects/authorizer/authorizer-react && npx tsc --noEmit -p tsconfig.json && npm run build`
Expected: clean.

- [ ] **Step 4: Manual local verification**

With the recipe server running with `--enforce-mfa`, a user who has a registered passkey but no TOTP:

1. Load the login screen. Expected: "Sign in with a passkey" button is absent.
2. Log in with password. Expected: forced into TOTP enrollment (existing `mfaGateBlockEnroll` behavior, unchanged by this plan).
3. Complete TOTP enrollment, log out, log back in with password. Expected: TOTP verify screen (existing `mfaGateBlockVerify` behavior).
4. Confirm no code path in the UI ever offers a bare "sign in with passkey, skip everything" option while `--enforce-mfa` is set.

- [ ] **Step 5: Commit**

```bash
git add src/components/AuthorizerPasskeyLogin.tsx
git commit -m "feat(mfa): hide the primary passkey button when MFA is enforced"
```

---

## Self-Review Notes

- **Spec coverage:** backend gate (Task 3) ✓, backend refactor prerequisite (Task 1) ✓, `is_mfa_enforced` field (Task 2) ✓, SDK exposure (Task 4) ✓, frontend hide + defense-in-depth (Task 6) ✓. Both explicitly-deferred items from the spec (self-opted-but-not-enforced TOTP skippability via passkey; the NIST AAL2 question) are correctly absent from this plan.
- **Type consistency:** `EnforceMFA` (Go, unchanged existing field) → `IsMfaEnforced`/`is_mfa_enforced` (Meta, gqlgen-generated → GraphQL/JSON) → `is_mfa_enforced` (TS `Meta`) → `config.is_mfa_enforced` (React, via the existing meta-merge path, no new plumbing) — traced end to end, no mismatches, no new naming introduced beyond this one field.
- **No placeholders:** every step has complete, compilable code.
