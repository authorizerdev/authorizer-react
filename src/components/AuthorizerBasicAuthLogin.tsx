import React, { FC, useEffect, useState } from 'react';
import { AuthToken } from '@authorizerdev/authorizer-js';

import { ButtonAppearance, MessageType, Views } from '../constants';
import { useAuthorizer } from '../contexts/AuthorizerContext';
import { Button, Footer, Link, StyledFormGroup } from '../styles';
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
  urlProps: Record<string, any>;
}> = ({ setView, onLogin, urlProps }) => {
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
      const data: {
        email: string;
        password: string;
        roles?: string[];
        scope?: string[];
      } = {
        email: formData.email || '',
        password: formData.password || '',
      };
      if (urlProps.scope) {
        data.scope = urlProps.scope;
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
    } else if (!isValidEmail(formData.email)) {
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
    <AuthorizerVerifyOtp {...{ setView, onLogin, email: otpData.email }} />
  ) : (
    <>
      {error && (
        <Message type={MessageType.Error} text={error} onClose={onErrorClose} />
      )}
      <>
        <form onSubmit={(e) => onSubmit(e)}>
          <StyledFormGroup hasError={!!errorData.email}>
            <label className="form-input-label" htmlFor="email">
              <span>* </span>Email
            </label>
            <input
              name="email"
              className="form-input-field"
              placeholder="eg. foo@bar.com"
              type="email"
              value={formData.email || ''}
              onChange={(e) => onInputChange('email', e.target.value)}
            />
            {errorData.email && (
              <div className="form-input-error">{errorData.email}</div>
            )}
          </StyledFormGroup>
          <StyledFormGroup hasError={!!errorData.password}>
            <label className="form-input-label" htmlFor="password">
              <span>* </span>Password
            </label>
            <input
              name="password"
              className="form-input-field"
              placeholder="eg. foo@bar.com"
              type="password"
              value={formData.password || ''}
              onChange={(e) => onInputChange('password', e.target.value)}
            />
            {errorData.password && (
              <div className="form-input-error">{errorData.password}</div>
            )}
          </StyledFormGroup>
          <br />
          <Button
            type="submit"
            disabled={loading}
            appearance={ButtonAppearance.Primary}
          >
            {loading ? `Processing ...` : `Log In`}
          </Button>
        </form>

        {setView && (
          <Footer>
            <Link
              onClick={() => setView(Views.ForgotPassword)}
              style={{ marginBottom: 10 }}
            >
              Forgot Password?
            </Link>

            {config.is_sign_up_enabled && (
              <div>
                Don't have an account?{' '}
                <Link onClick={() => setView(Views.Signup)}>Sign Up</Link>
              </div>
            )}
          </Footer>
        )}
      </>
    </>
  );
};
