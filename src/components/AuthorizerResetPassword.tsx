import React, { FC, useEffect, useState } from 'react';

import { ButtonAppearance, MessageType } from '../constants';
import { useAuthorizer } from '../contexts/AuthorizerContext';
import { Button, Wrapper, StyledFormGroup } from '../styles';
import { formatErrorMessage } from '../utils/format';
import { Message } from './Message';
import { getSearchParams } from '../utils/url';
import { ThemeProvider } from 'styled-components';
import { theme } from '../styles/theme';
import PasswordStrengthIndicator from './PasswordStrengthIndicator';

type Props = {
  onReset?: (res: any) => void;
};

interface InputDataType {
  password: string | null;
  confirmPassword: string | null;
}

export const AuthorizerResetPassword: FC<Props> = ({ onReset }) => {
  const { token, redirect_uri } = getSearchParams();
  const [error, setError] = useState(!token ? `Invalid token` : ``);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<InputDataType>({
    password: null,
    confirmPassword: null,
  });
  const [errorData, setErrorData] = useState<InputDataType>({
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
    setLoading(true);
    try {
      const res = await authorizerRef.resetPassword({
        token,
        password: formData.password || '',
        confirm_password: formData.confirmPassword || '',
      });
      setLoading(false);
      setError(``);
      if (onReset) {
        onReset(res);
      } else {
        window.location.href =
          redirect_uri || config.redirectURL || window.location.origin;
      }
    } catch (err) {
      setLoading(false);
      setError(formatErrorMessage((err as Error).message));
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
    <ThemeProvider theme={theme}>
      <Wrapper>
        {error && (
          <Message
            type={MessageType.Error}
            text={error}
            onClose={onErrorClose}
          />
        )}
        <form onSubmit={onSubmit} name="authorizer-reset-password-form">
          <StyledFormGroup hasError={!!errorData.password}>
            <label className="form-input-label" htmlFor="password">
              <span>* </span>Password
            </label>
            <input
              name="password"
              className="form-input-field"
              placeholder="********"
              type="password"
              value={formData.password || ''}
              onChange={(e) => onInputChange('password', e.target.value)}
            />
            {errorData.password && (
              <div className="form-input-error">{errorData.password}</div>
            )}
          </StyledFormGroup>
          <StyledFormGroup hasError={!!errorData.confirmPassword}>
            <label className="form-input-label" htmlFor="confirmPassword">
              <span>* </span>Confirm Password
            </label>
            <input
              name="confirmPassword"
              className="form-input-field"
              placeholder="********"
              type="password"
              value={formData.confirmPassword || ''}
              onChange={(e) => onInputChange('confirmPassword', e.target.value)}
            />
            {errorData.confirmPassword && (
              <div className="form-input-error">
                {errorData.confirmPassword}
              </div>
            )}
          </StyledFormGroup>
          {config.is_strong_password_enabled && (
            <>
              <PasswordStrengthIndicator
                value={formData.password || ''}
                setDisableButton={setDisableContinueButton}
              />
              <br />
            </>
          )}
          <Button
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
          </Button>
        </form>
      </Wrapper>
    </ThemeProvider>
  );
};
