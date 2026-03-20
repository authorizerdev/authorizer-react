# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0-rc.1] - 2025-12-30

### 🚀 Major Changes

#### Build System Migration
- **BREAKING**: Migrated from `tsdx` to `tsup` for faster builds and better TypeScript support
- Updated build output format:
  - CJS: `dist/index.cjs` (was `dist/index.js`)
  - ESM: `dist/index.mjs` (was `dist/authorizer-react.esm.js`)
  - Types: `dist/index.d.ts`
- Added modern `exports` field in package.json for better module resolution

#### Dependencies Update
- **BREAKING**: Updated `@authorizerdev/authorizer-js` from `^2.0.3` to `3.0.0-rc.1`
- Updated React from `^18.2.0` to `^18.3.1` (dev dependency)
- Updated TypeScript from `^5.2.2` to `^5.7.2`
- Updated Storybook from `^8.2.7` to `8.4.0` (pinned versions)
- Updated all other dev dependencies to latest stable versions
- **BREAKING**: Minimum Node.js version increased from `>=10` to `>=18`

#### Type System Updates
- **BREAKING**: Updated type imports to match authorizer-js v3:
  - `SignupInput` → `SignUpRequest`
  - `LoginInput` → `LoginRequest`
  - `VerifyOtpInput` → `VerifyOTPRequest`
  - `MagicLinkLoginInput` → `MagicLinkLoginRequest`
- Fixed token type handling to use full `AuthResponse` instead of partial objects
- Added null safety checks for `expires_in` field

#### Code Modernization
- Removed unused React imports (using new JSX transform)
- Updated all components to use modern React patterns
- Fixed TypeScript strict mode compliance
- Improved type safety throughout the codebase

### ✨ New Features
- Added `type-check` script for TypeScript validation
- Improved ESLint configuration with React and TypeScript support
- Better error handling and type safety

### 🔧 Technical Improvements
- Faster build times with tsup (esbuild-based)
- Better tree-shaking and code splitting
- Improved source maps
- Modern module resolution with package.json exports

### 📝 Migration Guide

If you're upgrading from v1.x:

1. **Update your imports** (if using types directly):
   ```typescript
   // Old
   import { SignupInput, LoginInput } from '@authorizerdev/authorizer-js';
   
   // New
   import { SignUpRequest, LoginRequest } from '@authorizerdev/authorizer-js';
   ```

2. **Ensure Node.js >= 18** is installed

3. **Rebuild your project** after updating the package

### ⚠️ Breaking Changes
- Build output file names changed (CJS/ESM)
- Type names updated to match authorizer-js v3
- Minimum Node.js version is now 18+
- Some internal APIs may have changed

---

## [1.3.3] - Previous Release

Previous stable release before major v2.0.0 update.

