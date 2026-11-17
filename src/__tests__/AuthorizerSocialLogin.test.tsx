import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { AuthorizerSocialLogin } from '../components/AuthorizerSocialLogin';

const AUTHORIZER = 'https://auth.example.com';
const CLIENT_CALLBACK = 'https://app.example.org/cb';

let authorizerURL = AUTHORIZER;
vi.mock('../contexts/AuthorizerContext', () => ({
  useAuthorizer: () => ({
    config: {
      authorizerURL,
      redirectURL: `${AUTHORIZER}/app`,
      is_github_login_enabled: true,
      is_mfa_enforced: true, // keeps the passkey separator logic out of the way
    },
  }),
}));

// jsdom cannot navigate, so replace window.location with a plain object that
// records the href each button assigns.
const realLocation = window.location;
const setLocation = (url: string) => {
  const u = new URL(url);
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: {
      origin: u.origin,
      pathname: u.pathname,
      search: u.search,
      hash: u.hash,
      href: url,
    },
  });
};

// clickGithub returns the /oauth_login query the GitHub button navigates to.
const clickGithub = () => {
  fireEvent.click(screen.getByText('Continue with Github'));
  const target = new URL(window.location.href);
  expect(target.origin + target.pathname).toBe(
    `${AUTHORIZER}/oauth_login/github`
  );
  return target.searchParams;
};

// urlProps as web/app's Root builds them from the /app URL.
const urlPropsFor = (redirect: string) => ({
  state: 's1',
  scope: ['openid', 'profile', 'email'],
  redirect_uri: redirect,
  redirectURL: redirect,
});

const AUTHORIZE_QUERY =
  'state=s1&scope=openid+profile+email&redirect_uri=https%3A%2F%2Fapp.example.org%2Fcb' +
  '&response_mode=query&response_type=code&client_id=c1&nonce=n1';

describe('AuthorizerSocialLogin redirect_uri', () => {
  beforeEach(() => {
    authorizerURL = AUTHORIZER;
  });
  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: realLocation,
    });
  });

  it('inside an /authorize request on /app, returns to /app, not to the client', () => {
    // The URL a browser is on: Authorizer 301s /app to /app/.
    const appURL = `${AUTHORIZER}/app/?${AUTHORIZE_QUERY}`;
    setLocation(appURL);
    render(<AuthorizerSocialLogin urlProps={urlPropsFor(CLIENT_CALLBACK)} />);

    const q = clickGithub();
    expect(q.get('redirect_uri')).toBe(appURL);
    // The server reads redirectURL first, so a stale client callback there
    // would win; it must not be sent.
    expect(q.has('redirectURL')).toBe(false);
    expect(q.get('state')).toBe('s1');
  });

  it('with response_mode=fragment, sends the parameters in the query string', () => {
    setLocation(`${AUTHORIZER}/app#${AUTHORIZE_QUERY}`);
    render(<AuthorizerSocialLogin urlProps={urlPropsFor(CLIENT_CALLBACK)} />);

    const back = new URL(clickGithub().get('redirect_uri')!);
    expect(back.hash).toBe('');
    expect(back.searchParams.get('nonce')).toBe('n1');
  });

  it('on your own site, keeps the redirect_uri you passed', () => {
    authorizerURL = AUTHORIZER;
    setLocation(`https://myapp.example.com/login?${AUTHORIZE_QUERY}`);
    render(
      <AuthorizerSocialLogin
        urlProps={urlPropsFor('https://myapp.example.com/dashboard')}
      />
    );

    const q = clickGithub();
    expect(q.get('redirect_uri')).toBe('https://myapp.example.com/dashboard');
    expect(q.get('redirectURL')).toBe('https://myapp.example.com/dashboard');
  });

  it('on /app with no /authorize request, keeps the default redirect', () => {
    setLocation(`${AUTHORIZER}/app`);
    render(
      <AuthorizerSocialLogin urlProps={urlPropsFor(`${AUTHORIZER}/app`)} />
    );

    expect(clickGithub().get('redirect_uri')).toBe(`${AUTHORIZER}/app`);
  });
});
