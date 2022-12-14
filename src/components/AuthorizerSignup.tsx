import React, { FC, useEffect, useState } from 'react';
import { AuthToken, SignupInput } from '@authorizerdev/authorizer-js';
import styles from '../styles/default.css';

import { ButtonAppearance, MessageType, Views } from '../constants';
import { useAuthorizer } from '../contexts/AuthorizerContext';
import { StyledButton, StyledFooter, StyledLink } from '../styledComponents';
import { isValidEmail } from '../utils/validations';
import { formatErrorMessage } from '../utils/format';
import { Message } from './Message';
import PasswordStrengthIndicator from './PasswordStrengthIndicator';

interface InputDataType {
  email: string | null;
  password: string | null;
  confirmPassword: string | null;
}

export const AuthorizerSignup: FC<{
  setView?: (v: Views) => void;
  onSignup?: (data: AuthToken) => void;
  urlProps?: Record<string, any>;
  roles?: string[];
}> = ({ setView, onSignup, urlProps, roles }) => {
  const [error, setError] = useState(``);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState(``);
  const [formData, setFormData] = useState<InputDataType>({
    email: null,
    password: null,
    confirmPassword: null,
  });
  const [errorData, setErrorData] = useState<InputDataType>({
    email: null,
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
      const data: SignupInput = {
        email: formData.email || '',
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
        data.roles;
      }
      const res = await authorizerRef.signup(data);

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

  if (successMessage) {
    return <Message type={MessageType.Success} text={successMessage} />;
  }

  return (
    <>
      {error && (
        <Message type={MessageType.Error} text={error} onClose={onErrorClose} />
      )}
      {config.is_basic_authentication_enabled &&
        !config.is_magic_link_login_enabled && (
          <>
            <form onSubmit={onSubmit} name="authorizer-signup-form">
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
                <label
                  className={styles['form-input-label']}
                  htmlFor="password"
                >
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
              <div className={styles['styled-form-group']}>
                <label
                  className={styles['form-input-label']}
                  htmlFor="password"
                >
                  <span>* </span>Confirm Password
                </label>
                <input
                  name="password"
                  className={`${styles['form-input-field']} ${
                    errorData.confirmPassword
                      ? styles['input-error-content']
                      : null
                  }`}
                  placeholder="********"
                  type="password"
                  value={formData.confirmPassword || ''}
                  onChange={(e) =>
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
                  !!errorData.email ||
                  !!errorData.password ||
                  !!errorData.confirmPassword ||
                  !formData.email ||
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
