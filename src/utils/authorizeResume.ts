// Login page paths Authorizer's /authorize hands an unauthenticated user to.
// The server accepts only these, exactly, as a social-login return target.
// /app/ is the one a browser is actually on: /authorize redirects to /app,
// and Authorizer 301s that to /app/.
const RESUME_PATHS = ['/app', '/app/', '/app/signup'];

/**
 * getAuthorizeResumeURL returns the URL a social login should come back to so
 * it resumes the pending /authorize request, or null when there is none.
 *
 * When /authorize needs a sign-in it sends the browser to Authorizer's /app
 * with the request's parameters (client_id, response_type, redirect_uri,
 * state, nonce, PKCE, ...). Password login then replays them to /authorize,
 * which checks the client's registered redirect_uri, runs consent and binds
 * PKCE before issuing the code. Social login must take the same route, so its
 * redirect_uri is this /app URL rather than the client's callback.
 *
 * Returns a URL only when ALL of these hold, so nothing changes anywhere else:
 *   - the page is served by Authorizer itself: its origin equals the origin of
 *     `authorizerURL`. A login UI on your own site never resumes, because
 *     /authorize never sends users there;
 *   - the path is exactly /app, /app/ or /app/signup;
 *   - the URL carries an /authorize request: client_id AND response_type.
 *
 * Parameters arriving in the fragment (response_mode=fragment) move into the
 * query string, since a server redirect cannot carry a fragment and Authorizer
 * refuses one. Query values win over fragment values, as on /app.
 *
 * Requires Authorizer 2.4.6 or later, which accepts its own /app here. The
 * hosted login page is built into the same image as the server, so the two
 * always match.
 */
export const getAuthorizeResumeURL = (
  authorizerURL: string,
  location: Pick<Location, 'origin' | 'pathname' | 'search' | 'hash'>
): string | null => {
  let authorizerOrigin: string;
  try {
    authorizerOrigin = new URL(authorizerURL).origin;
  } catch {
    return null;
  }
  if (location.origin !== authorizerOrigin) {
    return null;
  }
  if (!RESUME_PATHS.includes(location.pathname)) {
    return null;
  }

  const params = new URLSearchParams(
    location.hash ? location.hash.replace(/^#/, '') : ''
  );
  new URLSearchParams(location.search).forEach((value, key) => {
    params.set(key, value);
  });
  if (!params.get('client_id') || !params.get('response_type')) {
    return null;
  }

  return `${location.origin}${location.pathname}?${params.toString()}`;
};
