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

type ComponentMap = {
  [key: string]: React.FC<any>;
};

const componentMap: ComponentMap = {
  [Views.Login]: AuthorizerLogin,
  [Views.Signup]: AuthorizerSignup,
  [Views.ForgotPassword]: AuthorizerForgotPassword,
};

export const Authorizer: FC = () => {
  const [view, setView] = useState(Views.Login);

  const AuthorizerComponent = componentMap[view];

  return (
    <ThemeProvider theme={theme}>
      <Wrapper>
        <AuthorizerComponent setView={setView} />
      </Wrapper>
    </ThemeProvider>
  );
};

export { AuthorizerProvider, useAuthorizer, AuthorizerResetPassword };
