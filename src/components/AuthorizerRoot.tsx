import React, { FC, useState } from 'react';
import { ThemeProvider } from 'styled-components';
import { AuthToken } from '@authorizerdev/authorizer-js';

import { AuthorizerBasicAuthLogin } from './AuthorizerBasicAuthLogin';
import { useAuthorizer } from '../contexts/AuthorizerContext';
import { Wrapper } from '../styles';
import { theme } from '../styles/theme';
import { Views } from '../constants';
import { AuthorizerSignup } from './AuthorizerSignup';
import { AuthorizerForgotPassword } from './AuthorizerForgotPassword';
import { AuthorizerSocialLogin } from './AuthorizerSocialLogin';
import { AuthorizerMagicLinkLogin } from './AuthorizerMagicLinkLogin';

export const AuthorizerRoot: FC<{
  onLogin?: (data: AuthToken) => void;
  onSignup?: (data: AuthToken) => void;
  onMagicLinkLogin?: (data: any) => void;
  onForgotPassword?: (data: any) => void;
}> = ({ onLogin, onSignup, onMagicLinkLogin, onForgotPassword }) => {
  const [view, setView] = useState(Views.Login);
  const { config } = useAuthorizer();

  return (
    <ThemeProvider theme={theme}>
      <Wrapper>
        <AuthorizerSocialLogin />
        {view === Views.Login &&
          config.is_basic_authentication_enabled &&
          !config.is_magic_link_login_enabled && (
            <AuthorizerBasicAuthLogin setView={setView} onLogin={onLogin} />
          )}

        {view === Views.Signup &&
          config.is_basic_authentication_enabled &&
          !config.is_magic_link_login_enabled && (
            <AuthorizerSignup setView={setView} onSignup={onSignup} />
          )}

        {view === Views.Login && config.is_magic_link_login_enabled && (
          <AuthorizerMagicLinkLogin onMagicLinkLogin={onMagicLinkLogin} />
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
