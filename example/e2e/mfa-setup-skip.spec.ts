import { test, expect } from '@playwright/test';

// Acceptance criteria under test (from the MFA behavior redesign spec):
// - New basic-auth signup -> setup screen shown -> skip works ->
//   mfa_skipped_at set -> full session issued.
// - Skipped user logs in again -> NO setup screen, direct session.
test('signup shows MFA setup, skip logs in, and skip persists on relogin', async ({
  page,
}) => {
  const email = `pw-test-${Date.now()}@example.com`;
  const password = 'TestPass123!';

  await page.goto('/');
  await page.getByText('Sign Up', { exact: true }).click();

  await page.locator('#authorizer-sign-up-given_name').fill('Playwright');
  await page.locator('#authorizer-sign-up-family_name').fill('Test');
  await page
    .locator('#authorizer-sign-up-email_or_phone_number')
    .fill(email);
  await page.locator('#authorizer-sign-up-password').fill(password);
  await page.locator('#authorizer-sign-up-confirmPassword').fill(password);
  await page.getByRole('button', { name: 'Sign Up' }).click();

  // First-time offer screen: no MFA configured yet, ENFORCE_MFA is off on
  // this server, so a "Skip for now" action must be present.
  const skipButton = page.getByRole('button', { name: 'Skip for now' });
  await expect(skipButton).toBeVisible({ timeout: 15_000 });
  await skipButton.click();

  // Skip issues the withheld token directly - dashboard renders without any
  // further screen in between.
  await expect(page.getByText('Hey 👋,')).toBeVisible({ timeout: 10_000 });

  await page.getByText('Logout', { exact: true }).click();
  await expect(
    page.locator('#authorizer-login-email-or-phone-number'),
  ).toBeVisible();

  // Re-login with the same credentials: mfa_skipped_at must suppress the
  // setup screen entirely - straight to the dashboard, no MFA screen at all.
  await page
    .locator('#authorizer-login-email-or-phone-number')
    .fill(email);
  await page.locator('#authorizer-login-password').fill(password);
  await page.getByRole('button', { name: 'Log In' }).click();

  await expect(page.getByText('Hey 👋,')).toBeVisible({ timeout: 10_000 });
  await expect(skipButton).not.toBeVisible();
});
