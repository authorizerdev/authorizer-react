import React, { FC, useState } from 'react';
import { ThemeProvider } from 'styled-components';
import { AuthorizerLogin } from './components/AuthorizerLogin';
import {
  AuthorizerProvider,
  useAuthorizer,
} from './contexts/AuthorizerContext';
import { Wrapper, Link, Footer } from './styles';
import { theme } from './styles/theme';
import { Views } from './constants';
import { AuthorizerSignup } from './components/AuthorizerSignup';
import { AuthorizerForgotPassword } from './components/AuthorizerForgotPassword';
import { AuthorizerResetPassword } from './components/AuthorizerResetPassword';

export const Authorizer: FC = () => {
  const [view, setView] = useState(Views.Login);

  return (
    <ThemeProvider theme={theme}>
      <Wrapper>
        {view === Views.Login && <AuthorizerLogin />}

        {view === Views.Login && (
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
        )}

        {view === Views.Signup && <AuthorizerSignup />}

        {view === Views.Signup && (
          <Footer>
            <div>
              Already have an account?{' '}
              <Link onClick={() => setView(Views.Login)}>Log In</Link>
            </div>
          </Footer>
        )}

        {view == Views.ForgotPassword && <AuthorizerForgotPassword />}
        {view === Views.ForgotPassword && (
          <Footer>
            <div>
              Remember your password?{' '}
              <Link onClick={() => setView(Views.Login)}>Log In</Link>
            </div>
          </Footer>
        )}
      </Wrapper>
    </ThemeProvider>
  );
};

export { AuthorizerProvider, useAuthorizer, AuthorizerResetPassword };
