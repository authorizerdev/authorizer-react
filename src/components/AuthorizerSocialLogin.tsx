import React from 'react';
import { Github } from '../icons/github';
import { Google } from '../icons/google';
import { Facebook } from '../icons/facebook';
import { Button, Separator } from '../styles';
import { useAuthorizer } from '../contexts/AuthorizerContext';
import { ButtonAppearance } from '../constants';

export const AuthorizerSocialLogin = () => {
  const { config } = useAuthorizer();
  const hasSocialLogin =
    config.isGoogleLoginEnabled || config.isGithubLoginEnabled;
  return (
    <>
      {config.isGoogleLoginEnabled && (
        <>
          <Button
            appearance={ButtonAppearance.Default}
            onClick={() => {
              window.location.href = `${config.authorizerURL}/oauth_login/google?redirectURL=${config.redirectURL}`;
            }}
          >
            <Google />
            Sign in with Google
          </Button>
          <br />
        </>
      )}
      {config.isGithubLoginEnabled && (
        <>
          <Button
            appearance={ButtonAppearance.Default}
            onClick={() => {
              window.location.href = `${config.authorizerURL}/oauth_login/github?redirectURL=${config.redirectURL}`;
            }}
          >
            <Github />
            Sign in with Github
          </Button>
          <br />
        </>
      )}
      {config.isFacebookLoginEnabled && (
        <>
          <Button
            appearance={ButtonAppearance.Default}
            onClick={() => {
              window.location.href = `${config.authorizerURL}/oauth_login/facebook?redirectURL=${config.redirectURL}`;
            }}
          >
            <Facebook />
            Sign in with Facebook
          </Button>
          <br />
        </>
      )}
      {hasSocialLogin && config.isBasicAuthenticationEnabled && (
        <Separator>OR</Separator>
      )}
    </>
  );
};
