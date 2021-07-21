import React, { FC, useState } from 'react';
import { ThemeProvider } from 'styled-components';
import { YAuthLogin } from './components/YAuthLogin';
import { YAuthProvider, useYAuth } from './contexts/YAuthContext';
import { Wrapper, Link, Footer } from './styles';
import { theme } from './styles/theme';
import { Views } from './constants';
import { YAuthSignup } from './components/YAuthSignup';
import { YAuthForgotPassword } from './components/YAuthForgotPassword';
import { YAuthResetPassword } from './components/YAuthResetPassword';

export const YAuth: FC = () => {
  const [view, setView] = useState(Views.Login);

  return (
    <ThemeProvider theme={theme}>
      <Wrapper>
        {view === Views.Login && <YAuthLogin />}

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

        {view === Views.Signup && <YAuthSignup />}

        {view === Views.Signup && (
          <Footer>
            <div>
              Already have an account?{' '}
              <Link onClick={() => setView(Views.Login)}>Log In</Link>
            </div>
          </Footer>
        )}

        {view == Views.ForgotPassword && <YAuthForgotPassword />}
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

export { YAuthProvider, useYAuth, YAuthResetPassword };
