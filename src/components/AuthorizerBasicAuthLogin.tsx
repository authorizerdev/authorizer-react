import { FC, useEffect, useState } from 'react';
import { AuthToken, LoginRequest } from '@authorizerdev/authorizer-js';
import validator from 'validator';
const { isEmail, isMobilePhone } = validator;

import '../styles/default.css';
import { ButtonAppearance, MessageType, Views } from '../constants';
import { useAuthorizer } from '../contexts/AuthorizerContext';
import { StyledButton, StyledFooter, StyledLink } from '../styledComponents';
import { Message } from './Message';
import { AuthorizerVerifyOtp } from './AuthorizerVerifyOtp';
import { OtpDataType } from '../types';
import { AuthorizerMFASetup } from './AuthorizerMFASetup';
import { AuthorizerMfaLocked } from './AuthorizerMfaLocked';
import { getEmailPhoneLabels, getEmailPhonePlaceholder } from '../utils/labels';
import { resolveAuthStep, TotpEnrollment } from '../utils/mfaTriage';

const initOtpData: OtpDataType = {
  is_screen_visible: false,
  email: '',
  phone_number: '',
};

type MfaOfferData = {
  is_screen_visible: boolean;
  email: string;
  phone_number: string;
  totpEnrollment: TotpEnrollment | null;
  emailOtp: boolean;
  smsOtp: boolean;
  state?: string;
};

const initMfaOfferData: MfaOfferData = {
  is_screen_visible: false,
  email: '',
  phone_number: '',
  totpEnrollment: null,
  emailOtp: false,
  smsOtp: false,
};

interface InputDataType {
  email_or_phone_number: string | null;
  password: string | null;
}

