import { test, expect } from '@playwright/test';
import { addVirtualAuthenticator } from './webauthn';

test('register a passkey in settings, then log in with it as the primary factor', async ({
  page,
}) => {
  await addVirtualAuthenticator(page);

  const email = `pw-passkey-${Date.now()}@example.com`;
  const password = 'TestPass123!';

  await page.goto('/');
  await page.getByText('Sign Up', { exact: true }).click();
  await page.locator('#authorizer-sign-up-given_name').fill('Playwright');
  await page.locator('#authorizer-sign-up-family_name').fill('Test');
  await page.locator('#authorizer-sign-up-email_or_phone_number').fill(email);
  await page.locator('#authorizer-sign-up-password').fill(password);
  await page.locator('#authorizer-sign-up-confirmPassword').fill(password);
  await page.getByRole('button', { name: 'Sign Up' }).click();

  // Passkey is never offered on the login-time offer screen (it needs a
  // bearer token webauthn_registration_options/_verify require, which
  // doesn't exist in the withheld-token state) - skip to reach the
  // dashboard, then register the passkey from settings instead.
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await expect(page.getByText('Hey 👋,')).toBeVisible({ timeout: 10_000 });

  await page.getByRole('link', { name: 'Manage sign-in methods' }).click();
  await page.getByRole('button', { name: 'Set up' }).click();
  await page.getByRole('button', { name: 'Add a passkey' }).click();
  // AuthorizerMFASetup wires onSuccess={backToList}, so a successful
  // registration immediately returns to the method list - there's no
  // stable success message to assert on, only the absence of an error and
  // the navigation back.
  await expect(
    page.getByRole('heading', { name: 'Manage sign-in methods' }),
  ).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/failed to verify passkey/i)).toHaveCount(0);

  await page.getByRole('link', { name: 'Back to dashboard' }).click();
  await page.getByText('Logout', { exact: true }).click();

  await page.getByRole('button', { name: 'Sign in with a passkey' }).click();
  // The just-registered credential satisfies the account's MFA requirement
  // (webauthn credentials count as a verified factor) and setup was
  // skipped earlier, so this must log straight in - no MFA screen.
  await expect(page.getByText('Hey 👋,')).toBeVisible({ timeout: 10_000 });
});

test('passkey login button is hidden when MFA is enforced', async ({
  page,
}) => {
  const patchMeta = (json: any) => {
    const meta = json?.data?.meta ?? json;
    if (meta && typeof meta === 'object' && 'is_mfa_enforced' in meta) {
      meta.is_mfa_enforced = true;
    }
    return json;
  };

  await page.route('**/v1/meta', async (route) => {
    const response = await route.fetch();
    const json = patchMeta(await response.json());
    await route.fulfill({ response, json });
  });
  await page.route('**/graphql', async (route) => {
    const postData = route.request().postDataJSON?.();
    if (postData?.operationName !== 'meta') {
      await route.continue();
      return;
    }
    const response = await route.fetch();
    const json = patchMeta(await response.json());
    await route.fulfill({ response, json });
  });

  await page.goto('/');
  await page
    .locator('#authorizer-login-email-or-phone-number')
    .waitFor({ state: 'visible', timeout: 10_000 });
  await expect(
    page.getByRole('button', { name: 'Sign in with a passkey' }),
  ).toHaveCount(0);
});
