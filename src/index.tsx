import React, { FC, useState } from 'react';
import { ThemeProvider } from 'styled-components';
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

export const Authorizer: FC = () => {
  const [view, setView] = useState(Views.Login);

  return (
    <ThemeProvider theme={theme}>
      <Wrapper>
        {view === Views.Login && <AuthorizerLogin setView={setView} />}

        {view === Views.Signup && <AuthorizerSignup setView={setView} />}

        {view == Views.ForgotPassword && (
          <AuthorizerForgotPassword setView={setView} />
        )}
      </Wrapper>
    </ThemeProvider>
  );
};

export { AuthorizerProvider, useAuthorizer, AuthorizerResetPassword };
