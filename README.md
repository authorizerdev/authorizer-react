# authorizer-react

React SDK for [authorizer.dev](https://authorizer.dev). Adds authentication to your [React](https://reactjs.org/) application in minutes. Current version: **2.1.0**.

## Code Sandbox Demo: https://codesandbox.io/s/authorizer-demo-qgjpw

## Step 1 - Create an Authorizer instance

Deploy an Authorizer instance and grab the URL and client ID from the dashboard. See the [deployment guide](https://docs.authorizer.dev/deployment).

## Step 2 - Install package

```sh
npm i --save @authorizerdev/authorizer-react
# or
yarn add @authorizerdev/authorizer-react
```

## Step 3 - Import styles

```jsx
// In your entry file (index.js, App.js, _app.js, etc.)
import '@authorizerdev/authorizer-react/styles.css';
```

Override the default theme using CSS variables:

```css
:root {
  --authorizer-primary-color: #3b82f6;
  --authorizer-primary-disabled-color: #60a5fa;
  --authorizer-danger-color: #dc2626;
  --authorizer-success-color: #10b981;
  --authorizer-text-color: #374151;
  --authorizer-fonts-font-stack: -apple-system, system-ui, sans-serif;
  --authorizer-fonts-medium-text: 14px;
  --authorizer-radius-button: 5px;
  --authorizer-radius-input: 5px;
}
```

## Step 4 - Configure provider and use components

```jsx
import {
  AuthorizerProvider,
  Authorizer,
  useAuthorizer,
} from '@authorizerdev/authorizer-react';

const App = () => {
  return (
    <AuthorizerProvider
      config={{
        authorizerURL: 'http://localhost:8080',
        redirectURL: window.location.origin,
        clientID: 'YOUR_CLIENT_ID',
      }}
      // optional — 'graphql' (default) or 'rest'
      protocol="graphql"
    >
      <LoginSignup />
      <Profile />
    </AuthorizerProvider>
  );
};

const LoginSignup = () => {
  return <Authorizer />;
};

const Profile = () => {
  const { user } = useAuthorizer();
  if (user) {
    return <div>{user.email}</div>;
  }
  return null;
};
```

### `AuthorizerProvider` props

| Prop                   | Type                        | Required | Description                                      |
| ---------------------- | --------------------------- | -------- | ------------------------------------------------ |
| `config`               | `ConfigType`                | Yes      | Authorizer connection config (see below)         |
| `protocol`             | `'graphql' \| 'rest'`       | No       | Transport protocol. Defaults to `'graphql'`      |
| `onStateChangeCallback` | `(state: AuthorizerState) => void` | No | Called whenever auth state changes         |

The `protocol` prop selects which transport the underlying `authorizer-js` SDK uses. Use `'rest'` if your deployment restricts the GraphQL endpoint.

### `config` fields

| Field                                   | Type      | Description                                             |
| --------------------------------------- | --------- | ------------------------------------------------------- |
| `authorizerURL`                         | `string`  | Base URL of your Authorizer instance                    |
| `redirectURL`                           | `string`  | URL to redirect to after login                          |
| `clientID`                              | `string`  | Client ID from the dashboard                            |
| `is_google_login_enabled`               | `boolean` | Google social login                                     |
| `is_github_login_enabled`               | `boolean` | GitHub social login                                     |
| `is_facebook_login_enabled`             | `boolean` | Facebook social login                                   |
| `is_linkedin_login_enabled`             | `boolean` | LinkedIn social login                                   |
| `is_apple_login_enabled`                | `boolean` | Apple social login                                      |
| `is_twitter_login_enabled`              | `boolean` | Twitter/X social login                                  |
| `is_microsoft_login_enabled`            | `boolean` | Microsoft social login                                  |
| `is_twitch_login_enabled`               | `boolean` | Twitch social login                                     |
| `is_discord_login_enabled`              | `boolean` | Discord social login                                    |
| `is_roblox_login_enabled`               | `boolean` | Roblox social login                                     |
| `is_basic_authentication_enabled`       | `boolean` | Email/password login                                    |
| `is_magic_link_login_enabled`           | `boolean` | Magic link (passwordless) login                         |
| `is_sign_up_enabled`                    | `boolean` | Allow new user registration                             |
| `is_strong_password_enabled`            | `boolean` | Enforce strong password policy                          |
| `is_multi_factor_auth_enabled`          | `boolean` | TOTP-based two-factor authentication                    |
| `is_mobile_basic_authentication_enabled`| `boolean` | Mobile (phone number + password) authentication         |
| `is_phone_verification_enabled`         | `boolean` | Phone number OTP verification                           |

These fields are populated automatically from the server's `/api/meta` response when `AuthorizerProvider` mounts.

---

## Local Development

```bash
# Build in watch mode
npm start

# Run the example app in another terminal
cd example
npm i
npm start

# One-off build
npm run build

# Tests
npm test

# Storybook
npm run storybook
npm run build-storybook

# Bundle analysis
npm run size
npm run analyze
```

---

## Release

1. Bump the version in `package.json`.
2. Tag the commit: `git tag v<version>`
3. Push with tags: `git push origin main --tags`

The GitHub Actions release workflow handles npm publish and GitHub Release creation automatically.
