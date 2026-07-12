import type { Decorator } from '@storybook/react';

import StyledWrapper from '../styledComponents/StyledWrapper';

// isWebauthnSupported() (from the SDK) keys off window.PublicKeyCredential and
// its JSON helpers. Stub / remove it so passkey states render deterministically
// inside Storybook regardless of the host browser.
export const withWebauthnSupport =
  (supported: boolean): Decorator =>
  (Story) => {
    if (supported) {
      (window as any).PublicKeyCredential = {
        parseCreationOptionsFromJSON: () => undefined,
        parseRequestOptionsFromJSON: () => undefined,
        prototype: { toJSON: () => undefined },
      };
    } else {
      delete (window as any).PublicKeyCredential;
    }
    return (
      <StyledWrapper>
        <div style={{ width: 360 }}>
          <Story />
        </div>
      </StyledWrapper>
    );
  };
