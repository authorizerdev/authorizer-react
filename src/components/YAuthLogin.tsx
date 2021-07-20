import React, { FC } from 'react';
import { Form, Field } from 'react-final-form';
import { ButtonAppearance } from '../constants';

import { Input, Label, FieldWrapper, Required, Button, Error } from '../styles';
import { isValidEmail } from '../utils/validations';
import { SocialLogin } from './SocialLogin';

export const YAuthLogin: FC = () => {
  const onSubmit = (values: Record<string, string>) => {
    console.log(values);
  };

  return (
    <>
      <SocialLogin />
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
          <form onSubmit={handleSubmit}>
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
                    {meta.error && meta.touched && <Error>{meta.error}</Error>}
                  </div>
                )}
              </Field>
            </FieldWrapper>
            <br />
            <Button
              type="submit"
              disabled={pristine}
              appearance={ButtonAppearance.Primary}
            >
              Log In
            </Button>
          </form>
        )}
      </Form>
    </>
  );
};
