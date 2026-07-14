# Optional MFA Setup With Skip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When MFA is available but not organization-enforced, a user who hasn't set up MFA gets logged in immediately and is offered (not forced into) MFA setup, with a Skip action that's remembered so they aren't nagged again — while `--enforce-mfa` keeps working exactly as it does today (no token until MFA is complete, never skippable).

**Architecture:** Three repos, in dependency order: `authorizer` (Go backend — new schema field, new decision logic, new mutations) → `authorizer-js` (TS API client — exposes the new response fields and mutations) → `authorizer-react` (React UI — wires the login form and the existing-but-unused `AuthorizerMFASetup` hub into the actual login flow with a working Skip button).

**Tech Stack:** Go 1.x / gqlgen / GORM (+ driver-specific code for Cassandra, DynamoDB, Couchbase) for the backend; TypeScript for `authorizer-js`; React + TypeScript for `authorizer-react`.

## Global Constraints

- **`EnforceMFA` is absolute.** When `p.Config.EnforceMFA` is true, behavior is unchanged from today: no access token is issued until MFA is completed, and skip is never offered. This must be enforced server-side in every new code path — never trust a client-supplied "skip me" request.
- **A user's own opted-in MFA is never skippable.** If a user has a *verified* authenticator (or has otherwise completed MFA setup), every login requires that verification, regardless of `EnforceMFA`. Skip only applies to the *first-time setup* decision, not to already-configured MFA.
- **M2M / service-account / client-credentials / gRPC workload-identity flows are out of scope and must not be touched.** Confirmed in research: `service.Login` (this plan's surface) is reached only via the interactive GraphQL `login` mutation and the gRPC `authorizer.Login` handler, both driven by `model.LoginRequest` (email+password). Machine-to-machine token issuance (`internal/http_handlers/token.go:handleClientCredentialsGrant`) operates on a completely separate `schemas.Client` type and never reads `IsMultiFactorAuthEnabled`. Do not add any MFA check reachable from that path.
- **Passkey-as-MFA and Email/SMS-OTP "not yet enrolled" parity are explicitly OUT of scope for this plan** — see "Deferred Work" at the end. Do not attempt them as part of these tasks.
- Every schema change must update all backends the codebase currently supports: SQL (GORM auto-migrates), MongoDB, ArangoDB (both pick up new struct fields automatically — no separate migration file), Cassandra/ScyllaDB (needs an explicit `ALTER TABLE` plus updates to every hand-written `SELECT`/`Scan`), DynamoDB (needs a nil-attribute-removal branch), Couchbase (needs updates to every hand-written `SELECT` column list). Per the codebase's own convention comment in `internal/storage/schemas/user.go:11`: "any change here should be reflected in providers/casandra/provider.go as it does not have model support in collection creation."
- Local verification happens against the SQLite-backed dev server started by `authorizer/../examples/with-auth-recipes/run-server.sh` (already running with `--enforce-mfa=false`, `--enable-mfa`, `--enable-totp-login` — this is the exact server and the exact stuck account, `lakhan@yopmail.com`, that surfaced this bug).

---

## Backend (`authorizer` repo)

### Task 1: Add `HasSkippedMFASetupAt` field across all storage backends

**Files:**
- Modify: `internal/storage/schemas/user.go:36` (insert new field), `:82` (AsAPIUser mapping)
- Modify: `internal/graph/schema.graphqls:82` (User type), `internal/graph/model/models_gen.go` (regenerated)
- Modify: `internal/storage/db/cassandradb/provider.go` (near line 178-183, ALTER TABLE)
- Modify: `internal/storage/db/cassandradb/user.go` (lines ~156, 227-228, 238-239, 316-317, 328-329 — column lists and `Scan` args)
- Modify: `internal/storage/db/dynamodb/user.go` (near line 112-113, nil-attribute removal)
- Modify: `internal/storage/db/couchbase/user.go` (lines ~125, 158, 182, 204, 260 — SELECT column lists)
- Test: `internal/storage/schemas/user_test.go` (create if it doesn't exist)

**Interfaces:**
- Produces: `schemas.User.HasSkippedMFASetupAt *int64` — a nullable Unix-seconds timestamp. `nil` means "never skipped, and not yet known whether they'll set up MFA." Non-nil means "user explicitly chose Skip at this time."
- Produces: `model.User.HasSkippedMfaSetupAt *int64` (GraphQL-exposed, exact name matches gqlgen's Go-casing convention — check the generated name for `is_multi_factor_auth_enabled` → `IsMultiFactorAuthEnabled` and mirror it: `has_skipped_mfa_setup_at` → `HasSkippedMfaSetupAt`).

- [ ] **Step 1: Add the field to the canonical schema struct**

Edit `internal/storage/schemas/user.go`, insert after line 36 (`IsMultiFactorAuthEnabled`):

```go
	IsMultiFactorAuthEnabled *bool   `json:"is_multi_factor_auth_enabled" bson:"is_multi_factor_auth_enabled" cql:"is_multi_factor_auth_enabled" dynamo:"is_multi_factor_auth_enabled"`
	// HasSkippedMFASetupAt is set the moment a user explicitly skips the
	// optional MFA setup prompt shown at login (never set when EnforceMFA is
	// on — skip is not offered in that mode). Nil means "never skipped."
	HasSkippedMFASetupAt     *int64  `json:"has_skipped_mfa_setup_at" bson:"has_skipped_mfa_setup_at" cql:"has_skipped_mfa_setup_at" dynamo:"has_skipped_mfa_setup_at"`
	UpdatedAt                int64   `json:"updated_at" bson:"updated_at" cql:"updated_at" dynamo:"updated_at"`
```

- [ ] **Step 2: Map it into the API-facing user in `AsAPIUser`**

Edit `internal/storage/schemas/user.go` inside `AsAPIUser` (around line 82), add after the `IsMultiFactorAuthEnabled:` line:

```go
		IsMultiFactorAuthEnabled: user.IsMultiFactorAuthEnabled,
		HasSkippedMfaSetupAt:     user.HasSkippedMFASetupAt,
```

- [ ] **Step 3: Add the field to the GraphQL schema**

Edit `internal/graph/schema.graphqls`, in the `type User {` block (line 61-84), add after `is_multi_factor_auth_enabled: Boolean` (line 82):

```graphql
  is_multi_factor_auth_enabled: Boolean
  # has_skipped_mfa_setup_at is set once the user explicitly skips the
  # optional MFA setup prompt shown at login. Null means never skipped.
  has_skipped_mfa_setup_at: Int64
  app_data: Map
```

- [ ] **Step 4: Regenerate GraphQL code**

Run: `cd /Users/lakhansamani/projects/authorizer/authorizer && go run github.com/99designs/gqlgen --verbose generate && go mod tidy`

Expected: `internal/graph/model/models_gen.go`'s `User` struct now has a `HasSkippedMfaSetupAt *int64` field with a `has_skipped_mfa_setup_at,omitempty` json tag. Confirm with:
`grep -n "HasSkippedMfaSetupAt" internal/graph/model/models_gen.go`

- [ ] **Step 5: Cassandra — add the column and wire every hand-written query**

Edit `internal/storage/db/cassandradb/provider.go` near line 178-183, add a sibling `ALTER TABLE` immediately after the existing `is_multi_factor_auth_enabled` one:

```go
	userTableAlterQuery = fmt.Sprintf(`ALTER TABLE %s.%s ADD has_skipped_mfa_setup_at bigint`, KeySpace, schemas.Collections.User)
	err = session.Query(userTableAlterQuery).Exec()
	if err != nil {
		deps.Log.Debug().Err(err).Msg("Failed to alter table as has_skipped_mfa_setup_at column exists")
		// continue
	}
```

Then in `internal/storage/db/cassandradb/user.go`, add `has_skipped_mfa_setup_at` to the column list and a corresponding `&user.HasSkippedMFASetupAt` to the `.Scan(...)` args at each of lines ~156, 227-228, 238-239, 316-317, 328-329 (wherever `is_multi_factor_auth_enabled` currently appears in that file's SELECTs — add the new column immediately after it, and the new `Scan` arg immediately after `&user.IsMultiFactorAuthEnabled`).

- [ ] **Step 6: DynamoDB — nil-attribute removal**

Edit `internal/storage/db/dynamodb/user.go` near line 112-113, add a sibling branch:

```go
	if u.IsMultiFactorAuthEnabled == nil {
		remove = append(remove, "is_multi_factor_auth_enabled")
	}
	if u.HasSkippedMFASetupAt == nil {
		remove = append(remove, "has_skipped_mfa_setup_at")
	}
```

- [ ] **Step 7: Couchbase — add the column to every SELECT**

Edit `internal/storage/db/couchbase/user.go` at lines ~125, 158, 182, 204, 260: add `has_skipped_mfa_setup_at` to each SELECT's column list, immediately after `is_multi_factor_auth_enabled`.

- [ ] **Step 8: Verify SQL/Mongo/Arango need no extra edits**

SQL: GORM's `AutoMigrate(&schemas.User{}, ...)` (`internal/storage/db/sql/provider.go:98`) picks up the new struct field automatically on next boot — no action needed.
MongoDB/ArangoDB: both marshal `*schemas.User` directly — no action needed.

Run: `cd /Users/lakhansamani/projects/authorizer/authorizer && go build ./...`
Expected: builds clean.

- [ ] **Step 9: Commit**

```bash
git add internal/storage/schemas/user.go internal/graph/schema.graphqls internal/graph/model/models_gen.go internal/graph/generated/generated.go internal/storage/db/cassandradb/provider.go internal/storage/db/cassandradb/user.go internal/storage/db/dynamodb/user.go internal/storage/db/couchbase/user.go
git commit -m "feat(mfa): add has_skipped_mfa_setup_at to the user record"
```

---

### Task 2: Extract the MFA-gate decision as a pure, unit-tested function

**Files:**
- Create: `internal/service/mfa_gate.go`
- Test: `internal/service/mfa_gate_test.go`

**Interfaces:**
- Consumes: nothing from other tasks — pure function, no DB/network access.
- Produces: `type mfaGateDecision int` with values `mfaGateNone`, `mfaGateBlockVerify`, `mfaGateBlockEnroll`, `mfaGateOfferSetup`, `mfaGateSkippedSetup` — and `func resolveMFAGate(userMFAEnabled bool, enforceMFA bool, authenticatorVerified bool, hasSkippedSetup bool) mfaGateDecision`, consumed by Task 3.

- [ ] **Step 1: Write the failing test**

```go
// internal/service/mfa_gate_test.go
package service

import "testing"

func TestResolveMFAGate(t *testing.T) {
	cases := []struct {
		name                  string
		userMFAEnabled        bool
		enforceMFA            bool
		authenticatorVerified bool
		hasSkippedSetup       bool
		want                  mfaGateDecision
	}{
		{"mfa off for user", false, false, false, false, mfaGateNone},
		{"mfa off for user, enforced anyway (inconsistent state defends safe)", false, true, false, false, mfaGateNone},
		{"enforced, not yet enrolled", true, true, false, false, mfaGateBlockEnroll},
		{"enforced, already verified", true, true, true, false, mfaGateBlockVerify},
		{"enforced, skip flag present but ignored", true, true, false, true, mfaGateBlockEnroll},
		{"optional, already verified -> still verify every time", true, false, true, false, mfaGateBlockVerify},
		{"optional, already verified, skip flag stale -> still verify", true, false, true, true, mfaGateBlockVerify},
		{"optional, not enrolled, never skipped -> offer", true, false, false, false, mfaGateOfferSetup},
		{"optional, not enrolled, already skipped -> quiet login", true, false, false, true, mfaGateSkippedSetup},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := resolveMFAGate(c.userMFAEnabled, c.enforceMFA, c.authenticatorVerified, c.hasSkippedSetup)
			if got != c.want {
				t.Errorf("resolveMFAGate(%v,%v,%v,%v) = %v, want %v", c.userMFAEnabled, c.enforceMFA, c.authenticatorVerified, c.hasSkippedSetup, got, c.want)
			}
		})
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/lakhansamani/projects/authorizer/authorizer && go test ./internal/service/ -run TestResolveMFAGate -v`
Expected: FAIL — `resolveMFAGate`/`mfaGateDecision`/`mfaGateNone` undefined.

- [ ] **Step 3: Write the implementation**

```go
// internal/service/mfa_gate.go
package service

// mfaGateDecision is what login.go should do once it knows a user has MFA
// available. See resolveMFAGate for the truth table.
type mfaGateDecision int

const (
	// mfaGateNone: user has no MFA to worry about. Issue the token normally.
	mfaGateNone mfaGateDecision = iota
	// mfaGateBlockVerify: user has a verified/completed MFA method already.
	// Withhold the token until they verify it. Never skippable — this is the
	// user's own opted-in second factor.
	mfaGateBlockVerify
	// mfaGateBlockEnroll: MFA is org-enforced and this user hasn't finished
	// enrollment yet. Withhold the token until enrollment is completed.
	// Never skippable.
	mfaGateBlockEnroll
	// mfaGateOfferSetup: MFA is available but not enforced, the user hasn't
	// enrolled, and they've never skipped before. Issue the token now AND
	// tell the frontend to offer (not force) MFA setup.
	mfaGateOfferSetup
	// mfaGateSkippedSetup: same as mfaGateOfferSetup but the user has already
	// chosen Skip in the past. Issue the token, don't nag.
	mfaGateSkippedSetup
)

// resolveMFAGate decides what login.go does for a user whose
// IsMultiFactorAuthEnabled flag might be set. Only called when the caller
// has already confirmed MFA is available on this server at all
// (Config.EnableMFA) — see login.go call sites.
//
//   - userMFAEnabled: schemas.User.IsMultiFactorAuthEnabled
//   - enforceMFA: Config.EnforceMFA (org-wide mandate — absolute, never
//     bypassed by hasSkippedSetup)
//   - authenticatorVerified: true when the user has a completed/verified MFA
//     method already (e.g. a verified TOTP authenticator) — their own opted-in
//     second factor, always required once true, regardless of enforceMFA or
//     hasSkippedSetup
//   - hasSkippedSetup: schemas.User.HasSkippedMFASetupAt != nil
func resolveMFAGate(userMFAEnabled, enforceMFA, authenticatorVerified, hasSkippedSetup bool) mfaGateDecision {
	if !userMFAEnabled {
		return mfaGateNone
	}
	if authenticatorVerified {
		// The user's own completed second factor. Always required, never
		// skippable, regardless of current enforcement policy.
		return mfaGateBlockVerify
	}
	if enforceMFA {
		return mfaGateBlockEnroll
	}
	if hasSkippedSetup {
		return mfaGateSkippedSetup
	}
	return mfaGateOfferSetup
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/lakhansamani/projects/authorizer/authorizer && go test ./internal/service/ -run TestResolveMFAGate -v`
Expected: PASS, all 9 subtests.

- [ ] **Step 5: Commit**

```bash
git add internal/service/mfa_gate.go internal/service/mfa_gate_test.go
git commit -m "feat(mfa): add pure MFA-gate decision function with unit tests"
```

---

### Task 3: Rewire `login.go`'s TOTP branch to use the gate, and add `should_offer_mfa_setup` to `AuthResponse`

**Files:**
- Modify: `internal/graph/schema.graphqls:117` (AuthResponse), `internal/graph/model/models_gen.go` (regenerated)
- Modify: `internal/service/login.go:349-386` (the TOTP MFA branch)

**Interfaces:**
- Consumes: `resolveMFAGate` from Task 2.
- Produces: `model.AuthResponse.ShouldOfferMfaSetup *bool` — when true alongside a populated `AccessToken`, the frontend should show (not force) MFA setup. `AuthenticatorScannerImage`/`AuthenticatorSecret`/`AuthenticatorRecoveryCodes` are populated on the SAME response in this case, so the frontend can render the TOTP QR immediately if the user chooses to set it up.

- [ ] **Step 1: Add the field to the GraphQL schema**

Edit `internal/graph/schema.graphqls`, inside `type AuthResponse {` (line 113-129), add after `should_show_totp_screen: Boolean` (line 117):

```graphql
  should_show_totp_screen: Boolean
  # should_offer_mfa_setup is true when MFA is available but not enforced,
  # the user hasn't enrolled, and they haven't skipped setup before. Unlike
  # should_show_totp_screen, access_token is ALREADY populated alongside
  # this flag — the frontend should log the user in and separately offer
  # (not force) MFA setup, e.g. via a dismissible hub with a Skip action.
  should_offer_mfa_setup: Boolean
```

Regenerate: `cd /Users/lakhansamani/projects/authorizer/authorizer && go run github.com/99designs/gqlgen --verbose generate && go mod tidy`

- [ ] **Step 2: Rewrite the TOTP branch in `login.go`**

Replace the block at `internal/service/login.go:349-386` (the `if refs.BoolValue(user.IsMultiFactorAuthEnabled) && isMFAEnabled && isTOTPLoginEnabled {` block):

```go
	// If mfa enabled and also totp enabled
	if isMFAEnabled && isTOTPLoginEnabled {
		authenticator, authErr := p.StorageProvider.GetAuthenticatorDetailsByUserId(ctx, user.ID, constants.EnvKeyTOTPAuthenticator)
		authenticatorVerified := authErr == nil && authenticator != nil && authenticator.VerifiedAt != nil
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
			return &model.AuthResponse{
				Message:              `Proceed to totp screen`,
				ShouldShowTotpScreen: refs.NewBoolRef(true),
			}, side, nil
		case mfaGateBlockEnroll:
			expiresAt := time.Now().Add(3 * time.Minute).Unix()
			if err := setOTPMFaSession(expiresAt); err != nil {
				log.Debug().Msg("Failed to set mfa session")
				return nil, nil, err
			}
			authConfig, err := p.AuthenticatorProvider.Generate(ctx, user.ID)
			if err != nil {
				log.Debug().Msg("Failed to generate totp")
				return nil, nil, err
			}
			recoveryCodes := []*string{}
			for _, code := range authConfig.RecoveryCodes {
				recoveryCodes = append(recoveryCodes, refs.NewStringRef(code))
			}
			return &model.AuthResponse{
				Message:                    `Proceed to totp verification screen`,
				ShouldShowTotpScreen:       refs.NewBoolRef(true),
				AuthenticatorScannerImage:  refs.NewStringRef(authConfig.ScannerImage),
				AuthenticatorSecret:        refs.NewStringRef(authConfig.Secret),
				AuthenticatorRecoveryCodes: recoveryCodes,
			}, side, nil
		case mfaGateOfferSetup:
			authConfig, err := p.AuthenticatorProvider.Generate(ctx, user.ID)
			if err != nil {
				log.Debug().Msg("Failed to generate totp for optional setup")
				return nil, nil, err
			}
			recoveryCodes := []*string{}
			for _, code := range authConfig.RecoveryCodes {
				recoveryCodes = append(recoveryCodes, refs.NewStringRef(code))
			}
			// Falls through to normal token issuance below, with the offer
			// flag and enrollment payload attached after CreateAuthToken.
			side.PendingTOTPOffer = &pendingTOTPOffer{
				ScannerImage:  authConfig.ScannerImage,
				Secret:        authConfig.Secret,
				RecoveryCodes: recoveryCodes,
			}
		case mfaGateSkippedSetup:
			side.OfferMFASetupQuiet = true
		case mfaGateNone:
			// fall through, nothing to do
		}
	}
```

This introduces two new fields on `ResponseSideEffects` (`internal/service/sideeffects.go` — find this file and add):

```go
	// PendingTOTPOffer carries a freshly generated (unverified) TOTP
	// enrollment payload to attach to the successful AuthResponse when the
	// MFA gate decided to OFFER (not force) setup. Nil otherwise.
	PendingTOTPOffer *pendingTOTPOffer
	// OfferMFASetupQuiet is true when the MFA gate decided the user already
	// skipped setup before — no enrollment payload, no offer flag, just a
	// normal login.
	OfferMFASetupQuiet bool
}

type pendingTOTPOffer struct {
	ScannerImage  string
	Secret        string
	RecoveryCodes []*string
}
```

- [ ] **Step 3: Attach the offer to the final success response**

In `internal/service/login.go`, find the final success response construction (around line 453, `res := &model.AuthResponse{...}`). Immediately after it, before the `for _, c := range cookie.BuildSessionCookies` loop, add:

```go
	res := &model.AuthResponse{
		Message:     `Logged in successfully`,
		AccessToken: &authToken.AccessToken.Token,
		IDToken:     &authToken.IDToken.Token,
		ExpiresIn:   &expiresIn,
		User:        user.AsAPIUser(),
	}
	if side.PendingTOTPOffer != nil {
		res.ShouldOfferMfaSetup = refs.NewBoolRef(true)
		res.AuthenticatorScannerImage = refs.NewStringRef(side.PendingTOTPOffer.ScannerImage)
		res.AuthenticatorSecret = refs.NewStringRef(side.PendingTOTPOffer.Secret)
		res.AuthenticatorRecoveryCodes = side.PendingTOTPOffer.RecoveryCodes
	}
```

- [ ] **Step 4: Build and run the unit tests**

Run: `cd /Users/lakhansamani/projects/authorizer/authorizer && go build ./... && go test ./internal/service/ -run TestResolveMFAGate -v`
Expected: builds clean, tests still pass.

- [ ] **Step 5: Manual local verification**

With the recipe server running (`--enforce-mfa=false`, per `examples/with-auth-recipes/run-server.sh`), log in as `lakhan@yopmail.com` / `Test@123#` via the raw GraphQL call used earlier in this session:

```bash
curl -s http://localhost:8080/graphql -X POST -H 'Content-Type: application/json' -d '{"query":"mutation login($data: LoginRequest!) { login(params: $data) { message access_token should_show_totp_screen should_offer_mfa_setup authenticator_secret } }","variables":{"data":{"email":"lakhan@yopmail.com","password":"Test@123#"}}}'
```

Expected: `access_token` is now populated (not null), `should_show_totp_screen` is null/false, `should_offer_mfa_setup` is true, `authenticator_secret` is a fresh TOTP secret. This confirms the exact stuck-login bug from this session is fixed.

- [ ] **Step 6: Commit**

```bash
git add internal/graph/schema.graphqls internal/graph/model/models_gen.go internal/graph/generated/generated.go internal/service/login.go internal/service/sideeffects.go
git commit -m "feat(mfa): issue a session immediately and offer (not force) TOTP setup when MFA isn't enforced"
```

---

### Task 4: Authenticated `skip_mfa_setup` mutation

**Files:**
- Modify: `internal/graph/schema.graphqls` (Mutation block, line ~1319)
- Create: `internal/service/skip_mfa_setup.go`
- Modify: `internal/service/provider.go` (interface)
- Create: `internal/graphql/skip_mfa_setup.go`
- Modify: `internal/graphql/provider.go` (interface)
- Modify: `internal/graph/schema.resolvers.go` (delegating stub, auto-inserted by codegen — hand-fill the body)

**Interfaces:**
- Consumes: `p.callerTokenData` pattern from `internal/service/deactivate_account.go:21` for authenticated-user extraction.
- Produces: GraphQL mutation `skip_mfa_setup: Response!`, consumed by `authorizer-js` Task 5 and `authorizer-react` Task 8.

- [ ] **Step 1: Add the mutation to the schema**

Edit `internal/graph/schema.graphqls`, in the `Mutation` block, add after `resend_otp(params: ResendOTPRequest!): Response!` (line ~1319):

```graphql
  resend_otp(params: ResendOTPRequest!): Response!
  # skip_mfa_setup records that the authenticated caller explicitly declined
  # the optional MFA setup prompt. Fails with FAILED_PRECONDITION if MFA is
  # organization-enforced (enforce-mfa) — enforcement is never skippable.
  skip_mfa_setup: Response!
```

- [ ] **Step 2: Write the service-layer implementation**

```go
// internal/service/skip_mfa_setup.go
package service

import (
	"context"
	"time"

	"github.com/authorizerdev/authorizer/internal/graph/model"
)

// SkipMFASetup records that the authenticated caller explicitly declined the
// optional MFA setup prompt shown at login. Never allowed when MFA is
// org-enforced — that path never offers a skip in the first place
// (resolveMFAGate never returns mfaGateOfferSetup when EnforceMFA is true),
// but this is re-checked here server-side so a client can never forge the
// request to bypass enforcement.
//
// Permissions: authenticated user (bearer token or session cookie).
func (p *provider) SkipMFASetup(ctx context.Context, meta RequestMetadata) (*model.Response, *ResponseSideEffects, error) {
	log := p.Log.With().Str("func", "SkipMFASetup").Logger()

	if p.Config.EnforceMFA {
		log.Debug().Msg("Cannot skip MFA setup as it is enforced")
		return nil, nil, FailedPrecondition("cannot skip multi factor authentication setup as it is enforced by organization")
	}

	tokenData, err := p.callerTokenData(ctx, meta)
	if err != nil || tokenData == nil || tokenData.UserID == "" {
		log.Debug().Err(err).Msg("Failed to get user id from session or access token")
		return nil, nil, Unauthenticated("unauthorized")
	}
	user, err := p.StorageProvider.GetUserByID(ctx, tokenData.UserID)
	if err != nil {
		log.Debug().Err(err).Msg("Failed to get user by id")
		return nil, nil, err
	}
	now := time.Now().Unix()
	user.HasSkippedMFASetupAt = &now
	if _, err := p.StorageProvider.UpdateUser(ctx, user); err != nil {
		log.Debug().Err(err).Msg("Failed to update user")
		return nil, nil, err
	}
	return &model.Response{Message: "MFA setup skipped"}, nil, nil
}
```

- [ ] **Step 3: Add to the service provider interface**

Edit `internal/service/provider.go`, add near `DeactivateAccount` (line ~101):

```go
	DeactivateAccount(ctx context.Context, meta RequestMetadata) (*model.Response, *ResponseSideEffects, error)
	// SkipMFASetup records that the authenticated caller declined optional
	// MFA setup. Fails if MFA is org-enforced.
	SkipMFASetup(ctx context.Context, meta RequestMetadata) (*model.Response, *ResponseSideEffects, error)
```

- [ ] **Step 4: Write the GraphQL-transport adapter**

```go
// internal/graphql/skip_mfa_setup.go
package graphql

import (
	"context"

	"github.com/authorizerdev/authorizer/internal/graph/model"
	"github.com/authorizerdev/authorizer/internal/metrics"
	"github.com/authorizerdev/authorizer/internal/service"
	"github.com/authorizerdev/authorizer/internal/utils"
)

func (g *graphqlProvider) SkipMFASetup(ctx context.Context) (*model.Response, error) {
	gc, err := utils.GinContextFromContext(ctx)
	if err != nil {
		g.Log.Debug().Err(err).Msg("failed to get gin context")
		metrics.RecordSecurityEvent(metrics.SecurityEventGinContextMissing, "graphql")
		return nil, err
	}
	res, side, err := g.ServiceProvider.SkipMFASetup(ctx, service.MetaFromGin(gc))
	if err != nil {
		return nil, err
	}
	service.ApplyToGin(gc, side)
	return res, nil
}
```

- [ ] **Step 5: Add to the GraphQL provider interface**

Edit `internal/graphql/provider.go`, add near `DeactivateAccount` (line ~98):

```go
	DeactivateAccount(ctx context.Context) (*model.Response, error)
	// SkipMFASetup is the method to skip optional MFA setup.
	SkipMFASetup(ctx context.Context) (*model.Response, error)
```

- [ ] **Step 6: Regenerate and fill the resolver stub**

Run: `cd /Users/lakhansamani/projects/authorizer/authorizer && go run github.com/99designs/gqlgen --verbose generate && go mod tidy`

This inserts a stub in `internal/graph/schema.resolvers.go`. Fill it to match the existing `DeactivateAccount` resolver pattern:

```go
func (r *mutationResolver) SkipMfaSetup(ctx context.Context) (*model.Response, error) {
	return r.GraphQLProvider.SkipMFASetup(ctx)
}
```

- [ ] **Step 7: Build**

Run: `cd /Users/lakhansamani/projects/authorizer/authorizer && go build ./...`
Expected: builds clean.

- [ ] **Step 8: Manual local verification**

Log in as `lakhan@yopmail.com` (Task 3's curl), capture the `access_token`, then:

```bash
curl -s http://localhost:8080/graphql -X POST \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer <access_token from above>" \
  -d '{"query":"mutation { skip_mfa_setup { message } }"}'
```

Expected: `{"data":{"skip_mfa_setup":{"message":"MFA setup skipped"}}}`. Re-run the Task 3 login curl again: `should_offer_mfa_setup` should now be false/null (quiet login).

- [ ] **Step 9: Commit**

```bash
git add internal/graph/schema.graphqls internal/graph/model/models_gen.go internal/graph/generated/generated.go internal/graph/schema.resolvers.go internal/service/skip_mfa_setup.go internal/service/provider.go internal/graphql/skip_mfa_setup.go internal/graphql/provider.go
git commit -m "feat(mfa): add skip_mfa_setup mutation, blocked when MFA is enforced"
```

---

## SDK (`authorizer-js` repo)

### Task 5: Expose the new response fields and mutation in the TypeScript client

**Files:**
- Modify: `/Users/lakhansamani/projects/authorizer/authorizer-js/src/types.ts` (`AuthResponse`, `User`)
- Modify: `/Users/lakhansamani/projects/authorizer/authorizer-js/src/index.ts` (new `skipMfaSetup` method)
- Modify: `/Users/lakhansamani/projects/authorizer/authorizer-js/package.json` (version bump)

**Interfaces:**
- Consumes: backend fields/mutation from Tasks 1-4.
- Produces: `Types.AuthResponse.should_offer_mfa_setup: boolean | null`, `Types.User.has_skipped_mfa_setup_at: number | null`, `authorizer.skipMfaSetup(): Promise<Types.ApiResponse<Types.GenericResponse>>` — consumed by `authorizer-react` Tasks 9-10.

- [ ] **Step 1: Add the new fields to `types.ts`**

Edit `/Users/lakhansamani/projects/authorizer/authorizer-js/src/types.ts`, in `interface User` (line 80-101), add after `is_multi_factor_auth_enabled: boolean | null;` (line 99):

```typescript
  is_multi_factor_auth_enabled: boolean | null;
  has_skipped_mfa_setup_at: number | null;
  app_data: Record<string, any> | null;
```

In `interface AuthResponse` (line 135-148), add after `should_show_totp_screen: boolean | null;` (line 139):

```typescript
  should_show_totp_screen: boolean | null;
  should_offer_mfa_setup: boolean | null;
```

- [ ] **Step 2: Add the `skipMfaSetup` method**

Edit `/Users/lakhansamani/projects/authorizer/authorizer-js/src/index.ts`, add a new method mirroring `resendOtp` (line 595-618) — place it near `verifyOtp`/`resendOtp`:

```typescript
  skipMfaSetup = async (): Promise<Types.ApiResponse<Types.GenericResponse>> => {
    try {
      const res = await this.dispatch(
        'skipMfaSetup',
        ['graphql'],
        {
          query: 'mutation skip_mfa_setup { skip_mfa_setup { message } }',
          operationName: 'skip_mfa_setup',
          op: 'skip_mfa_setup',
        },
        { method: 'POST', path: '/v1/skip_mfa_setup', body: {} },
        {},
      );

      return res?.errors?.length
        ? this.errorResponse(res.errors)
        : this.okResponse(res.data);
    } catch (err) {
      return this.errorResponse([err]);
    }
  };
```

Note: this mutation is authenticated via cookie/bearer token already attached by `dispatch` for other authenticated calls (check how `deactivateAccount` — if present — sends auth; mirror that exactly rather than `resendOtp`'s unauthenticated pattern if they differ).

- [ ] **Step 3: Build and bump version**

Run: `cd /Users/lakhansamani/projects/authorizer/authorizer-js && npm run build`
Expected: builds clean, `lib/index.js` and `lib/index.d.ts` regenerated with the new field/method.

Edit `package.json`: bump `"version"` from `3.3.0-rc.1` to `3.4.0-rc.0` (new feature, prerelease — matches the existing prerelease convention this repo already uses for `authorizer-react` integration, per this session's earlier `3.3.0-rc.1` bump).

- [ ] **Step 4: Commit**

```bash
git add src/types.ts src/index.ts package.json lib/
git commit -m "feat: expose should_offer_mfa_setup, has_skipped_mfa_setup_at, and skipMfaSetup()"
```

---

## Frontend (`authorizer-react` repo)

### Task 6: Point `authorizer-react` at the new local SDK build

**Files:**
- Modify: `/Users/lakhansamani/projects/authorizer/authorizer-react/package.json`

- [ ] **Step 1: Link the local SDK build**

Run: `cd /Users/lakhansamani/projects/authorizer/authorizer-react && npm install /Users/lakhansamani/projects/authorizer/authorizer-js`

This updates `package.json`'s `@authorizerdev/authorizer-js` dependency to the local `3.4.0-rc.0` build (same mechanism as the existing `3.3.0-rc.1` dependency from the passkey-autofill work).

- [ ] **Step 2: Typecheck**

Run: `cd /Users/lakhansamani/projects/authorizer/authorizer-react && npx tsc --noEmit -p tsconfig.json`
Expected: clean (no errors — this step just confirms the new SDK types are visible; nothing consumes them yet).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): bump @authorizerdev/authorizer-js to 3.4.0-rc.0 (optional MFA setup)"
```

---

### Task 7: Wire `AuthorizerBasicAuthLogin` to log in immediately and offer MFA setup

**Files:**
- Modify: `src/components/AuthorizerBasicAuthLogin.tsx` (the `onSubmit` TOTP branch, current lines ~102-118, and the render method)

**Interfaces:**
- Consumes: `res.should_offer_mfa_setup`, `res.authenticator_scanner_image/secret/recovery_codes`, `res.access_token` from Task 5's `AuthResponse`.
- Produces: nothing new — `res` (with `should_offer_mfa_setup` and the `authenticator_*` fields already on it once Task 6 is done) continues to flow to the existing `onLogin(res)` callback unchanged. The host app reads `should_offer_mfa_setup` off the argument it already receives — no new component state, no new prop. This is why `AuthorizerMFASetup` deliberately lives outside the login flow (Task 8): `AuthorizerBasicAuthLogin` unmounts the moment `token` is set (the host app's own router swaps away from the login screen, e.g. `example/src/App.tsx`'s `if (token) return <Dashboard />`), so any state held *inside* this component past that point would never render. Surfacing the offer as data on `res`, for the host app to act on wherever it renders next, sidesteps that entirely.

- [ ] **Step 1: Replace the forced-TOTP branch with the gate-aware branch**

In `src/components/AuthorizerBasicAuthLogin.tsx`, replace the block currently at (post-earlier-session-edits) roughly lines 101-118:

```typescript
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

with:

```typescript
      // res.access_token is only absent when MFA is enforced/blocking (see
      // resolveMFAGate in the backend) — in every other case, including the
      // optional-setup-offer case, the user is already logged in.
      if (res && !res.access_token) {
        if (
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
          res.should_show_email_otp_screen ||
          res.should_show_mobile_otp_screen ||
          res.should_show_totp_screen
        ) {
          setOtpData({
            is_screen_visible: true,
            email: data.email || ``,
            phone_number: data.phone_number || ``,
            is_totp: res.should_show_totp_screen || false,
          });
          return;
        }
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

Nothing else in this component changes — `res` (now carrying `should_offer_mfa_setup` and the `authenticator_*` fields per Task 6's type update) is already passed to `onLogin` unmodified by the existing `if (onLogin) { onLogin(res); }` call.

- [ ] **Step 2: Typecheck**

Run: `cd /Users/lakhansamani/projects/authorizer/authorizer-react && npx tsc --noEmit -p tsconfig.json`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/AuthorizerBasicAuthLogin.tsx
git commit -m "feat(mfa): log in immediately and surface should_offer_mfa_setup instead of blocking on optional TOTP setup"
```

---

### Task 8: Add a working Skip button to `AuthorizerMFASetup` and document the host-app integration

**Files:**
- Modify: `src/components/AuthorizerMFASetup.tsx`
- Modify: `example/src/pages/login.tsx` (demonstrate the new `onLogin` shape) and `example/src/pages/dashboard.tsx` (add a "Set up MFA" prompt, sourced from AuthorizerMFASetup — this is how a host app is expected to use it)

**Interfaces:**
- Consumes: `authorizerRef.skipMfaSetup()` from Task 5.
- Produces: `AuthorizerMFASetup` gains an `onSkip?: () => void` prop and a "Skip for now" link in the method-list view.

- [ ] **Step 1: Add the Skip action to the component**

In `src/components/AuthorizerMFASetup.tsx`, add `onSkip` to the props type (near `onSetupMethod`, line 67):

```typescript
  // Fired when a method is chosen that this component can't complete on its
  // own (email/SMS OTP, or TOTP without an enrolment payload).
  onSetupMethod?: (method: MfaMethod) => void;
  // Fired when the user explicitly declines to set up MFA right now. Absent
  // when MFA is organization-enforced — the host app must not render this
  // component with onSkip set in that case (check config before rendering).
  onSkip?: () => void;
  heading?: string;
```

Add it to the destructured props (line 69-74) and render a skip link at the bottom of the method-list view (after the `<ul className="mfa-list">` block, before the closing `</>` around line 214-216):

```typescript
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
```

- [ ] **Step 2: Wire an example usage in the demo app**

`AuthorizerMFASetup` is a standalone hub the *host app* renders wherever it wants (a settings page, a post-login interstitial) — it is intentionally NOT auto-rendered inside the login flow (confirmed in this session: its `availableMfaMethods`/`totpEnrollment` props require the host to already have this data, which now comes from `res.should_offer_mfa_setup` + `res.authenticator_*` on the `onLogin` callback argument, per Task 7).

Edit `example/src/pages/login.tsx` to capture the offer:

```typescript
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Authorizer } from 'authorizer-react';

const Login: React.FC = () => {
  const navigate = useNavigate();
  return (
    <>
      <h1 style={{ textAlign: 'center' }}>Welcome to Authorizer</h1>
      <br />
      <Authorizer
        onLogin={(loginData: any) => {
          if (loginData?.should_offer_mfa_setup) {
            sessionStorage.setItem(
              'mfaSetupOffer',
              JSON.stringify({
                authenticator_scanner_image: loginData.authenticator_scanner_image,
                authenticator_secret: loginData.authenticator_secret,
                authenticator_recovery_codes: loginData.authenticator_recovery_codes,
              })
            );
          }
        }}
      />
    </>
  );
};

export default Login;
```

Edit `example/src/pages/dashboard.tsx` to render the offer once, using `AuthorizerMFASetup` + `useAuthorizer()`'s `authorizerRef.skipMfaSetup()`:

```typescript
import * as React from 'react';
import { AuthorizerMFASetup, useAuthorizer } from 'authorizer-react';

const Dashboard: React.FC = () => {
  const { authorizerRef, logout } = useAuthorizer();
  const [offer, setOffer] = React.useState<any>(() => {
    const raw = sessionStorage.getItem('mfaSetupOffer');
    return raw ? JSON.parse(raw) : null;
  });

  const dismiss = () => {
    sessionStorage.removeItem('mfaSetupOffer');
    setOffer(null);
  };

  if (offer) {
    return (
      <AuthorizerMFASetup
        availableMfaMethods={{ totp: true }}
        totpEnrollment={offer}
        onSkip={async () => {
          await authorizerRef.skipMfaSetup();
          dismiss();
        }}
      />
    );
  }

  return (
    <div>
      <h1>Dashboard</h1>
      <button onClick={() => logout()}>Logout</button>
    </div>
  );
};

export default Dashboard;
```

- [ ] **Step 3: Typecheck and build**

Run: `cd /Users/lakhansamani/projects/authorizer/authorizer-react && npx tsc --noEmit -p tsconfig.json && npm run build`
Expected: clean.

Run: `cd /Users/lakhansamani/projects/authorizer/authorizer-react/example && npx tsc --noEmit -p tsconfig.json`
Expected: clean.

- [ ] **Step 4: End-to-end local verification**

With the recipe server running and `lakhan@yopmail.com`'s `HasSkippedMFASetupAt` cleared (fresh state — re-run Task 3's curl to confirm `should_offer_mfa_setup: true` server-side first), start the example app (`npm start` in `example/`) and log in as `lakhan@yopmail.com` / `Test@123#` through the actual UI:

Expected: immediate login to the Dashboard (no forced TOTP screen), followed by the `AuthorizerMFASetup` hub showing the TOTP QR with a working "Skip for now" link. Click Skip — expected: returns to the plain dashboard. Log out and log back in — expected: straight to dashboard, no MFA prompt (quiet, per `mfaGateSkippedSetup`).

- [ ] **Step 5: Commit**

```bash
git add src/components/AuthorizerMFASetup.tsx example/src/pages/login.tsx example/src/pages/dashboard.tsx
git commit -m "feat(mfa): add Skip action to AuthorizerMFASetup and demonstrate host-app wiring"
```

---

## Deferred Work (documented, not built in this plan)

**Passkey-as-MFA (second-factor WebAuthn, distinct from today's passkey-as-primary-login).** Confirmed absent from the backend entirely: no `EnvKeyWebauthnAuthenticator` constant (only `EnvKeyTOTPAuthenticator` exists in `internal/constants/authenticator_method.go`), no enrollment-during-MFA-gate logic. This is a legitimate MFA pattern (Okta and Auth0 both support "security key/biometric" as a second factor, distinct from passwordless primary login) but is its own project: new authenticator-type constant, WebAuthn ceremony wiring inside `resolveMFAGate`'s `mfaGateBlockEnroll`/`mfaGateOfferSetup` cases, and a fourth option in `AuthorizerMFASetup`'s method list (which already has the UI scaffolding — `availableMfaMethods.passkey` — just no backend behind it for the MFA case). Should be its own plan once this one has shipped and been used for a while.

**Email/SMS OTP "not yet enrolled" parity.** Unlike TOTP, email and SMS OTP have no persistent enrollment artifact to pre-register — each login simply sends a fresh code. There is no equivalent to "scan this QR once" for these methods, so the enforced/optional/skip distinction this plan builds for TOTP doesn't map onto them the same way. The top-level "does this user have MFA turned on at all" decision (Tasks 3-4) already covers email/SMS OTP correctly; per-method "enrollment" simply isn't a concept that applies to them. No further work needed here unless a future requirement specifically calls for it.
