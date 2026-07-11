.PHONY: help build test lint type-check clean install release-rc release-patch release-minor release-major publish-rc publish prepublish

# Default target
help:
	@echo "Authorizer React - Makefile Commands"
	@echo ""
	@echo "Development:"
	@echo "  make install       - Install dependencies"
	@echo "  make build         - Build the library"
	@echo "  make start         - Start watch mode"
	@echo "  make test          - Run tests"
	@echo "  make lint          - Run linter"
	@echo "  make type-check    - Run TypeScript type checking"
	@echo "  make clean         - Clean build artifacts"
	@echo ""
	@echo "Release (RC):"
	@echo "  make release-rc [VERSION=X.X.X-rc.X]  - Create RC release (interactive)"
	@echo "  make publish-rc                       - Publish RC (git commit/tag/push + npm)"
	@echo ""
	@echo "Release (Stable):"
	@echo "  make release-patch                   - Bump patch version (1.0.0 -> 1.0.1, interactive)"
	@echo "  make release-minor                   - Bump minor version (1.0.0 -> 1.1.0, interactive)"
	@echo "  make release-major                   - Bump major version (1.0.0 -> 2.0.0, interactive)"
	@echo "  make publish                         - Publish stable (git commit/tag/push + npm)"
	@echo ""
	@echo "Note: All release commands are interactive and will:"
	@echo "  - Show current and new version"
	@echo "  - Ask for confirmation before making changes"
	@echo ""
	@echo "Example:"
	@echo "  make release-rc VERSION=2.0.0-rc.1"
	@echo "  make release-patch  # Will auto-calculate and ask for confirmation"

# Development commands
install:
	@echo "📦 Installing dependencies..."
	npm install

build:
	@echo "🔨 Building library..."
	npm run build
	@echo "✅ Build complete!"

start:
	@echo "👀 Starting watch mode..."
	npm start

test:
	@echo "🧪 Running tests..."
	npm test

lint:
	@echo "🔍 Running linter..."
	npm run lint

type-check:
	@echo "📝 Type checking..."
	npm run type-check

clean:
	@echo "🧹 Cleaning build artifacts..."
	rm -rf dist
	rm -rf node_modules/.cache
	@echo "✅ Clean complete!"

# Release commands
release-rc:
	@CURRENT=$$(npm pkg get version | tr -d '"'); \
	if [ -z "$(VERSION)" ]; then \
		echo ""; \
		echo "Current version: $$CURRENT"; \
		echo ""; \
		echo "Enter the RC version (e.g., 2.0.0-rc.1):"; \
		read -r VERSION; \
		if [ -z "$$VERSION" ]; then \
			echo "❌ Error: VERSION is required"; \
			exit 1; \
		fi; \
	else \
		VERSION=$(VERSION); \
	fi; \
	echo ""; \
	echo "🚀 Creating RC release: $$VERSION"; \
	echo "📝 Will update package.json from $$CURRENT to $$VERSION"; \
	echo ""; \
	echo "⚠️  This will:"; \
	echo "   - Update package.json version to $$VERSION"; \
	echo "   - Build the library"; \
	echo ""; \
	read -p "Continue? (y/N): " confirm; \
	if [ "$$confirm" != "y" ] && [ "$$confirm" != "Y" ]; then \
		echo "❌ Release cancelled"; \
		exit 1; \
	fi; \
	echo ""; \
	echo "📝 Updating package.json version..."; \
	npm pkg set version=$$VERSION; \
	echo "🔨 Building library..."; \
	npm run build; \
	echo ""; \
	echo "✅ RC release $$VERSION ready!"; \
	echo ""; \
	echo "📋 Release Checklist:"; \
	echo "  ✓ Version updated to $$VERSION"; \
	echo "  ✓ Library built successfully"; \
	echo ""; \
	echo "Next step:"; \
	echo "  make publish-rc  # Will handle git commit, tag, push, and npm publish"

