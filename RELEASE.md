# Release Guide

This guide explains how to release new versions of `@authorizerdev/authorizer-react`.

## Quick Release (RC)

For release candidates:

```bash
# Option 1: Interactive (will prompt for version)
make release-rc

# Option 2: With version specified
make release-rc VERSION=2.0.0-rc.1

# The command will:
# - Show current version
# - Show what will change
# - Ask for confirmation
# - Update package.json
# - Build the library

# Then publish (includes git commit, tag, push, and npm publish):
make publish-rc  # Will ask for confirmation, then:
                 # - Commit changes (if any)
                 # - Create and push git tag
                 # - Push to origin
                 # - Publish to npm
```

## Quick Release (Stable)

For stable releases:

```bash
# Interactive release (auto-calculates version, asks for confirmation)
make release-patch   # 2.0.0 -> 2.0.1
make release-minor   # 2.0.0 -> 2.1.0
make release-major   # 2.0.0 -> 3.0.0

# The command will:
# - Show current and new version
# - Ask for confirmation
# - Update package.json automatically
# - Build the library

# Then publish (includes git commit, tag, push, and npm publish):
make publish  # Will ask for confirmation, then:
              # - Commit changes (if any)
              # - Create and push git tag
              # - Push to origin
              # - Publish to npm
```

## Release Checklist

Before releasing, ensure:

- [ ] All tests pass: `make test`
- [ ] Linting passes: `make lint`
- [ ] Type checking passes: `make type-check`
- [ ] Build succeeds: `make build`
- [ ] CHANGELOG.md is updated
- [ ] Version is correct in package.json
- [ ] Example app works: `cd example && npm start`
- [ ] No console errors in browser
- [ ] Styles load correctly

## Version Numbering

- **RC releases**: `2.0.0-rc.1`, `2.0.0-rc.2`, etc.
- **Patch releases**: `2.0.0` → `2.0.1` (bug fixes)
- **Minor releases**: `2.0.0` → `2.1.0` (new features, backward compatible)
- **Major releases**: `2.0.0` → `3.0.0` (breaking changes)

## Makefile Commands

### Development
- `make install` - Install dependencies
- `make build` - Build the library
- `make start` - Start watch mode
- `make lint` - Run linter
- `make type-check` - TypeScript type checking
- `make clean` - Clean build artifacts

### Release
- `make release-rc VERSION=X.X.X-rc.X` - Create RC release
- `make release-patch` - Bump patch version
- `make release-minor` - Bump minor version
- `make release-major` - Bump major version
- `make publish-rc` - Publish RC to npm (with `rc` tag)
- `make publish` - Publish stable to npm (with `latest` tag)

### Full Workflow
- `make full-release-patch` - Run checks + bump patch + build
- `make full-release-minor` - Run checks + bump minor + build
- `make full-release-major` - Run checks + bump major + build

## Current Release: 2.0.0-rc.1

This RC includes:
- ✅ Migration from tsdx to tsup
- ✅ Updated to authorizer-js@3.0.0-rc.1
- ✅ Fixed styling system (CSS variables)
- ✅ Updated React to 18.3.1
- ✅ Modern build output (CJS/ESM)
- ✅ Improved TypeScript support