export const AuthorizerBasicAuthLogin: FC<{
  setView?: (v: Views) => void;
  onLogin?: (data: AuthToken | void) => void;
  urlProps?: Record<string, any>;
  roles?: string[];
}> = ({ setView, onLogin, urlProps, roles }) => {
  const [error, setError] = useState(``);
  const [loading, setLoading] = useState(false);
  const [otpData, setOtpData] = useState<OtpDataType>({ ...initOtpData });
  const [mfaOfferData, setMfaOfferData] = useState<MfaOfferData>({
    ...initMfaOfferData,
  });
  const [locked, setLocked] = useState(false);
  const [formData, setFormData] = useState<InputDataType>({
    email_or_phone_number: null,
    password: null,
  });
  const [errorData, setErrorData] = useState<InputDataType>({
    email_or_phone_number: null,
    password: null,
  });
  const { setAuthData, config, authorizerRef } = useAuthorizer();

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
        return;
      }
      const data: LoginRequest = {
        email: email,
        phone_number: phone_number,
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

      const { data: res, errors } = await authorizerRef.login(data);
      const step = resolveAuthStep(res, errors || []);
      if (step.kind === 'error') {
        setError(step.message);
        return;
      }
      if (step.kind === 'locked') {
        setLocked(true);
        return;
      }
      if (step.kind === 'offer') {
        setMfaOfferData({
          is_screen_visible: true,
          email: data.email || ``,
          phone_number: data.phone_number || ``,
          totpEnrollment: step.totpEnrollment,
          emailOtp: step.emailOtp,
          smsOtp: step.smsOtp,
          state: urlProps?.state,
        });
        return;
      }
      if (step.kind === 'verify') {
        // resolveAuthStep only returns 'verify' when at least one of
        // totp/email/mobile/webauthn is true, so a single unconditional
        // offer covers every case - AuthorizerVerifyOtp decides how to
        // render it (code form, passkey button, or both side by side).
        setOtpData({
          is_screen_visible: true,
          email: data.email || ``,
          phone_number: data.phone_number || ``,
          is_totp: step.totp,
          offer_webauthn_verify: step.webauthn,
          has_code_factor: step.totp || step.email || step.mobile,
        });
        return;
      }
      // step.kind === 'complete'
      setError(``);
      setAuthData({
        user: step.response.user || null,
        token: step.response,
        config,
        loading: false,
      });
      if (onLogin) {
        onLogin(step.response);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const onErrorClose = () => {
    setError(``);
  };

  useEffect(() => {
    if (formData.email_or_phone_number === '') {
      setErrorData(prev => ({
        ...prev,
        email_or_phone_number: 'Email OR Phone Number is required',
      }));
    } else if (
      formData.email_or_phone_number !== null &&
      !isEmail(formData.email_or_phone_number || '') &&
      !isMobilePhone(formData.email_or_phone_number || '')
    ) {
      setErrorData(prev => ({
        ...prev,
        email_or_phone_number: 'Invalid Email OR Phone Number',
      }));
    } else {
      setErrorData(prev => ({ ...prev, email_or_phone_number: null }));
    }
  }, [formData.email_or_phone_number]);

  useEffect(() => {
    if (formData.password === '') {
      setErrorData(prev => ({ ...prev, password: 'Password is required' }));
    } else {
      setErrorData(prev => ({ ...prev, password: null }));
    }
  }, [formData.password]);

  if (locked) {
    return <AuthorizerMfaLocked />;
  }

  if (mfaOfferData.is_screen_visible) {
    return (
      <AuthorizerMFASetup
        availableMfaMethods={{
          totp: !!mfaOfferData.totpEnrollment || config.is_totp_mfa_enabled,
          passkey: false,
          emailOtp: mfaOfferData.emailOtp,
          smsOtp: mfaOfferData.smsOtp,
        }}
        totpEnrollment={mfaOfferData.totpEnrollment || undefined}
        heading="Set up multi-factor authentication"
        loginContext={{
          email: mfaOfferData.email,
          phone_number: mfaOfferData.phone_number,
          state: mfaOfferData.state,
          onComplete: (data) => {
            setAuthData({
              user: (data as any).user || null,
              token: data as any,
              config,
              loading: false,
            });
            if (onLogin) {
              onLogin(data as any);
            }
          },
        }}
      />
    );
  }

  if (otpData.is_screen_visible) {
    return (
      <AuthorizerVerifyOtp
        {...{
          setView,
          onLogin,
          email: otpData.email || ``,
          phone_number: otpData.phone_number || ``,
          is_totp: otpData.is_totp || false,
          offerWebauthnVerify: otpData.offer_webauthn_verify || false,
          hasCodeFactor: otpData.has_code_factor || false,
        }}
        urlProps={urlProps}
      />
    );
  }

  return (
    <>
      {error && (
        <Message type={MessageType.Error} text={error} onClose={onErrorClose} />
      )}
      <>
        <form onSubmit={onSubmit} name="authorizer-login-form">
          <div className="styled-form-group">
            <label
              className="form-input-label"
              htmlFor="authorizer-login-email"
            >
              <span>* </span>
              {getEmailPhoneLabels(config)}
            </label>
            <input
              name="email_or_phone_number"
              id="authorizer-login-email-or-phone-number"
              className={`form-input-field ${
                errorData.email_or_phone_number ? 'input-error-content' : ''
              }`}
              placeholder={getEmailPhonePlaceholder(config)}
              type="text"
              autoComplete="username"
              value={formData.email_or_phone_number || ''}
              onChange={e =>
                onInputChange('email_or_phone_number', e.target.value)
              }
            />
            {errorData.email_or_phone_number && (
              <div className="form-input-error">
                {errorData.email_or_phone_number}
              </div>
            )}
          </div>
          <div className="styled-form-group">
            <label
              className="form-input-label"
              htmlFor="authorizer-login-password"
            >
              <span>* </span>Password
            </label>
            <input
              name="password"
              id="authorizer-login-password"
              className={`form-input-field ${
                errorData.password ? 'input-error-content' : ''
              }`}
              placeholder="********"
              type="password"
              value={formData.password || ''}
              onChange={e => onInputChange('password', e.target.value)}
            />
            {errorData.password && (
              <div className="form-input-error">{errorData.password}</div>
            )}
          </div>
          <br />
          <StyledButton
            type="submit"
            disabled={
              !!errorData.email_or_phone_number ||
              !!errorData.password ||
              !formData.email_or_phone_number ||
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
