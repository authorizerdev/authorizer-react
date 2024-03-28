import React, { FC, useEffect, useState } from 'react';
import { AuthToken, SignupInput } from '@authorizerdev/authorizer-js';
import isEmail from 'validator/es/lib/isEmail';
import isMobilePhone from 'validator/es/lib/isMobilePhone';

import styles from '../styles/default.css';
import { ButtonAppearance, MessageType, Views } from '../constants';
import { useAuthorizer } from '../contexts/AuthorizerContext';
import { StyledButton, StyledFooter, StyledLink } from '../styledComponents';
import { formatErrorMessage } from '../utils/format';
import { Message } from './Message';
import PasswordStrengthIndicator from './PasswordStrengthIndicator';
import { OtpDataType } from '../types';
import { AuthorizerVerifyOtp } from './AuthorizerVerifyOtp';

interface InputDataType {
  email_or_phone_number: string | null;
  password: string | null;
  confirmPassword: string | null;
}

const initOtpData: OtpDataType = {
  is_screen_visible: false,
  email: '',
  phone_number: '',
};

export const AuthorizerSignup: FC<{
  setView?: (v: Views) => void;
  onSignup?: (data: AuthToken) => void;
  urlProps?: Record<string, any>;
  roles?: string[];
}> = ({ setView, onSignup, urlProps, roles }) => {
  const [error, setError] = useState(``);
  const [loading, setLoading] = useState(false);
  const [otpData, setOtpData] = useState<OtpDataType>({ ...initOtpData });
  const [successMessage, setSuccessMessage] = useState(``);
  const [formData, setFormData] = useState<InputDataType>({
    email_or_phone_number: null,
    password: null,
    confirmPassword: null,
  });
  const [errorData, setErrorData] = useState<InputDataType>({
    email_or_phone_number: null,
    password: null,
    confirmPassword: null,
  });
  const { authorizerRef, config, setAuthData } = useAuthorizer();
  const [disableSignupButton, setDisableSignupButton] = useState(false);

  const onInputChange = async (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const onSubmit = async (e: any) => {
    e.preventDefault();
    try {
      setLoading(true);
      let email: string = '';
      let phone_number: string = '';
      if (formData.email_or_phone_number) {
        if (isEmail(formData.email_or_phone_number)) {
          email = formData.email_or_phone_number;
        } else if (isMobilePhone(formData.email_or_phone_number)) {
          phone_number = formData.email_or_phone_number;
        }
      }
      if (!email && !phone_number) {
        setErrorData({
          ...errorData,
          email_or_phone_number: 'Invalid email or phone number',
        });
        setLoading(false);
        return;
      }
      const data: SignupInput = {
        email: email,
        phone_number: phone_number,
        password: formData.password || '',
        confirm_password: formData.confirmPassword || '',
      };
      if (urlProps?.scope) {
        data.scope = urlProps.scope;
      }
      if (urlProps?.roles) {
        data.roles = urlProps.roles;
      }
      if (urlProps?.redirect_uri) {
        data.redirect_uri = urlProps.redirect_uri;
      }
      if (urlProps?.state) {
        data.state = urlProps.state;
      }
      if (roles && roles.length) {
        data.roles = roles;
      }
      const { data: res, errors } = await authorizerRef.signup(data);
      if (errors && errors.length) {
        setError(formatErrorMessage(errors[0]?.message));
        setLoading(false);
        return;
      }
      if (
        res &&
        (res?.should_show_email_otp_screen ||
          res?.should_show_mobile_otp_screen)
      ) {
        setOtpData({
          is_screen_visible: true,
          email: data.email || ``,
          phone_number: data.phone_number || ``,
        });
        return;
      }
      if (res) {
        setError(``);
        if (res.access_token) {
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
        } else {
          setLoading(false);
          setSuccessMessage(res.message || ``);
        }

        if (onSignup) {
          onSignup(res);
        }
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
    if (formData.email_or_phone_number === '') {
      setErrorData({
        ...errorData,
        email_or_phone_number: 'Email OR Phone Number is required',
      });
    } else if (
      !isEmail(formData.email_or_phone_number || '') &&
      !isMobilePhone(formData.email_or_phone_number || '')
    ) {
      setErrorData({
        ...errorData,
        email_or_phone_number: 'Invalid Email OR Phone Number',
      });
    } else {
      setErrorData({ ...errorData, email_or_phone_number: null });
    }
  }, [formData.email_or_phone_number]);

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

  if (otpData.is_screen_visible) {
    return (
      <>
        {successMessage && (
          <Message type={MessageType.Success} text={successMessage} />
        )}
        <AuthorizerVerifyOtp
          {...{
            setView,
            onLogin: onSignup,
            email: otpData.email || ``,
            phone_number: otpData.phone_number || ``,
            is_totp: otpData.is_totp || false,
          }}
          urlProps={urlProps}
        />
      </>
    );
  }

  return (
    <>
      {error && (
        <Message type={MessageType.Error} text={error} onClose={onErrorClose} />
      )}
      {successMessage && (
        <Message type={MessageType.Success} text={successMessage} />
      )}
      {(config.is_basic_authentication_enabled ||
        config.is_mobile_basic_authentication_enabled) &&
        !config.is_magic_link_login_enabled && (
          <>
            <form onSubmit={onSubmit} name="authorizer-sign-up-form">
              <div className={styles['styled-form-group']}>
                <label
                  className={styles['form-input-label']}
                  htmlFor="authorizer-sign-up-email"
                >
                  <span>* </span>Email / Phone Number
                </label>
                <input
                  name="eemail_or_phone_numbermail"
                  id="authorizer-login-email-or-phone-number"
                  className={`${styles['form-input-field']} ${
                    errorData.email_or_phone_number
                      ? styles['input-error-content']
                      : null
                  }`}
                  placeholder="eg. hello@world.com / +919999999999"
                  type="text"
                  value={formData.email_or_phone_number || ''}
                  onChange={e =>
                    onInputChange('email_or_phone_number', e.target.value)
                  }
                />
                {errorData.email_or_phone_number && (
                  <div className={styles['form-input-error']}>
                    {errorData.email_or_phone_number}
                  </div>
                )}
              </div>
              <div className={styles['styled-form-group']}>
                <label
                  className={styles['form-input-label']}
                  htmlFor="authorizer-sign-up-password"
                >
                  <span>* </span>Password
                </label>
                <input
                  name="password"
                  id="authorizer-sign-up-password"
                  className={`${styles['form-input-field']} ${
                    errorData.password ? styles['input-error-content'] : null
                  }`}
                  placeholder="********"
                  type="password"
                  value={formData.password || ''}
                  onChange={e => onInputChange('password', e.target.value)}
                />
                {errorData.password && (
                  <div className={styles['form-input-error']}>
                    {errorData.password}
                  </div>
                )}
              </div>
              <div className={styles['styled-form-group']}>
                <label
                  className={styles['form-input-label']}
                  htmlFor="authorizer-sign-up-confirm-password"
                >
                  <span>* </span>Confirm Password
                </label>
                <input
                  name="confirmPassword"
                  id="authorizer-sign-up-confirm-password"
                  className={`${styles['form-input-field']} ${
                    errorData.confirmPassword
                      ? styles['input-error-content']
                      : null
                  }`}
                  placeholder="********"
                  type="password"
                  value={formData.confirmPassword || ''}
                  onChange={e =>
                    onInputChange('confirmPassword', e.target.value)
                  }
                />
                {errorData.confirmPassword && (
                  <div className={styles['form-input-error']}>
                    {errorData.confirmPassword}
                  </div>
                )}
              </div>
              {config.is_strong_password_enabled && (
                <>
                  <PasswordStrengthIndicator
                    value={formData.password || ''}
                    setDisableButton={setDisableSignupButton}
                  />
                  <br />
                </>
              )}
              <br />
              <StyledButton
                type="submit"
                disabled={
                  loading ||
                  disableSignupButton ||
                  !!errorData.email_or_phone_number ||
                  !!errorData.password ||
                  !!errorData.confirmPassword ||
                  !formData.email_or_phone_number ||
                  !formData.password ||
                  !formData.confirmPassword
                }
                appearance={ButtonAppearance.Primary}
              >
                {loading ? `Processing ...` : `Sign Up`}
              </StyledButton>
            </form>
            {setView && (
              <StyledFooter>
                <div>
                  Already have an account?{' '}
                  <StyledLink onClick={() => setView(Views.Login)}>
                    Log In
                  </StyledLink>
                </div>
              </StyledFooter>
            )}
          </>
        )}
    </>
  );
};
