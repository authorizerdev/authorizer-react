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
import { hasErrors, isValidOtp } from '../utils/validations';
import { Message } from './Message';

export const AuthorizerVerifyOtp: FC<{
  setView?: (v: Views) => void;
  onLogin?: (data: any) => void;
  email: string;
}> = ({ setView, onLogin, email }) => {
  const [error, setError] = useState(``);
  const [successMessage, setSuccessMessage] = useState(``);
  const [loading, setLoading] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const { authorizerRef, config, setAuthData } = useAuthorizer();

  const onSubmit = async (values: Record<string, string>) => {
    setSuccessMessage(``);
    try {
      setLoading(true);

      const res = await authorizerRef.verifyOtp({
        email,
        otp: values.otp,
      });
      setLoading(false);

      if (res) {
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
      }

      if (onLogin) {
        onLogin(res);
      }
    } catch (err) {
      setLoading(false);
      setError((err as Error).message);
    }
  };

  const onErrorClose = () => {
    setError(``);
  };

  const onSuccessClose = () => {
    setSuccessMessage(``);
  };

  const resendOtp = async () => {
    setSuccessMessage(``);
    try {
      setSendingOtp(true);

      const res = await authorizerRef.resendOtp({
        email,
      });
      setSendingOtp(false);

      if (res && res?.message) {
        setError(``);
        setSuccessMessage(res.message);
      }

      if (onLogin) {
        onLogin(res);
      }
    } catch (err) {
      setLoading(false);
      setError((err as Error).message);
    }
  };

  return (
    <>
      {successMessage && (
        <Message
          type={MessageType.Success}
          text={successMessage}
          onClose={onSuccessClose}
        />
      )}
      {error && (
        <Message type={MessageType.Error} text={error} onClose={onErrorClose} />
      )}
      <p style={{ textAlign: 'center', margin: '10px 0px' }}>
        Please enter the OTP you received on your email address.
      </p>
      <br />
      <Form
        onSubmit={onSubmit}
        validate={(values) => {
          const errors: Record<string, string> = {};
          if (!values.otp) {
            errors.otp = 'OTP is required';
          }

          if (values.otp && values.otp.trim() && !isValidOtp(values.otp)) {
            errors.otp = `Please enter valid OTP`;
          }

          return errors;
        }}
      >
        {({ handleSubmit, pristine, errors }) => (
          <form onSubmit={handleSubmit} name="authorizer-mfa-otp-form">
            <FieldWrapper>
              <Field name="otp">
                {({ input, meta }) => (
                  <div>
                    <Label>
                      <Required>*</Required>OTP (One Time Password)
                    </Label>
                    <Input
                      {...input}
                      type="text"
                      placeholder="e.g.- AB123C"
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
              {loading ? `Processing ...` : `Submit`}
            </Button>
          </form>
        )}
      </Form>
      {setView && (
        <Footer>
          {sendingOtp ? (
            <div style={{ marginBottom: '10px' }}>Sending ...</div>
          ) : (
            <Link onClick={resendOtp} style={{ marginBottom: 10 }}>
              Resend OTP
            </Link>
          )}
          {config.is_sign_up_enabled && (
            <div>
              Don't have an account?{' '}
              <Link onClick={() => setView(Views.Signup)}>Sign Up</Link>
            </div>
          )}
        </Footer>
      )}
    </>
  );
};
