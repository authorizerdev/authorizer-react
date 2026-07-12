import type { Meta, StoryObj } from '@storybook/react';

import { AuthorizerPasskeyRegister } from '../components/AuthorizerPasskeyRegister';
import { withWebauthnSupport } from './decorators';

const meta: Meta<typeof AuthorizerPasskeyRegister> = {
  title: 'MFA/AuthorizerPasskeyRegister',
  component: AuthorizerPasskeyRegister,
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof AuthorizerPasskeyRegister>;

// Supported: shows the optional name field + "Add a passkey" button. Clicking
// it starts a real WebAuthn ceremony against the configured server, so the
// success / error Messages appear at runtime.
export const Supported: Story = {
  decorators: [withWebauthnSupport(true)],
};

// A fixed credential name hides the inline name field.
export const SupportedWithFixedName: Story = {
  args: { name: 'MacBook Touch ID' },
  decorators: [withWebauthnSupport(true)],
};

// Unsupported browser / device: renders an informational notice instead of
// the button.
export const Unsupported: Story = {
  decorators: [withWebauthnSupport(false)],
};
