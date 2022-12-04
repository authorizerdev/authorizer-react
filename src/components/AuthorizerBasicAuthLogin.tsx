import React, { FC, useEffect, useState } from 'react';
import { AuthToken, LoginInput } from '@authorizerdev/authorizer-js';
import styles from '../styles/default.css';

import { ButtonAppearance, MessageType, Views } from '../constants';
import { useAuthorizer } from '../contexts/AuthorizerContext';
import { StyledButton, StyledFooter, StyledLink } from '../styledComponents';
import { isValidEmail } from '../utils/validations';
import { Message } from './Message';
import { AuthorizerVerifyOtp } from './AuthorizerVerifyOtp';
import { OtpDataType } from '../types';

const initOtpData: OtpDataType = {
  isScreenVisible: false,
  email: '',
};

interface InputDataType {
  email: string | null;
  password: string | null;
}

export const AuthorizerBasicAuthLogin: FC<{
  setView?: (v: Views) => void;
  onLogin?: (data: AuthToken | void) => void;
  urlProps: Record<string, any> | null;
  roles?: string[];
}> = ({ setView, onLogin, urlProps, roles }) => {
  const [error, setError] = useState(``);
  const [loading, setLoading] = useState(false);
  const [otpData, setOtpData] = useState<OtpDataType>({ ...initOtpData });
  const [formData, setFormData] = useState<InputDataType>({
    email: null,
    password: null,
  });
  const [errorData, setErrorData] = useState<InputDataType>({
    email: null,
    password: null,
  });
  const { setAuthData, config, authorizerRef } = useAuthorizer();

  const onInputChange = async (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const onSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data: LoginInput = {
        email: formData.email || '',
        password: formData.password || '',
      };
      if (urlProps?.scope) {
        data.scope = urlProps.scope;
      }
      if (urlProps?.state) {
        data.state = urlProps.state;
      }

      if (roles && roles.length) {
        data.roles = roles;
      }

      const res = await authorizerRef.login(data);

      if (res && res?.should_show_otp_screen) {
        setOtpData({
          isScreenVisible: true,
          email: data.email,
        });
        return;
      }

      if (res) {
        setError(``);
        setAuthData({
          user: res.user || null,
          token: {
            access_token: res.access_token,
            expires_in: res.expires_in,
            refresh_token: res.refresh_token,
            id_token: res.id_token,
          },
          config,
          loading: false,
        });
      }

      if (onLogin) {
        onLogin(res);
      }
    } catch (err) {
      setLoading(false);
      setError((err as Error).message);
    }
  };

  const onErrorClose = () => {
    setError(``);
  };

  useEffect(() => {
    if (formData.email === '') {
      setErrorData({ ...errorData, email: 'Email is required' });
    } else if (formData.email && !isValidEmail(formData.email)) {
      setErrorData({ ...errorData, email: 'Please enter valid email' });
    } else {
      setErrorData({ ...errorData, email: null });
    }
  }, [formData.email]);

  useEffect(() => {
    if (formData.password === '') {
      setErrorData({ ...errorData, password: 'Password is required' });
    } else {
      setErrorData({ ...errorData, password: null });
    }
  }, [formData.password]);

  return otpData.isScreenVisible ? (
    <AuthorizerVerifyOtp
      {...{ setView, onLogin, email: otpData.email }}
      urlProps={urlProps}
    />
  ) : (
    <>
      {error && (
        <Message type={MessageType.Error} text={error} onClose={onErrorClose} />
      )}
      <>
        <form onSubmit={onSubmit} name="authorizer-login-form">
          <div className={styles['styled-form-group']}>
            <label className={styles['form-input-label']} htmlFor="email">
              <span>* </span>Email
            </label>
            <input
              name="email"
              className={`${styles['form-input-field']} ${
                errorData.email ? styles['input-error-content'] : null
              }`}
              placeholder="eg. foo@bar.com"
              type="email"
              value={formData.email || ''}
              onChange={(e) => onInputChange('email', e.target.value)}
            />
            {errorData.email && (
              <div className={styles['form-input-error']}>
                {errorData.email}
              </div>
            )}
          </div>
          <div className={styles['styled-form-group']}>
            <label className={styles['form-input-label']} htmlFor="password">
              <span>* </span>Password
            </label>
            <input
              name="password"
              className={`${styles['form-input-field']} ${
                errorData.password ? styles['input-error-content'] : null
              }`}
              placeholder="********"
              type="password"
              value={formData.password || ''}
              onChange={(e) => onInputChange('password', e.target.value)}
            />
            {errorData.password && (
              <div className={styles['form-input-error']}>
                {errorData.password}
              </div>
            )}
          </div>
          <br />
          <StyledButton
            type="submit"
            disabled={
              !!errorData.email ||
              !!errorData.password ||
              !formData.email ||
              !formData.password ||
              loading
            }
            appearance={ButtonAppearance.Primary}
          >
            {loading ? `Processing ...` : `Log In`}
          </StyledButton>
        </form>

        {setView && (
          <StyledFooter>
            <StyledLink
              onClick={() => setView(Views.ForgotPassword)}
              marginBottom="10px"
            >
              Forgot Password?
            </StyledLink>

            {config.is_sign_up_enabled && (
              <div>
                Don't have an account?{' '}
                <StyledLink onClick={() => setView(Views.Signup)}>
                  Sign Up
                </StyledLink>
              </div>
            )}
          </StyledFooter>
        )}
      </>
    </>
  );
};
