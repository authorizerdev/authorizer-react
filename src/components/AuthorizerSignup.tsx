import { FC, useEffect, useState } from 'react';
import { AuthToken, SignUpRequest } from '@authorizerdev/authorizer-js';
import validator from 'validator';
const { isEmail, isMobilePhone } = validator;

import '../styles/default.css';
import { ButtonAppearance, MessageType, Views } from '../constants';
import { useAuthorizer } from '../contexts/AuthorizerContext';
import { StyledButton, StyledFooter, StyledLink } from '../styledComponents';
import { formatErrorMessage } from '../utils/format';
import { Message } from './Message';
import { PasswordInput } from './PasswordInput';
import PasswordStrengthIndicator from './PasswordStrengthIndicator';
import { OtpDataType } from '../types';
import { AuthorizerVerifyOtp } from './AuthorizerVerifyOtp';
import { AuthorizerMFASetup } from './AuthorizerMFASetup';
import { AuthorizerMfaLocked } from './AuthorizerMfaLocked';
import { getEmailPhoneLabels, getEmailPhonePlaceholder } from '../utils/labels';
import { resolveAuthStep, TotpEnrollment } from '../utils/mfaTriage';

type Field =
  | 'given_name'
  | 'family_name'
  | 'email_or_phone_number'
  | 'password'
  | 'confirmPassword';

type FieldOverride = {
  label: string;
  placeholder: string;
  hide?: boolean;
  notRequired?: boolean;
};

type InputDataType = {
  [K in Field]: string | null;
};

export type FormFieldsOverrides = {
  [K in Field]?: FieldOverride;
};

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
  passkey: boolean;
  emailOtp: boolean;
  smsOtp: boolean;
  state?: string;
};

const initMfaOfferData: MfaOfferData = {
  is_screen_visible: false,
  email: '',
  phone_number: '',
  totpEnrollment: null,
  passkey: false,
  emailOtp: false,
  smsOtp: false,
};

export type SignupStep = 'form' | 'mfa-setup' | 'otp-verify' | 'locked';

