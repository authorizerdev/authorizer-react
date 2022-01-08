import React, { FC, useState } from 'react';
import { ThemeProvider } from 'styled-components';
import { AuthToken } from '@authorizerdev/authorizer-js';

import { AuthorizerLogin } from './components/AuthorizerLogin';
import {
  AuthorizerProvider,
  useAuthorizer,
} from './contexts/AuthorizerContext';
import { Wrapper } from './styles';
import { theme } from './styles/theme';
import { Views } from './constants';
import { AuthorizerSignup } from './components/AuthorizerSignup';
import { AuthorizerForgotPassword } from './components/AuthorizerForgotPassword';
import { AuthorizerResetPassword } from './components/AuthorizerResetPassword';

export const Authorizer: FC<{
  onLogin?: (data: AuthToken) => void;
  onSignup?: (data: AuthToken) => void;
  onMagicLinkLogin?: (data: any) => void;
  onForgotPassword?: (data: any) => void;
}> = ({ onLogin, onSignup, onMagicLinkLogin, onForgotPassword }) => {
  const [view, setView] = useState(Views.Login);

  return (
    <ThemeProvider theme={theme}>
      <Wrapper>
        {view === Views.Login && (
          <AuthorizerLogin
            setView={setView}
            onLogin={onLogin}
            onMagicLinkLogin={onMagicLinkLogin}
          />
        )}
        {view === Views.Signup && (
          <AuthorizerSignup setView={setView} onSignup={onSignup} />
        )}
        {view === Views.ForgotPassword && (
          <AuthorizerForgotPassword
            setView={setView}
            onForgotPassword={onForgotPassword}
          />
        )}
      </Wrapper>
    </ThemeProvider>
  );
};

export { AuthorizerProvider, useAuthorizer, AuthorizerResetPassword };
