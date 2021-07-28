import React from 'react';
import { Github } from '../icons/github';
import { Google } from '../icons/google';
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
              window.location.href = `${config.domain}/login/google`;
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
              window.location.href = `${config.domain}/login/github`;
            }}
          >
            <Github />
            Sign in with Github
          </Button>
          <br />
        </>
      )}
      {hasSocialLogin && <Separator>OR</Separator>}
    </>
  );
};