release-patch:
	@CURRENT=$$(npm pkg get version | tr -d '"'); \
	BASE=$$(echo "$$CURRENT" | sed 's/-.*//'); \
	NEW=$$(node -p "const v='$$BASE'.split('.'); v[2]=(parseInt(v[2])+1).toString(); v.join('.')"); \
	echo ""; \
	echo "🚀 Creating patch release..."; \
	echo "📝 Current version: $$CURRENT"; \
	echo "📝 New version: $$NEW"; \
	echo ""; \
	echo "⚠️  This will:"; \
	echo "   - Update package.json version from $$CURRENT to $$NEW"; \
	echo "   - Build the library"; \
	echo ""; \
	read -p "Continue? (y/N): " confirm; \
	if [ "$$confirm" != "y" ] && [ "$$confirm" != "Y" ]; then \
		echo "❌ Release cancelled"; \
		exit 1; \
	fi; \
	echo ""; \
	npm pkg set version=$$NEW; \
	echo "📝 Version updated to: $$NEW"; \
	make build; \
	echo "✅ Patch release $$NEW ready!"

release-minor:
	@CURRENT=$$(npm pkg get version | tr -d '"'); \
	BASE=$$(echo "$$CURRENT" | sed 's/-.*//'); \
	NEW=$$(node -p "const v='$$BASE'.split('.'); v[1]=(parseInt(v[1])+1).toString(); v[2]='0'; v.join('.')"); \
	echo ""; \
	echo "🚀 Creating minor release..."; \
	echo "📝 Current version: $$CURRENT"; \
	echo "📝 New version: $$NEW"; \
	echo ""; \
	echo "⚠️  This will:"; \
	echo "   - Update package.json version from $$CURRENT to $$NEW"; \
	echo "   - Build the library"; \
	echo ""; \
	read -p "Continue? (y/N): " confirm; \
	if [ "$$confirm" != "y" ] && [ "$$confirm" != "Y" ]; then \
		echo "❌ Release cancelled"; \
		exit 1; \
	fi; \
	echo ""; \
	npm pkg set version=$$NEW; \
	echo "📝 Version updated to: $$NEW"; \
	make build; \
	echo "✅ Minor release $$NEW ready!"

release-major:
	@CURRENT=$$(npm pkg get version | tr -d '"'); \
	BASE=$$(echo "$$CURRENT" | sed 's/-.*//'); \
	NEW=$$(node -p "const v='$$BASE'.split('.'); v[0]=(parseInt(v[0])+1).toString(); v[1]='0'; v[2]='0'; v.join('.')"); \
	echo ""; \
	echo "🚀 Creating major release..."; \
	echo "📝 Current version: $$CURRENT"; \
	echo "📝 New version: $$NEW"; \
	echo ""; \
	echo "⚠️  This will:"; \
	echo "   - Update package.json version from $$CURRENT to $$NEW"; \
	echo "   - Build the library"; \
	echo ""; \
	read -p "Continue? (y/N): " confirm; \
	if [ "$$confirm" != "y" ] && [ "$$confirm" != "Y" ]; then \
		echo "❌ Release cancelled"; \
		exit 1; \
	fi; \
	echo ""; \
	npm pkg set version=$$NEW; \
	echo "📝 Version updated to: $$NEW"; \
	make build; \
	echo "✅ Major release $$NEW ready!"

