import { FC, useEffect, useState } from 'react';
import '../styles/default.css';

import { ButtonAppearance, MessageType } from '../constants';
import { useAuthorizer } from '../contexts/AuthorizerContext';
import { StyledButton, StyledWrapper } from '../styledComponents';
import { formatErrorMessage } from '../utils/format';
import { Message } from './Message';
import { PasswordInput } from './PasswordInput';
import { getSearchParams } from '../utils/url';
import PasswordStrengthIndicator from './PasswordStrengthIndicator';

function isValidRedirectUri(uri: string, allowedRedirect?: string): boolean {
  try {
    const url = new URL(uri, window.location.origin);
    if (url.origin === window.location.origin) return true;
    if (allowedRedirect) {
      const allowed = new URL(allowedRedirect);
      if (url.origin === allowed.origin) return true;
    }
    return false;
  } catch {
    return false;
  }
}

type Props = {
  showOTPInput?: boolean;
  onReset?: (res: any) => void;
  phone_number?: string;
};

interface InputDataType {
  otp: string | null;
  password: string | null;
  confirmPassword: string | null;
}

export const AuthorizerResetPassword: FC<Props> = ({
  onReset,
  showOTPInput,
  phone_number,
}) => {
  const { token, redirect_uri } = getSearchParams();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<InputDataType>({
    otp: null,
    password: null,
    confirmPassword: null,
  });
  const [errorData, setErrorData] = useState<InputDataType>({
    otp: null,
    password: null,
    confirmPassword: null,
  });
  const { authorizerRef, config } = useAuthorizer();
  const [disableContinueButton, setDisableContinueButton] = useState(false);

  const onInputChange = async (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const onSubmit = async (e: any) => {
    e.preventDefault();
    try {
      setLoading(true);
      const { data: res, errors } = await authorizerRef.resetPassword({
        token,
        otp: formData.otp || '',
        phone_number: phone_number || '',
        password: formData.password || '',
        confirm_password: formData.confirmPassword || '',
      });
      if (errors && errors.length) {
        setError(formatErrorMessage(errors[0]?.message));
        return;
      }
      setError(``);
      if (onReset) {
        onReset(res);
      } else {
        const fallback = config.redirectURL || window.location.origin;
        const target = redirect_uri && isValidRedirectUri(redirect_uri, config.redirectURL)
          ? redirect_uri
          : fallback;
        window.location.href = target;
      }
    } catch (err) {
      setError(formatErrorMessage((err as Error).message));
    } finally {
      setLoading(false);
    }
  };

  const onErrorClose = () => {
    setError(``);
  };

  useEffect(() => {
    if (formData.password === '') {
      setErrorData({ ...errorData, password: 'Password is required' });
    } else {
      setErrorData({ ...errorData, password: null });
    }
  }, [formData.password]);

  useEffect(() => {
    if (formData.confirmPassword === '') {
      setErrorData({
        ...errorData,
        confirmPassword: 'Confirm password is required',
      });
    } else {
      setErrorData({ ...errorData, confirmPassword: null });
    }
  }, [formData.confirmPassword]);

  useEffect(() => {
    if (formData.password && formData.confirmPassword) {
      if (formData.confirmPassword !== formData.password) {
        setErrorData({
          ...errorData,
          password: `Password and confirm passwords don't match`,
          confirmPassword: `Password and confirm passwords don't match`,
        });
      } else {
        setErrorData({
          ...errorData,
          password: null,
          confirmPassword: null,
        });
      }
    }
  }, [formData.password, formData.confirmPassword]);

  return (
    <StyledWrapper>
      {error && (
        <Message type={MessageType.Error} text={error} onClose={onErrorClose} />
      )}
      <form onSubmit={onSubmit} name="authorizer-reset-password-form">
        {showOTPInput && (
          <div className="styled-form-group">
            <label
              className="form-input-label"
              htmlFor="authorizer-verify-otp"
            >
              <span>* </span>OTP (One Time Password)
            </label>
            <input
              name="otp"
              id="authorizer-verify-otp"
              className={`form-input-field ${
                errorData.otp ? 'input-error-content' : ''
              }`}
              placeholder="e.g.- AB123C"
              type="password"
              value={formData.otp || ''}
              onChange={(e) => onInputChange('otp', e.target.value)}
            />
            {errorData.otp && (
              <div className="form-input-error">{errorData.otp}</div>
            )}
          </div>
        )}
        <PasswordInput
          id="authorizer-reset-password"
          name="password"
          label="Password"
          autoComplete="new-password"
          value={formData.password || ''}
          onChange={(value) => onInputChange('password', value)}
          error={errorData.password}
        />
        <PasswordInput
          id="authorizer-reset-confirm-password"
          name="confirmPassword"
          label="Confirm Password"
          autoComplete="new-password"
          value={formData.confirmPassword || ''}
          onChange={(value) => onInputChange('confirmPassword', value)}
          error={errorData.confirmPassword}
        />
        {config.is_strong_password_enabled && (
          <>
            <PasswordStrengthIndicator
              value={formData.password || ''}
              setDisableButton={setDisableContinueButton}
            />
            <br />
          </>
        )}
        <StyledButton
          type="submit"
          disabled={
            loading ||
            disableContinueButton ||
            !!errorData.password ||
            !!errorData.confirmPassword ||
            !formData.password ||
            !formData.confirmPassword
          }
          appearance={ButtonAppearance.Primary}
        >
          {loading ? `Processing ...` : `Continue`}
        </StyledButton>
      </form>
    </StyledWrapper>
  );
};
