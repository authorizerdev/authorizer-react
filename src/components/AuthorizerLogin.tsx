import React, { FC, useState } from 'react';
import { Form, Field } from 'react-final-form';

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
import { AuthorizerMagicLinkLogin } from './AuthorizerMagicLinkLogin';
import { AuthorizerSocialLogin } from './AuthorizerSocialLogin';
import { Message } from './Message';

export const AuthorizerLogin: FC<{
  setView: (v: Views) => void;
}> = ({ setView }) => {
  const [error, setError] = useState(``);
  const [loading, setLoading] = useState(false);
  const { setAuthData, config, authorizerRef } = useAuthorizer();

  const onSubmit = async (values: Record<string, string>) => {
    setLoading(true);
    try {
      const res = await authorizerRef.login({
        email: values.email,
        password: values.password,
      });

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
    } catch (err) {
      setLoading(false);
      setError((err as Error).message);
    }
  };

  const onErrorClose = () => {
    setError(``);
  };

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
                return errors;
              }}
            >
              {({ handleSubmit, pristine }) => (
                <form onSubmit={handleSubmit} name="authorizer-login-form">
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
                  <br />
                  <Button
                    type="submit"
                    disabled={pristine || loading}
                    appearance={ButtonAppearance.Primary}
                  >
                    {loading ? `Processing ...` : `Log In`}
                  </Button>
                </form>
              )}
            </Form>

            <Footer>
              <Link
                onClick={() => setView(Views.ForgotPassword)}
                style={{ marginBottom: 10 }}
              >
                Forgot Password?
              </Link>

              <div>
                Don't have an account?{' '}
                <Link onClick={() => setView(Views.Signup)}>Sign Up</Link>
              </div>
            </Footer>
          </>
        )}

      {config.is_magic_link_login_enabled && <AuthorizerMagicLinkLogin />}
    </>
  );
};
