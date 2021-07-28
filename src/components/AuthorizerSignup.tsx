import React, { FC, useState } from 'react';
import { Form, Field } from 'react-final-form';
import { gql } from '@urql/core';

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
import { formatErrorMessage } from '../utils/format';
import { Message } from './Message';

export const AuthorizerSignup: FC<{
  setView: (v: Views) => void;
}> = ({ setView }) => {
  const [error, setError] = useState(``);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState(``);
  const { graphQlRef, config, setToken, setUser } = useAuthorizer();

  const onSubmit = async (values: Record<string, string>) => {
    setLoading(true);
    const res = await graphQlRef
      .mutation(
        gql`
          mutation signup($params: SignUpInput!) {
            signup(params: $params) {
              message
              accessToken
              accessTokenExpiresAt
              user {
                id
                firstName
                lastName
                email
                image
              }
            }
          }
        `,
        {
          params: values,
        }
      )
      .toPromise();
    setLoading(false);
    if (res?.error?.message) {
      setError(formatErrorMessage(res.error.message));
    }

    if (res.data) {
      setError(``);
      if (res.data.signup.accessToken) {
        setError(``);
        setUser(res.data.signup.user);
        setToken({
          accessToken: res.data.signup.accessToken,
          accessTokenExpiresAt: res.data.signup.accessTokenExpiresAt,
        });
      } else {
        setSuccessMessage(res.data.signup.message);
      }
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
      {config.isBasicAuthenticationEnabled && (
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

              if (!values.confirmPassword) {
                errors.password = 'Confirm password is required';
              }

              if (
                values.password &&
                values.confirmPassword &&
                values.confirmPassword !== values.password
              ) {
                errors.confirmPassword = `Password and confirm passwords don't match`;
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
                  <Field name="confirmPassword">
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
    </>
  );
};