# Publish commands
publish-rc:
	@VERSION=$$(npm pkg get version | tr -d '"'); \
	if [[ ! "$$VERSION" =~ -rc\.[0-9]+$$ ]]; then \
		echo "❌ Error: Version $$VERSION doesn't look like an RC (should end with -rc.X)"; \
		exit 1; \
	fi; \
	echo ""; \
	echo "📦 Publishing RC to npm..."; \
	echo "📦 Package: @authorizerdev/authorizer-react"; \
	echo "📦 Version: $$VERSION"; \
	echo "📦 Tag: rc"; \
	echo ""; \
	echo "⚠️  This will:"; \
	echo "   1. Commit changes (if any)"; \
	echo "   2. Create git tag v$$VERSION"; \
	echo "   3. Push to origin"; \
	echo "   4. Publish to npm registry"; \
	echo ""; \
	read -p "Continue? (y/N): " confirm; \
	if [ "$$confirm" != "y" ] && [ "$$confirm" != "Y" ]; then \
		echo "❌ Publish cancelled"; \
		exit 1; \
	fi; \
	echo ""; \
	echo "🔍 Checking git status..."; \
	if [ -n "$$(git status --porcelain)" ]; then \
		echo "📝 Staging changes..."; \
		git add .; \
		echo "💾 Committing changes..."; \
		git commit -m "chore: release $$VERSION" || echo "⚠️  Commit failed or nothing to commit"; \
	else \
		echo "✓ No uncommitted changes"; \
	fi; \
	if ! git rev-parse "v$$VERSION" >/dev/null 2>&1; then \
		echo "🏷️  Creating git tag v$$VERSION..."; \
		git tag v$$VERSION; \
	else \
		echo "⚠️  Tag v$$VERSION already exists"; \
	fi; \
	echo "📤 Pushing to origin..."; \
	git push origin main 2>/dev/null || git push origin master 2>/dev/null || echo "⚠️  Push failed or already up to date"; \
	git push origin v$$VERSION 2>/dev/null || echo "⚠️  Tag push failed or already exists"; \
	echo ""; \
	echo "📦 Publishing to npm..."; \
	npm publish --tag rc --access public; \
	echo ""; \
	echo "✅ Published @authorizerdev/authorizer-react@$$VERSION to npm with 'rc' tag!"

publish:
	@VERSION=$$(npm pkg get version | tr -d '"'); \
	if [[ "$$VERSION" =~ -rc\.[0-9]+$$ ]]; then \
		echo "❌ Error: Version $$VERSION is an RC. Use 'make publish-rc' instead"; \
		exit 1; \
	fi; \
	echo ""; \
	echo "📦 Publishing stable release to npm..."; \
	echo "📦 Package: @authorizerdev/authorizer-react"; \
	echo "📦 Version: $$VERSION"; \
	echo "📦 Tag: latest"; \
	echo ""; \
	echo "⚠️  This will:"; \
	echo "   1. Commit changes (if any)"; \
	echo "   2. Create git tag v$$VERSION"; \
	echo "   3. Push to origin"; \
	echo "   4. Publish to npm registry as latest"; \
	echo ""; \
	read -p "Continue? (y/N): " confirm; \
	if [ "$$confirm" != "y" ] && [ "$$confirm" != "Y" ]; then \
		echo "❌ Publish cancelled"; \
		exit 1; \
	fi; \
	echo ""; \
	echo "🔍 Checking git status..."; \
	if [ -n "$$(git status --porcelain)" ]; then \
		echo "📝 Staging changes..."; \
		git add .; \
		echo "💾 Committing changes..."; \
		git commit -m "chore: release $$VERSION" || echo "⚠️  Commit failed or nothing to commit"; \
	else \
		echo "✓ No uncommitted changes"; \
	fi; \
	if ! git rev-parse "v$$VERSION" >/dev/null 2>&1; then \
		echo "🏷️  Creating git tag v$$VERSION..."; \
		git tag v$$VERSION; \
	else \
		echo "⚠️  Tag v$$VERSION already exists"; \
	fi; \
	echo "📤 Pushing to origin..."; \
	git push origin main 2>/dev/null || git push origin master 2>/dev/null || echo "⚠️  Push failed or already up to date"; \
	git push origin v$$VERSION 2>/dev/null || echo "⚠️  Tag push failed or already exists"; \
	echo ""; \
	echo "📦 Publishing to npm..."; \
	npm publish --access public; \
	echo ""; \
	echo "✅ Published @authorizerdev/authorizer-react@$$VERSION to npm!"

# Pre-publish checks
prepublish: clean build type-check lint
	@echo "✅ All pre-publish checks passed!"

# Full release workflow (for stable releases)
full-release-patch: prepublish release-patch
	@echo "✅ Full patch release workflow complete!"

full-release-minor: prepublish release-minor
	@echo "✅ Full minor release workflow complete!"

full-release-major: prepublish release-major
	@echo "✅ Full major release workflow complete!"