export const AuthorizerSignup: FC<{
  setView?: (v: Views) => void;
  onSignup?: (data: AuthToken) => void;
  urlProps?: Record<string, any>;
  roles?: string[];
  fieldOverrides?: FormFieldsOverrides;
  // Fired whenever this component switches between its own internal
  // screens. Hosts that render other login options (e.g. "Continue with
  // Google") alongside the signup form need this to hide them once the
  // account exists and the user has moved on to MFA setup/verification -
  // those options no longer make sense on top of those screens.
  onStepChange?: (step: SignupStep) => void;
}> = ({ setView, onSignup, urlProps, roles, fieldOverrides, onStepChange }) => {
  const [error, setError] = useState(``);
  const [loading, setLoading] = useState(false);
  const [otpData, setOtpData] = useState<OtpDataType>({ ...initOtpData });
  const [mfaOfferData, setMfaOfferData] = useState<MfaOfferData>({
    ...initMfaOfferData,
  });
  const [locked, setLocked] = useState(false);
  const [successMessage, setSuccessMessage] = useState(``);
  const [formData, setFormData] = useState<InputDataType>({
    given_name: null,
    family_name: null,
    email_or_phone_number: null,
    password: null,
    confirmPassword: null,
  });
  const [errorData, setErrorData] = useState<InputDataType>({
    given_name: null,
    family_name: null,
    email_or_phone_number: null,
    password: null,
    confirmPassword: null,
  });
  const { authorizerRef, config, setAuthData } = useAuthorizer();
  const [disableSignupButton, setDisableSignupButton] = useState(false);

  useEffect(() => {
    if (!onStepChange) return;
    if (locked) {
      onStepChange('locked');
    } else if (mfaOfferData.is_screen_visible) {
      onStepChange('mfa-setup');
    } else if (otpData.is_screen_visible) {
      onStepChange('otp-verify');
    } else {
      onStepChange('form');
    }
  }, [locked, mfaOfferData.is_screen_visible, otpData.is_screen_visible]);

  const onInputChange = async (field: string, value: string) =>
    setFormData({ ...formData, [field]: value });

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
      const data: SignUpRequest = {
        email,
        phone_number,
        given_name: formData.given_name || '',
        family_name: formData.family_name || '',
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
      const step = resolveAuthStep(res, errors || []);
      if (step.kind === 'error') {
        // resolveAuthStep's fallback for "no access_token and no known MFA
        // signal" also covers signup's own legitimate non-error outcome -
        // email verification pending, where the server intentionally
        // withholds a token and returns an informational res.message
        // instead of a GraphQL error. Only treat this as a real failure
        // when the SDK actually returned an error.
        if (!(errors && errors.length) && res) {
          setError(``);
          setSuccessMessage(res.message || ``);
          if (onSignup) {
            onSignup(res);
          }
          return;
        }
        setError(formatErrorMessage(step.message));
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
          passkey: step.passkey,
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
          has_sms_otp: step.mobile,
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
      setSuccessMessage(step.response.message || ``);
      if (onSignup) {
        onSignup(step.response);
      }
    } catch (err) {
      setError(formatErrorMessage((err as Error).message));
    } finally {
      setLoading(false);
    }
  };

  const onErrorClose = () => setError(``);

  useEffect(() => {
    if (
      fieldOverrides?.given_name?.notRequired ||
      fieldOverrides?.given_name?.hide
    ) {
      return;
    }
    if (
      formData.given_name !== null &&
      (formData.given_name || '').trim() === ''
    ) {
      setErrorData(prev => ({ ...prev, given_name: 'First Name is required' }));
    } else {
      setErrorData(prev => ({ ...prev, given_name: null }));
    }
  }, [formData.given_name]);

  useEffect(() => {
    if (
      fieldOverrides?.family_name?.notRequired ||
      fieldOverrides?.family_name?.hide
    ) {
      return;
    }
    if (
      formData.family_name !== null &&
      (formData.family_name || '').trim() === ''
    ) {
      setErrorData(prev => ({ ...prev, family_name: 'Last Name is required' }));
    } else {
      setErrorData(prev => ({ ...prev, family_name: null }));
    }
  }, [formData.family_name]);

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

  useEffect(() => {
    if (formData.confirmPassword === '') {
      setErrorData(prev => ({
        ...prev,
        confirmPassword: 'Confirm password is required',
      }));
    } else {
      setErrorData(prev => ({ ...prev, confirmPassword: null }));
    }
  }, [formData.confirmPassword]);

  useEffect(() => {
    if (formData.password && formData.confirmPassword) {
      if (formData.confirmPassword !== formData.password) {
        setErrorData(prev => ({
          ...prev,
          password: `Password and confirm passwords don't match`,
          confirmPassword: `Password and confirm passwords don't match`,
        }));
      } else {
        setErrorData(prev => ({
          ...prev,
          password: null,
          confirmPassword: null,
        }));
      }
    }
  }, [formData.password, formData.confirmPassword]);

  if (locked) {
    return <AuthorizerMfaLocked />;
  }

  if (mfaOfferData.is_screen_visible) {
    return (
      <AuthorizerMFASetup
        availableMfaMethods={{
          totp: !!mfaOfferData.totpEnrollment || config.is_totp_mfa_enabled,
          passkey: mfaOfferData.passkey,
          emailOtp: mfaOfferData.emailOtp,
          smsOtp: mfaOfferData.smsOtp,
        }}
        totpEnrollment={mfaOfferData.totpEnrollment || undefined}
        heading="Set up multi-factor authentication"
        onBack={() => setMfaOfferData({ ...initMfaOfferData })}
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
            if (onSignup) {
              onSignup(data as any);
            }
          },
        }}
      />
    );
  }

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
            offerWebauthnVerify: otpData.offer_webauthn_verify || false,
            hasCodeFactor: otpData.has_code_factor || false,
            hasSmsOtp: otpData.has_sms_otp || false,
            onBack: () => setOtpData({ ...initOtpData }),
          }}
          urlProps={urlProps}
        />
      </>
    );
  }

  const renderField = (
    key: Field,
    label: string,
    placeholder: string,
    type?: 'text' | 'password'
  ) => {
    const fieldOverride = fieldOverrides?.[key];
    if (fieldOverride?.hide) {
      return null;
    }
    if (type === 'password') {
      return (
        <PasswordInput
          id={`authorizer-sign-up-${key}`}
          name={key}
          label={fieldOverride?.label ?? label}
          placeholder={fieldOverride?.placeholder ?? placeholder}
          autoComplete={key === 'password' ? 'new-password' : 'off'}
          value={formData[key] || ''}
          onChange={(value) => onInputChange(key, value)}
          error={errorData[key]}
        />
      );
    }
    return (
      <div className="styled-form-group">
        <label
          className="form-input-label"
          htmlFor={`authorizer-sign-up-${key}`}
        >
          {!fieldOverride?.notRequired && <span>* </span>}
          {fieldOverride?.label ?? label}
        </label>
        <input
          name={key}
          id={`authorizer-sign-up-${key}`}
          className={`form-input-field ${
            errorData[key] ? 'input-error-content' : ''
          }`}
          placeholder={fieldOverride?.placeholder ?? placeholder}
          type={type}
          value={formData[key] || ''}
          onChange={(e) => onInputChange(key, e.target.value)}
        />
        {errorData[key] && (
          <div className="form-input-error">{errorData[key]}</div>
        )}
      </div>
    );
  };

  const shouldFieldBlockSubmit = (key: Field) => {
    if (
      (formData[key] ||
        fieldOverrides?.[key]?.notRequired ||
        fieldOverrides?.[key]?.hide) &&
      !errorData[key]
    ) {
      return false;
    }
    return true;
  };

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
              {renderField('given_name', 'First Name', 'eg. John', 'text')}
              {renderField('family_name', 'Last Name', 'eg. Doe', 'text')}
              {renderField(
                'email_or_phone_number',
                getEmailPhoneLabels(config),
                getEmailPhonePlaceholder(config)
              )}
              {renderField('password', 'Password', '********', 'password')}
              {renderField(
                'confirmPassword',
                'Confirm Password',
                '********',
                'password'
              )}
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
                  shouldFieldBlockSubmit('given_name') ||
                  shouldFieldBlockSubmit('family_name') ||
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
