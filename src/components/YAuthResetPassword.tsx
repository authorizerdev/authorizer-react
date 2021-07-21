import React, { FC, useState } from 'react';
import { Form, Field } from 'react-final-form';
import { gql } from '@urql/core';

import { ButtonAppearance, MessageType } from '../constants';
import { useYAuth } from '../contexts/YAuthContext';
import {
  Input,
  Label,
  FieldWrapper,
  Required,
  Button,
  Error,
  Wrapper,
} from '../styles';
import { formatErrorMessage } from '../utils/format';
import { Message } from './Message';
import { getSearchParams } from '../utils/url';
import { ThemeProvider } from 'styled-components';
import { theme } from '../styles/theme';

type Props = {
  onReset?: () => void;
};

export const YAuthResetPassword: FC<Props> = ({ onReset }) => {
  const { token } = getSearchParams();
  const [error, setError] = useState(!token ? `Invalid token` : ``);
  const [loading, setLoading] = useState(false);
  const { graphQlRef } = useYAuth();

  const onSubmit = async (values: Record<string, string>) => {
    console.log({ values });
    setLoading(true);
    const res = await graphQlRef
      .mutation(
        gql`
          mutation resetPassword($params: ResetPassowrdInput!) {
            resetPassword(params: $params) {
              message
            }
          }
        `,
        {
          params: {
            ...values,
            token: token || '',
          },
        }
      )
      .toPromise();
    setLoading(false);
    console.log({ res });
    if (res?.error?.message) {
      setError(formatErrorMessage(res.error.message));
    }

    if (res.data) {
      setError(``);
      if (onReset) {
        onReset();
      } else {
        window.location.href = '/';
      }
    }
  };

  const onErrorClose = () => {
    setError(``);
  };

  return (
    <ThemeProvider theme={theme}>
      <Wrapper>
        {error && (
          <Message
            type={MessageType.Error}
            text={error}
            onClose={onErrorClose}
          />
        )}
        <Form
          onSubmit={onSubmit}
          validate={(values) => {
            const errors: Record<string, string> = {};

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
            <form onSubmit={handleSubmit} name="yauth-reset-password-form">
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
                {loading ? `Processing ...` : `Reset Password`}
              </Button>
            </form>
          )}
        </Form>
      </Wrapper>
    </ThemeProvider>
  );
};
