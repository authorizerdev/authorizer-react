import React, { FC, useState } from 'react';
import { Form, Field } from 'react-final-form';

import { ButtonAppearance, MessageType } from '../constants';
import { useAuthorizer } from '../contexts/AuthorizerContext';
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
  onReset?: (res: any) => void;
};

export const AuthorizerResetPassword: FC<Props> = ({ onReset }) => {
  const { token } = getSearchParams();
  const [error, setError] = useState(!token ? `Invalid token` : ``);
  const [loading, setLoading] = useState(false);
  const { authorizerRef, config } = useAuthorizer();

  const onSubmit = async (values: Record<string, string>) => {
    setLoading(true);
    try {
      const res = await authorizerRef.resetPassword({
        token,
        ...values,
      });
      setLoading(false);
      setError(``);
      if (onReset) {
        onReset(res);
      } else {
        window.location.href = config.redirectURL || window.location.origin;
      }
    } catch (err) {
      setLoading(false);
      setError(formatErrorMessage((err as Error).message));
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
            <form onSubmit={handleSubmit} name="authorizer-reset-password-form">
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
                {loading ? `Processing ...` : `Continue`}
              </Button>
            </form>
          )}
        </Form>
      </Wrapper>
    </ThemeProvider>
  );
};
