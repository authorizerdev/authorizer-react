import React, { FC, useState } from 'react';
import { Form, Field } from 'react-final-form';

import { ButtonAppearance, MessageType } from '../constants';
import { useAuthorizer } from '../contexts/AuthorizerContext';
import { Input, Label, FieldWrapper, Required, Button, Error } from '../styles';
import { hasErrors, isValidEmail } from '../utils/validations';
import { formatErrorMessage } from '../utils/format';
import { Message } from './Message';

export const AuthorizerMagicLinkLogin: FC<{
  onMagicLinkLogin?: (data: any) => void;
  urlProps: Record<string, any>;
}> = ({ onMagicLinkLogin, urlProps }) => {
  const [error, setError] = useState(``);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState(``);
  const { authorizerRef } = useAuthorizer();

  const onSubmit = async (values: Record<string, string>) => {
    try {
      setLoading(true);

      const res = await authorizerRef.magicLinkLogin({
        email: values.email,
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

  if (successMessage) {
    return <Message type={MessageType.Success} text={successMessage} />;
  }

  return (
    <>
      {error && (
        <Message type={MessageType.Error} text={error} onClose={onErrorClose} />
      )}
      <Form
        onSubmit={onSubmit}
        validate={(values) => {
          const errors: Record<string, string> = {};
          if (!values.email) {
            errors.email = 'Email is required';
          }

          if (
            values.email &&
            values.email.trim() &&
            !isValidEmail(values.email)
          ) {
            errors.email = `Please enter valid email`;
          }

          return errors;
        }}
      >
        {({ handleSubmit, pristine, errors }) => (
          <form onSubmit={handleSubmit} name="authorizer-magic-login-form">
            <FieldWrapper>
              <Field name="email">
                {({ input, meta }) => (
                  <div>
                    <Label>
                      <Required>*</Required>Email
                    </Label>
                    <Input
                      {...input}
                      type="email"
                      placeholder="eg. foo@bar.com"
                      hasError={Boolean(meta.error && meta.touched)}
                    />
                    {meta.error && meta.touched && <Error>{meta.error}</Error>}
                  </div>
                )}
              </Field>
            </FieldWrapper>
            <br />
            <Button
              type="submit"
              disabled={pristine || loading || hasErrors(errors)}
              appearance={ButtonAppearance.Primary}
            >
              {loading ? `Processing ...` : `Send Email`}
            </Button>
          </form>
        )}
      </Form>
    </>
  );
};
