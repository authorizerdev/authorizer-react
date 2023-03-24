import React, { FC, useEffect, useState } from 'react';
import { VerifyOtpInput } from '@authorizerdev/authorizer-js';
import styles from '../styles/default.css';

import { ButtonAppearance, MessageType, Views } from '../constants';
import { useAuthorizer } from '../contexts/AuthorizerContext';
import { StyledButton, StyledFooter, StyledLink } from '../styledComponents';
import { isValidOtp } from '../utils/validations';
import { Message } from './Message';

interface InputDataType {
  otp: string | null;
}

export const AuthorizerVerifyOtp: FC<{
  setView?: (v: Views) => void;
  onLogin?: (data: any) => void;
  email: string;
  urlProps?: Record<string, any>;
}> = ({ setView, onLogin, email, urlProps }) => {
  const [error, setError] = useState(``);
  const [successMessage, setSuccessMessage] = useState(``);
  const [loading, setLoading] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [formData, setFormData] = useState<InputDataType>({
    otp: null,
  });
  const [errorData, setErrorData] = useState<InputDataType>({
    otp: null,
  });
  const { authorizerRef, config, setAuthData } = useAuthorizer();

  const onInputChange = async (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const onSubmit = async (e: any) => {
    e.preventDefault();
    setSuccessMessage(``);
    try {
      setLoading(true);
      const data: VerifyOtpInput = {
        email,
        otp: formData.otp || '',
      };
      if (urlProps?.state) {
        data.state = urlProps.state;
      }

      const res = await authorizerRef.verifyOtp(data);
      setLoading(false);

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

  const onSuccessClose = () => {
    setSuccessMessage(``);
  };

  const resendOtp = async () => {
    setSuccessMessage(``);
    try {
      setSendingOtp(true);

      const res = await authorizerRef.resendOtp({
        email,
      });
      setSendingOtp(false);

      if (res && res?.message) {
        setError(``);
        setSuccessMessage(res.message);
      }

      if (onLogin) {
        onLogin(res);
      }
    } catch (err) {
      setLoading(false);
      setError((err as Error).message);
    }
  };

  useEffect(() => {
    if (formData.otp === '') {
      setErrorData({ ...errorData, otp: 'OTP is required' });
    } else if (formData.otp && !isValidOtp(formData.otp)) {
      setErrorData({ ...errorData, otp: 'Please enter valid OTP' });
    } else {
      setErrorData({ ...errorData, otp: null });
    }
  }, [formData.otp]);

  return (
    <>
      {successMessage && (
        <Message
          type={MessageType.Success}
          text={successMessage}
          onClose={onSuccessClose}
        />
      )}
      {error && (
        <Message type={MessageType.Error} text={error} onClose={onErrorClose} />
      )}
      <p style={{ textAlign: 'center', margin: '10px 0px' }}>
        Please enter the OTP you received on your email address.
      </p>
      <br />
      <form onSubmit={onSubmit} name="authorizer-mfa-otp-form">
        <div className={styles['styled-form-group']}>
          <label
            className={styles['form-input-label']}
            htmlFor="authorizer-verify-otp"
          >
            <span>* </span>OTP (One Time Password)
          </label>
          <input
            name="otp"
            id="authorizer-verify-otp"
            className={`${styles['form-input-field']} ${
              errorData.otp ? styles['input-error-content'] : null
            }`}
            placeholder="e.g.- AB123C"
            type="password"
            value={formData.otp || ''}
            onChange={(e) => onInputChange('otp', e.target.value)}
          />
          {errorData.otp && (
            <div className={styles['form-input-error']}>{errorData.otp}</div>
          )}
        </div>
        <br />
        <StyledButton
          type="submit"
          disabled={loading || !formData.otp || !!errorData.otp}
          appearance={ButtonAppearance.Primary}
        >
          {loading ? `Processing ...` : `Submit`}
        </StyledButton>
      </form>
      {setView && (
        <StyledFooter>
          {sendingOtp ? (
            <div style={{ marginBottom: '10px' }}>Sending ...</div>
          ) : (
            <StyledLink onClick={resendOtp} marginBottom="10px">
              Resend OTP
            </StyledLink>
          )}
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
  );
};
