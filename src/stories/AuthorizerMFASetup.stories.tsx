import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';

import { AuthorizerMFASetup } from '../components/AuthorizerMFASetup';
import { withWebauthnSupport } from './decorators';
import {
  sampleQrImage,
  sampleRecoveryCodes,
  sampleSecret,
} from './mfaFixtures';

const totpEnrollment = {
  authenticator_scanner_image: sampleQrImage,
  authenticator_secret: sampleSecret,
  authenticator_recovery_codes: sampleRecoveryCodes,
};

const meta: Meta<typeof AuthorizerMFASetup> = {
  title: 'MFA/AuthorizerMFASetup',
  component: AuthorizerMFASetup,
  parameters: { layout: 'centered' },
  args: { onSetupMethod: fn(), totpEnrollment },
  decorators: [withWebauthnSupport(true)],
};

export default meta;
type Story = StoryObj<typeof AuthorizerMFASetup>;

// Every method the server can offer. Click "Set up" on Authenticator app to
// enter the TOTP flow, or Passkey to enter enrolment.
export const AllMethods: Story = {
  args: {
    availableMfaMethods: {
      totp: true,
      passkey: true,
      emailOtp: true,
      smsOtp: true,
    },
  },
};

export const TotpOnly: Story = {
  args: { availableMfaMethods: { totp: true } },
};

export const PasskeyOnly: Story = {
  args: { availableMfaMethods: { passkey: true } },
};

export const OtpMethodsOnly: Story = {
  args: { availableMfaMethods: { emailOtp: true, smsOtp: true } },
};

// Passkey offered by the server but the browser can't run WebAuthn: the row
// stays visible but disabled with an explanation.
export const PasskeyUnsupported: Story = {
  args: { availableMfaMethods: { totp: true, passkey: true } },
  decorators: [withWebauthnSupport(false)],
};

// TOTP offered but no enrolment payload yet: "Set up" calls onSetupMethod so
// the host can fetch the QR + secret + recovery codes (check the Actions tab).
export const TotpWithoutEnrollment: Story = {
  args: {
    availableMfaMethods: { totp: true, passkey: true },
    totpEnrollment: undefined,
  },
};

// Nothing enabled server-side: a friendly empty state.
export const NoMethods: Story = {
  args: { availableMfaMethods: {} },
};
