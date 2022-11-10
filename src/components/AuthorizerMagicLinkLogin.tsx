import React, { FC, useEffect, useState } from 'react';
import styles from '../styles/default.mod.css';

import { ButtonAppearance, MessageType } from '../constants';
import { useAuthorizer } from '../contexts/AuthorizerContext';
import { StyledButton } from '../styledComponents';
import { isValidEmail } from '../utils/validations';
import { formatErrorMessage } from '../utils/format';
import { Message } from './Message';

interface InputDataType {
  email: string | null;
}

export const AuthorizerMagicLinkLogin: FC<{
  onMagicLinkLogin?: (data: any) => void;
  urlProps: Record<string, any>;
}> = ({ onMagicLinkLogin, urlProps }) => {
  const [error, setError] = useState(``);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState(``);
  const [formData, setFormData] = useState<InputDataType>({
    email: null,
  });
  const [errorData, setErrorData] = useState<InputDataType>({
    email: null,
  });
  const { authorizerRef } = useAuthorizer();

  const onInputChange = async (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const onSubmit = async (e: any) => {
    e.preventDefault();
    try {
      setLoading(true);

      const res = await authorizerRef.magicLinkLogin({
        email: formData.email || '',
        state: urlProps.state || '',
        redirect_uri: urlProps.redirect_uri || '',
      });
      setLoading(false);

      if (res) {
        setError(``);
        setSuccessMessage(res.message || ``);

        if (onMagicLinkLogin) {
          onMagicLinkLogin(res);
        }
      }

      if (urlProps.redirect_uri) {
        setTimeout(() => {
          window.location.replace(urlProps.redirect_uri);
        }, 3000);
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
      <form onSubmit={onSubmit} name="authorizer-magic-login-form">
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
            onChange={e => onInputChange('email', e.target.value)}
          />
          {errorData.email && (
            <div className={styles['form-input-error']}>{errorData.email}</div>
          )}
        </div>
        <br />
        <StyledButton
          type="submit"
          disabled={loading || !!errorData.email || !formData.email}
          appearance={ButtonAppearance.Primary}
        >
          {loading ? `Processing ...` : `Send Email`}
        </StyledButton>
      </form>
    </>
  );
};
