import React, { FC, useState } from 'react';
import { Form, Field } from 'react-final-form';
import { AuthToken } from '@authorizerdev/authorizer-js';

import { ButtonAppearance, MessageType, Views } from '../constants';
import { useAuthorizer } from '../contexts/AuthorizerContext';
import {
  Input,
  Label,
  FieldWrapper,
  Required,
  Button,
  Error,
  Footer,
  Link,
} from '../styles';
import { isValidEmail } from '../utils/validations';
import { AuthorizerSocialLogin } from './AuthorizerSocialLogin';
import { AuthorizerMagicLinkLogin } from './AuthorizerMagicLinkLogin';
import { formatErrorMessage } from '../utils/format';
import { Message } from './Message';

export const AuthorizerSignup: FC<{
  setView: (v: Views) => void;
  onSignup?: (data: AuthToken) => void;
}> = ({ setView, onSignup }) => {
  const [error, setError] = useState(``);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState(``);
  const { authorizerRef, config, setAuthData } = useAuthorizer();

  const onSubmit = async (values: Record<string, string>) => {
    try {
      setLoading(true);
      const res = await authorizerRef.signup(values);

      setError(``);
      if (res.accessToken) {
        setError(``);
        setAuthData({
          user: res.user,
          token: {
            access_token: res.access_token,
            expires_at: res.expires_at,
          },
          config,
          loading: false,
        });
      } else {
        setLoading(false);
        setSuccessMessage(res.message);
      }

      if (onSignup) {
        onSignup(res);
      }
    } catch (err) {
      setLoading(false);
      setError(formatErrorMessage((err as Error).message));
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
      <AuthorizerSocialLogin />
      {config.is_basic_authentication_enabled &&
        !config.is_magic_link_login_enabled && (
          <>
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

                if (!values.password) {
                  errors.password = 'Password is required';
                }

                if (!values.confirm_password) {
                  errors.password = 'Confirm password is required';
                }

                if (
                  values.password &&
                  values.confirm_password &&
                  values.confirm_password !== values.password
                ) {
                  errors.confirm_password = `Password and confirm passwords don't match`;
                  errors.password = `Password and confirm passwords don't match`;
                }
                return errors;
              }}
            >
              {({ handleSubmit, pristine }) => (
                <form onSubmit={handleSubmit} name="authorizer-signup-form">
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
                          {meta.error && meta.touched && (
                            <Error>{meta.error}</Error>
                          )}
                        </div>
                      )}
                    </Field>
                  </FieldWrapper>
                  <FieldWrapper>
                    <Field name="password">
                      {({ input, meta }) => (
                        <div>
                          <Label>
                            <Required>*</Required>
                            Password
                          </Label>
                          <Input
                            {...input}
                            type="password"
                            placeholder="*********"
                            hasError={Boolean(meta.error && meta.touched)}
                          />
                          {meta.error && meta.touched && (
                            <Error>{meta.error}</Error>
                          )}
                        </div>
                      )}
                    </Field>
                  </FieldWrapper>
                  <FieldWrapper>
                    <Field name="confirm_password">
                      {({ input, meta }) => (
                        <div>
                          <Label>
                            <Required>*</Required>
                            Confirm Password
                          </Label>
                          <Input
                            {...input}
                            type="password"
                            placeholder="*********"
                            hasError={Boolean(meta.error && meta.touched)}
                          />
                          {meta.error && meta.touched && (
                            <Error>{meta.error}</Error>
                          )}
                        </div>
                      )}
                    </Field>
                  </FieldWrapper>
                  <br />
                  <Button
                    type="submit"
                    disabled={pristine || loading}
                    appearance={ButtonAppearance.Primary}
                  >
                    {loading ? `Processing ...` : `Sign Up`}
                  </Button>
                </form>
              )}
            </Form>
            <Footer>
              <div>
                Already have an account?{' '}
                <Link onClick={() => setView(Views.Login)}>Log In</Link>
              </div>
            </Footer>
          </>
        )}

      {config.is_magic_link_login_enabled && <AuthorizerMagicLinkLogin />}
    </>
  );
};
