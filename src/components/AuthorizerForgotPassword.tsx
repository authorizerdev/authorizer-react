import React, { FC, useEffect, useState } from 'react';

import { ButtonAppearance, MessageType, Views } from '../constants';
import { useAuthorizer } from '../contexts/AuthorizerContext';
import { Button, Footer, Link, StyledFormGroup } from '../styles';
import { isValidEmail } from '../utils/validations';
import { formatErrorMessage } from '../utils/format';
import { Message } from './Message';

interface InputDataType {
  email: string | null;
}

export const AuthorizerForgotPassword: FC<{
  setView?: (v: Views) => void;
  onForgotPassword?: (data: any) => void;
  urlProps: Record<string, any>;
}> = ({ setView, onForgotPassword, urlProps }) => {
  const [error, setError] = useState(``);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState(``);
  const [formData, setFormData] = useState<InputDataType>({
    email: null,
  });
  const [errorData, setErrorData] = useState<InputDataType>({
    email: null,
  });
  const { authorizerRef, config } = useAuthorizer();

  const onInputChange = async (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const onSubmit = async (e: any) => {
    e.preventDefault();
    try {
      setLoading(true);

      const res = await authorizerRef.forgotPassword({
        email: formData.email || '',
        state: urlProps.state || '',
        redirect_uri:
          urlProps.redirect_uri || config.redirectURL || window.location.origin,
      });
      setLoading(false);

      if (res && res.message) {
        setError(``);
        setSuccessMessage(res.message);
      }

      if (onForgotPassword) {
        onForgotPassword(res);
      }
    } catch (err) {
      setLoading(false);
      setError(formatErrorMessage((err as Error)?.message));
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

  if (successMessage) {
    return <Message type={MessageType.Success} text={successMessage} />;
  }

  return (
    <>
      {error && (
        <Message type={MessageType.Error} text={error} onClose={onErrorClose} />
      )}
      <p style={{ textAlign: 'center', margin: '10px 0px' }}>
        Please enter your email address.
        <br /> We will send you an email to reset your password.
      </p>
      <br />
      <form onSubmit={onSubmit} name="authorizer-forgot-password-form">
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
        <br />
        <Button
          type="submit"
          disabled={loading || !!errorData.email || !formData.email}
          appearance={ButtonAppearance.Primary}
        >
          {loading ? `Processing ...` : `Send Email`}
        </Button>
      </form>
      {setView && (
        <Footer>
          <div>
            Remember your password?{' '}
            <Link onClick={() => setView(Views.Login)}>Log In</Link>
          </div>
        </Footer>
      )}
    </>
  );
};
