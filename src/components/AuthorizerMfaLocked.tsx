import { FC } from 'react';
import '../styles/default.css';
import { MessageType } from '../constants';
import { Message } from './Message';

// Shown when the backend rejects a login/verify attempt because the
// account's MFA is permanently locked (schemas.User.MFALockedAt set, via
// the lock_mfa mutation) - distinct from the transient failed-attempt
// lockout AuthorizerVerifyOtp already handles (TOO_MANY_REQUESTS). Only an
// admin can clear this (_update_user with reset_mfa: true), so there is no
// retry action here - matching the backend's own message, which already
// tells the user what to do.
export const AuthorizerMfaLocked: FC = () => (
  <Message
    type={MessageType.Error}
    text="Your account's multi-factor authentication is locked. Contact your administrator to regain access."
  />
);
