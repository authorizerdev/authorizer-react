import { test, expect } from '@playwright/test';

// Regression coverage for the abort-wiring gap tracked in
// authorizerdev/authorizer-react#69: AuthorizerVerifyOtp.tsx's WebOTP effect
// includes `webauthnLocked` in its gate/dependency array so a pending
// navigator.credentials.get({otp}) call gets aborted when a failed
// passkey-verify attempt locks the screen over to AuthorizerMfaLocked.
//
// Desktop Chromium (the only browser available here) never implements
// window.OTPCredential - WebOTP is Android-Chrome-only - so the effect's
// feature-detection ('OTPCredential' in window) is always false and the
// abort path this test targets never runs for real. This shims just enough
// (the OTPCredential marker + navigator.credentials.get's `otp` branch) to
// force the effect to start, then drives a real lockout through the UI and
// asserts its cleanup actually aborts the pending call - per the issue's own
// suggested follow-up. It does not, and cannot, prove real WebOTP interop.
test('a passkey-verify lockout aborts a pending WebOTP listener', async ({
  page,
}) => {
  await page.addInitScript(() => {
    (window as any).OTPCredential = function OTPCredential() {};
    const originalGet = navigator.credentials.get.bind(navigator.credentials);
    (navigator.credentials as any).get = (opts: any) => {
      if (opts?.otp) {
        return new Promise((_resolve, reject) => {
          opts.signal?.addEventListener('abort', () => {
            (window as any).__otpAborted = true;
            reject(new DOMException('Aborted', 'AbortError'));
          });
        });
      }
      if (opts?.publicKey) {
        // The real ceremony's result is irrelevant here - the network mock
        // below forces webauthn_login_verify to return a locked error
        // regardless of what's sent. Only the `toJSON`-bearing shape needs
        // to satisfy authorizer-js's loginWithPasskey.
        return Promise.resolve({
          id: 'mock',
          rawId: 'mock',
          type: 'public-key',
          toJSON: () => ({ id: 'mock', rawId: 'mock', type: 'public-key' }),
        });
      }
      return originalGet(opts);
    };
  });

  await page.route('**/graphql', async (route) => {
    const postData = route.request().postDataJSON?.();
    const op = postData?.operationName;

    if (op === 'login') {
      await route.fulfill({
        json: {
          data: {
            login: {
              message: null,
              access_token: null,
              expires_in: null,
              refresh_token: null,
              id_token: null,
              should_show_email_otp_screen: false,
              should_show_mobile_otp_screen: true,
              should_show_totp_screen: false,
              should_offer_webauthn_mfa_verify: true,
              should_offer_webauthn_mfa_setup: false,
              should_offer_email_otp_mfa_setup: false,
              should_offer_sms_otp_mfa_setup: false,
              authenticator_scanner_image: null,
              authenticator_secret: null,
              authenticator_recovery_codes: null,
              user: null,
            },
          },
        },
      });
      return;
    }

    if (op === 'webauthn_login_options') {
      await route.fulfill({
        json: {
          data: {
            webauthn_login_options: {
              options: JSON.stringify({
                challenge: 'AAAA',
                timeout: 60000,
                rpId: 'localhost',
                allowCredentials: [],
                userVerification: 'preferred',
              }),
            },
          },
        },
      });
      return;
    }

    if (op === 'webauthn_login_verify') {
      await route.fulfill({
        json: {
          data: null,
          errors: [
            {
              message:
                "Your account's multi-factor authentication is locked. Contact your administrator to regain access.",
              extensions: { code: 'FAILED_PRECONDITION' },
            },
          ],
        },
      });
      return;
    }

    await route.continue();
  });

  await page.goto('/');
  await page
    .locator('#authorizer-login-email-or-phone-number')
    .fill(`pw-webotp-abort-${Date.now()}@example.com`);
  await page.locator('#authorizer-login-password').fill('irrelevant-mocked');
  await page.getByRole('button', { name: 'Log In' }).click();

  // Both factors land on screen together: SMS-OTP code form (which starts
  // the shimmed WebOTP effect) and the passkey button side by side.
  await expect(
    page.getByRole('button', { name: 'Verify with a passkey' }),
  ).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('#authorizer-verify-otp')).toBeVisible();

  // The example app renders in React.StrictMode, which dev-mode
  // double-invokes every effect once on mount (run -> cleanup -> run again)
  // purely to surface missing-cleanup bugs - unrelated to this test, but it
  // does call controller.abort() once by itself. Reset the flag after that
  // has already settled (mount is long done by the time the screen above is
  // visible) so what's asserted below is specifically the lockout's abort,
  // not StrictMode's.
  await page.evaluate(() => {
    (window as any).__otpAborted = false;
  });

  await page.getByRole('button', { name: 'Verify with a passkey' }).click();

  // onVerifyWithPasskey resolves to 'locked' -> webauthnLocked flips true ->
  // AuthorizerMfaLocked renders, and the WebOTP effect's cleanup fires.
  await expect(page.getByText(/multi-factor authentication is locked/i)).toBeVisible({
    timeout: 10_000,
  });
  await expect
    .poll(() => page.evaluate(() => (window as any).__otpAborted))
    .toBe(true);
});
