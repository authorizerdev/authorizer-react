import { describe, expect, it } from 'vitest';

import { getAuthorizeResumeURL } from '../utils/authorizeResume';

const AUTHORIZER = 'https://auth.example.com';

// What /authorize appends when it hands an unauthenticated user to /app.
const AUTHORIZE_QUERY =
  'state=s1&scope=openid+profile+email&redirect_uri=https%3A%2F%2Fapp.example.org%2Fcb' +
  '&response_mode=query&response_type=code&client_id=c1&nonce=n1' +
  '&code_challenge=ch&code_challenge_method=S256';

const loc = (url: string) => {
  const u = new URL(url);
  return {
    origin: u.origin,
    pathname: u.pathname,
    search: u.search,
    hash: u.hash,
  };
};

describe('getAuthorizeResumeURL', () => {
  it('returns the /app URL with every /authorize parameter', () => {
    const got = getAuthorizeResumeURL(
      AUTHORIZER,
      loc(`${AUTHORIZER}/app?${AUTHORIZE_QUERY}`)
    );
    expect(got).not.toBeNull();
    const u = new URL(got!);
    expect(u.origin + u.pathname).toBe(`${AUTHORIZER}/app`);
    expect(Object.fromEntries(u.searchParams)).toEqual(
      Object.fromEntries(new URLSearchParams(AUTHORIZE_QUERY))
    );
  });

  it('works on /app/, the URL a browser is actually on (Authorizer 301s /app to /app/)', () => {
    const got = getAuthorizeResumeURL(
      AUTHORIZER,
      loc(`${AUTHORIZER}/app/?${AUTHORIZE_QUERY}`)
    );
    const u = new URL(got!);
    expect(u.pathname).toBe('/app/');
    expect(u.searchParams.get('client_id')).toBe('c1');
  });

  it('works on /app/signup (screen_hint=signup)', () => {
    const got = getAuthorizeResumeURL(
      AUTHORIZER,
      loc(`${AUTHORIZER}/app/signup?${AUTHORIZE_QUERY}`)
    );
    expect(new URL(got!).pathname).toBe('/app/signup');
  });

  it('moves fragment parameters (response_mode=fragment) into the query', () => {
    const got = getAuthorizeResumeURL(
      AUTHORIZER,
      loc(`${AUTHORIZER}/app#${AUTHORIZE_QUERY}`)
    );
    const u = new URL(got!);
    expect(u.hash).toBe('');
    expect(u.searchParams.get('client_id')).toBe('c1');
    expect(u.searchParams.get('nonce')).toBe('n1');
  });

  it('lets query values win over fragment values, as /app does', () => {
    const got = getAuthorizeResumeURL(
      AUTHORIZER,
      loc(
        `${AUTHORIZER}/app?client_id=fromQuery&response_type=code#client_id=fromHash&state=s`
      )
    );
    const u = new URL(got!);
    expect(u.searchParams.get('client_id')).toBe('fromQuery');
    expect(u.searchParams.get('state')).toBe('s');
  });

  it.each([
    [
      'a login UI on your own site',
      `https://myapp.example.com/app?${AUTHORIZE_QUERY}`,
    ],
    ['another port', `https://auth.example.com:8443/app?${AUTHORIZE_QUERY}`],
    ['another scheme', `http://auth.example.com/app?${AUTHORIZE_QUERY}`],
    ['another path', `${AUTHORIZER}/app/forgot-password?${AUTHORIZE_QUERY}`],
    [
      '/app/signup/ with a trailing slash',
      `${AUTHORIZER}/app/signup/?${AUTHORIZE_QUERY}`,
    ],
    ['plain /app sign-in, no /authorize request', `${AUTHORIZER}/app`],
    ['no response_type', `${AUTHORIZER}/app?client_id=c1&state=s`],
    ['no client_id', `${AUTHORIZER}/app?response_type=code&state=s`],
  ])('returns null for %s', (_name, url) => {
    expect(getAuthorizeResumeURL(AUTHORIZER, loc(url))).toBeNull();
  });

  it('returns null when authorizerURL is not a URL', () => {
    expect(
      getAuthorizeResumeURL('', loc(`${AUTHORIZER}/app?${AUTHORIZE_QUERY}`))
    ).toBeNull();
  });

  it('accepts authorizerURL with a trailing slash', () => {
    expect(
      getAuthorizeResumeURL(
        `${AUTHORIZER}/`,
        loc(`${AUTHORIZER}/app?${AUTHORIZE_QUERY}`)
      )
    ).not.toBeNull();
  });
});
