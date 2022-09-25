import React, { FC, useState } from 'react';
import { Form, Field } from 'react-final-form';
import { AuthToken, SignupInput } from '@authorizerdev/authorizer-js';

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
import { hasErrors, isValidEmail } from '../utils/validations';
import { formatErrorMessage } from '../utils/format';
import { Message } from './Message';
import PasswordStrengthIndicator from './PasswordStrengthIndicator';

export const AuthorizerSignup: FC<{
  setView?: (v: Views) => void;
  onSignup?: (data: AuthToken) => void;
  urlProps: Record<string, any>;
}> = ({ setView, onSignup, urlProps }) => {
  const [error, setError] = useState(``);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState(``);
  const { authorizerRef, config, setAuthData } = useAuthorizer();
  const [disableSignupButton, setDisableSignupButton] = useState(false);

  const onSubmit = async (values: SignupInput) => {
    try {
      setLoading(true);
      const data: SignupInput = values;
      if (urlProps.scope) {
        data.scope = urlProps.scope;
      }
      if (urlProps.roles) {
        data.roles = urlProps.roles;
      }
      if (urlProps.redirect_uri) {
        data.redirect_uri = urlProps.redirect_uri;
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
                  errors.confirm_password = 'Confirm password is required';
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
              {({ handleSubmit, pristine, values, errors }) => (
                <>
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
                          <>
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
                          </>
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
                    {config.is_strong_password_enabled && (
                      <>
                        <PasswordStrengthIndicator
                          value={values.password}
                          setDisableButton={setDisableSignupButton}
                        />
                        <br />
                      </>
                    )}
                    <Button
                      type="submit"
                      disabled={
                        pristine ||
                        loading ||
                        disableSignupButton ||
                        hasErrors(errors)
                      }
                      appearance={ButtonAppearance.Primary}
                    >
                      {loading ? `Processing ...` : `Sign Up`}
                    </Button>
                  </form>
                </>
              )}
            </Form>
            {setView && (
              <Footer>
                <div>
                  Already have an account?{' '}
                  <Link onClick={() => setView(Views.Login)}>Log In</Link>
                </div>
              </Footer>
            )}
          </>
        )}
    </>
  );
};
