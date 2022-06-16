import React from 'react';
import { Github } from '../icons/github';
import { Google } from '../icons/google';
import { Facebook } from '../icons/facebook';
import { Button, Separator } from '../styles';
import { useAuthorizer } from '../contexts/AuthorizerContext';
import { ButtonAppearance } from '../constants';
import { createQueryParams } from '../utils/common';
import { LinkedIn } from '../icons/linkedin';
import { Apple } from '../icons/apple';

export const AuthorizerSocialLogin: React.FC<{
  urlProps: Record<string, any>;
}> = ({ urlProps }) => {
  const { config } = useAuthorizer();
  const hasSocialLogin =
    config.is_google_login_enabled ||
    config.is_github_login_enabled ||
    config.is_facebook_login_enabled ||
    config.is_linkedin_login_enabled ||
    config.is_apple_login_enabled;

  const queryParams = createQueryParams({
    ...urlProps,
    scope: urlProps.scope.join(' '),
  });

  return (
    <>
      {config.is_apple_login_enabled && (
        <div id="appleid-signin">
          <Button
            appearance={ButtonAppearance.Default}
            onClick={() => {
              window.location.href = `${config.authorizerURL}/oauth_login/apple?${queryParams}`;
            }}
          >
            <Apple />
            Sign in with Apple
          </Button>
          <br />
        </div>
      )}
      {config.is_google_login_enabled && (
        <>
          <Button
            appearance={ButtonAppearance.Default}
            onClick={() => {
              window.location.href = `${config.authorizerURL}/oauth_login/google?${queryParams}`;
            }}
          >
            <Google />
            Sign in with Google
          </Button>
          <br />
        </>
      )}
      {config.is_github_login_enabled && (
        <>
          <Button
            appearance={ButtonAppearance.Default}
            onClick={() => {
              window.location.href = `${config.authorizerURL}/oauth_login/github?${queryParams}`;
            }}
          >
            <Github />
            Sign in with Github
          </Button>
          <br />
        </>
      )}
      {config.is_facebook_login_enabled && (
        <>
          <Button
            appearance={ButtonAppearance.Default}
            onClick={() => {
              window.location.href = `${config.authorizerURL}/oauth_login/facebook?${queryParams}`;
            }}
          >
            <Facebook />
            Sign in with Facebook
          </Button>
          <br />
        </>
      )}
      {config.is_linkedin_login_enabled && (
        <>
          <Button
            appearance={ButtonAppearance.Default}
            onClick={() => {
              window.location.href = `${config.authorizerURL}/oauth_login/linkedin?${queryParams}`;
            }}
          >
            <LinkedIn />
            Sign in with LinkedIn
          </Button>
          <br />
        </>
      )}
      {hasSocialLogin &&
        (config.is_basic_authentication_enabled ||
          config.is_magic_link_login_enabled) && <Separator>OR</Separator>}
    </>
  );
};
