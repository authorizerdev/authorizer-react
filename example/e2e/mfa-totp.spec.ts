import { test, expect } from '@playwright/test';
import { generateTotp } from './totp';

async function signupToTotpEnrollment(
  page: import('@playwright/test').Page,
  email: string,
  password: string,
) {
  await page.goto('/');
  await page.getByText('Sign Up', { exact: true }).click();
  await page.locator('#authorizer-sign-up-given_name').fill('Playwright');
  await page.locator('#authorizer-sign-up-family_name').fill('Test');
  await page.locator('#authorizer-sign-up-email_or_phone_number').fill(email);
  await page.locator('#authorizer-sign-up-password').fill(password);
  await page.locator('#authorizer-sign-up-confirmPassword').fill(password);
  await page.getByRole('button', { name: 'Sign Up' }).click();

  await page
    .getByRole('button', { name: /Set up/ })
    .first()
    .waitFor({ state: 'visible', timeout: 15_000 });
  // "Authenticator app" is always the first method card per
  // AuthorizerMFASetup.tsx's fixed methods array.
  await page.getByRole('button', { name: 'Set up' }).first().click();
}

test('TOTP enrollment completes login, and a fresh login challenges for the code', async ({
  page,
}) => {
  const email = `pw-totp-${Date.now()}@example.com`;
  const password = 'TestPass123!';

  await signupToTotpEnrollment(page, email, password);

  const secret = await page
    .locator('[aria-label="Authenticator setup key"]')
    .innerText();
  expect(secret.length).toBeGreaterThan(0);

  await page.getByRole('button', { name: 'Continue' }).click();
  await page
    .locator('#authorizer-verify-otp')
    .fill(generateTotp(secret));
  await page.getByRole('button', { name: 'Submit' }).click();

  await expect(page.getByText('Hey 👋,')).toBeVisible({ timeout: 10_000 });

  await page.getByText('Logout', { exact: true }).click();
  await page.locator('#authorizer-login-email-or-phone-number').fill(email);
  await page.locator('#authorizer-login-password').fill(password);
  await page.getByRole('button', { name: 'Log In' }).click();

  // Enrolled TOTP must be challenged on every login, not offered for setup
  // again and not silently skipped.
  await expect(page.locator('#authorizer-verify-otp')).toBeVisible({
    timeout: 10_000,
  });
  await page.locator('#authorizer-verify-otp').fill(generateTotp(secret));
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.getByText('Hey 👋,')).toBeVisible({ timeout: 10_000 });
});

test('repeated wrong TOTP codes trigger the transient too-many-attempts lockout', async ({
  page,
}) => {
  const email = `pw-totp-lock-${Date.now()}@example.com`;
  const password = 'TestPass123!';

  await signupToTotpEnrollment(page, email, password);
  const secret = await page
    .locator('[aria-label="Authenticator setup key"]')
    .innerText();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.locator('#authorizer-verify-otp').fill(generateTotp(secret));
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.getByText('Hey 👋,')).toBeVisible({ timeout: 10_000 });

  await page.getByText('Logout', { exact: true }).click();
  await page.locator('#authorizer-login-email-or-phone-number').fill(email);
  await page.locator('#authorizer-login-password').fill(password);
  await page.getByRole('button', { name: 'Log In' }).click();
  await expect(page.locator('#authorizer-verify-otp')).toBeVisible({
    timeout: 10_000,
  });

  // totpMaxFailedAttempts is 5 (internal/service/verify_otp.go) - the 6th
  // submission must be rejected as locked, not merely "invalid otp".
  for (let i = 0; i < 6; i++) {
    await page.locator('#authorizer-verify-otp').fill('000000');
    await page.getByRole('button', { name: 'Submit' }).click();
    // eslint-disable-next-line no-await-in-loop
    await page.waitForTimeout(150);
  }

  await expect(
    page.getByText(/too many failed attempts/i),
  ).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('#authorizer-verify-otp')).toBeDisabled();
});
