import type { Page } from '@playwright/test';

// Chrome DevTools Protocol's WebAuthn domain: a software authenticator the
// browser treats as a real platform authenticator (Touch ID/Windows Hello
// equivalent), so registration/assertion ceremonies complete without any
// real biometric hardware or user prompt - the standard way to test WebAuthn
// flows in CI. isUserVerified: true auto-approves the "verify it's you" step
// a real authenticator would otherwise block on.
export async function addVirtualAuthenticator(page: Page) {
  const client = await page.context().newCDPSession(page);
  await client.send('WebAuthn.enable');
  const { authenticatorId } = await client.send(
    'WebAuthn.addVirtualAuthenticator',
    {
      options: {
        protocol: 'ctap2',
        transport: 'internal',
        hasResidentKey: true,
        hasUserVerification: true,
        isUserVerified: true,
      },
    },
  );
  return { client, authenticatorId };
}
