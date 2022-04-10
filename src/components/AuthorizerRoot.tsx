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
import { createRandomString } from '../utils/common';
import { hasWindow } from '../utils/window';

export const AuthorizerRoot: FC<{
  onLogin?: (data: AuthToken) => void;
  onSignup?: (data: AuthToken) => void;
  onMagicLinkLogin?: (data: any) => void;
  onForgotPassword?: (data: any) => void;
}> = ({ onLogin, onSignup, onMagicLinkLogin, onForgotPassword }) => {
  const [view, setView] = useState(Views.Login);
  const { config } = useAuthorizer();
  const searchParams = new URLSearchParams(
    hasWindow() ? window.location.search : ``
  );
  const state = searchParams.get('state') || createRandomString();
  const scope = searchParams.get('scope')
    ? searchParams.get('scope')?.toString().split(' ')
    : ['openid', 'profile', 'email'];

  const urlProps: Record<string, any> = {
    state,
    scope,
  };

  const redirectURL =
    searchParams.get('redirect_uri') || searchParams.get('redirectURL');
  if (redirectURL) {
    urlProps.redirectURL = redirectURL;
  } else {
    urlProps.redirectURL = hasWindow() ? window.location.origin : redirectURL;
  }

  urlProps.redirect_uri = urlProps.redirectURL;

  return (
    <ThemeProvider theme={theme}>
      <Wrapper>
        <AuthorizerSocialLogin urlProps={urlProps} />
        {view === Views.Login &&
          config.is_basic_authentication_enabled &&
          !config.is_magic_link_login_enabled && (
            <AuthorizerBasicAuthLogin
              setView={setView}
              onLogin={onLogin}
              urlProps={urlProps}
            />
          )}

        {view === Views.Signup &&
          config.is_basic_authentication_enabled &&
          !config.is_magic_link_login_enabled &&
          config.is_sign_up_enabled && (
            <AuthorizerSignup
              setView={setView}
              onSignup={onSignup}
              urlProps={urlProps}
            />
          )}

        {view === Views.Login && config.is_magic_link_login_enabled && (
          <AuthorizerMagicLinkLogin
            onMagicLinkLogin={onMagicLinkLogin}
            urlProps={urlProps}
          />
        )}

        {view === Views.ForgotPassword && (
          <AuthorizerForgotPassword
            setView={setView}
            onForgotPassword={onForgotPassword}
            urlProps={urlProps}
          />
        )}
      </Wrapper>
    </ThemeProvider>
  );
};
