import type { Meta, StoryObj } from '@storybook/react';

import { AuthorizerTOTPScanner } from '../components/AuthorizerTOTPScanner';
import StyledWrapper from '../styledComponents/StyledWrapper';
import {
  sampleQrImage,
  sampleRecoveryCodes,
  sampleSecret,
} from './mfaFixtures';

const meta: Meta<typeof AuthorizerTOTPScanner> = {
  title: 'MFA/AuthorizerTOTPScanner',
  component: AuthorizerTOTPScanner,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <StyledWrapper>
        <div style={{ width: 360 }}>
          <Story />
        </div>
      </StyledWrapper>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof AuthorizerTOTPScanner>;

export const WithRecoveryCodes: Story = {
  args: {
    authenticator_scanner_image: sampleQrImage,
    authenticator_secret: sampleSecret,
    authenticator_recovery_codes: sampleRecoveryCodes,
  },
};

export const WithoutRecoveryCodes: Story = {
  args: {
    authenticator_scanner_image: sampleQrImage,
    authenticator_secret: sampleSecret,
    authenticator_recovery_codes: [],
  },
};

export const LongSecret: Story = {
  args: {
    authenticator_scanner_image: sampleQrImage,
    authenticator_secret: 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXPJBSWY3DP',
    authenticator_recovery_codes: sampleRecoveryCodes,
  },
};
