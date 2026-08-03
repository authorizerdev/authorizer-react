import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';

import { AuthorizerMFASetup } from '../components/AuthorizerMFASetup';
import { normalizeEnrolledMethods } from '../utils/mfaTriage';

// The picker only needs authorizerRef for the setup calls, which these tests
// never trigger - they assert what the method list renders.
vi.mock('../contexts/AuthorizerContext', () => ({
  useAuthorizer: () => ({ authorizerRef: {} }),
}));

const allMethods = {
  totp: true,
  passkey: true,
  emailOtp: true,
  smsOtp: true,
};

// tile returns the <li> for a method by its visible title.
const tile = (title: string) => screen.getByText(title).closest('li')!;

const isEnabled = (title: string) => {
  const el = tile(title);
  return {
    badge: !!within(el).queryByText('Enabled'),
    action: within(el).getByRole('button').textContent,
  };
};

describe('AuthorizerMFASetup enrolment state', () => {
  it('marks every enrolled method as Enabled/Manage, others as Set up', () => {
    render(
      <AuthorizerMFASetup
        availableMfaMethods={allMethods}
        // Verbatim server shape: User.enrolled_mfa_methods uses "webauthn",
        // which must land on the "Passkey" tile.
        enrolledMethods={['totp', 'webauthn', 'email_otp']}
      />,
    );

    expect(isEnabled('Authenticator app')).toEqual({
      badge: true,
      action: 'Manage',
    });
    expect(isEnabled('Passkey')).toEqual({ badge: true, action: 'Manage' });
    expect(isEnabled('Email one-time code')).toEqual({
      badge: true,
      action: 'Manage',
    });
    expect(isEnabled('SMS one-time code')).toEqual({
      badge: false,
      action: 'Set up',
    });
  });

  it('shows Set up everywhere when nothing is enrolled', () => {
    render(<AuthorizerMFASetup availableMfaMethods={allMethods} />);

    for (const title of [
      'Authenticator app',
      'Passkey',
      'Email one-time code',
      'SMS one-time code',
    ]) {
      expect(isEnabled(title)).toEqual({ badge: false, action: 'Set up' });
    }
  });

  it('still honours the deprecated passkeyRegistered prop', () => {
    render(
      <AuthorizerMFASetup availableMfaMethods={allMethods} passkeyRegistered />,
    );

    expect(isEnabled('Passkey')).toEqual({ badge: true, action: 'Manage' });
    expect(isEnabled('Authenticator app')).toEqual({
      badge: false,
      action: 'Set up',
    });
  });
});

describe('normalizeEnrolledMethods', () => {
  it('maps webauthn to the passkey tile key and passes the rest through', () => {
    const methods = normalizeEnrolledMethods(['webauthn', 'totp']);
    expect(methods.has('passkey')).toBe(true);
    expect(methods.has('totp')).toBe(true);
    expect(methods.has('webauthn')).toBe(false);
    expect(methods.size).toBe(2);
  });

  it('handles null/undefined/empty', () => {
    expect(normalizeEnrolledMethods().size).toBe(0);
    expect(normalizeEnrolledMethods(null).size).toBe(0);
    expect(normalizeEnrolledMethods([]).size).toBe(0);
  });
});
