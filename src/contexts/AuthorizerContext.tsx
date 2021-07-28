import React, {
  FC,
  createContext,
  useState,
  useContext,
  useRef,
  useEffect,
} from 'react';
import { createClient, gql } from '@urql/core';

import {
  UserType,
  AuthorizerConfigType,
  AuthorizerContextPropsType,
  TokenType,
} from '../types';

const getIntervalDiff = (accessTokenExpiresAt: number): number => {
  const expiresAt = accessTokenExpiresAt * 1000 - 300000;

  const currentDate = new Date();

  const milisecondDiff = new Date(expiresAt).getTime() - currentDate.getTime();
  return milisecondDiff;
};

const AuthorizerContext = createContext<AuthorizerContextPropsType>({
  config: {
    domain: '',
    redirectURL: window.location.origin,
    isGoogleLoginEnabled: false,
    isGithubLoginEnabled: false,
    isBasicAuthenticationEnabled: false,
  },
  user: null,
  token: null,
  loading: false,
  setLoading: () => {},
  setToken: () => {},
  setUser: () => {},
  graphQlRef: createClient({ url: 'http://localhost:8080' }),
});

export const AuthorizerProvider: FC<{
  config: AuthorizerConfigType;
}> = ({ config: defaultConfig, children }) => {
  const [user, setUser] = useState<UserType | null>(null);
  const [token, setToken] = useState<TokenType | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [config, setConfig] = useState({
    ...defaultConfig,
    isGoogleLoginEnabled: false,
    isGithubLoginEnabled: false,
    isBasicAuthenticationEnabled: false,
  });
  let intervalRef: any = null;

  const graphQlClientRef = useRef(
    createClient({
      url: `${config.domain}/graphql`,
      fetchOptions: () => {
        return {
          credentials: 'include',
        };
      },
    })
  );

  const getToken = async () => {
    const res = await graphQlClientRef.current
      .query(
        gql`
          query {
            token {
              accessToken
              accessTokenExpiresAt
              user {
                id
                email
                firstName
                lastName
                image
              }
            }
          }
        `
      )
      .toPromise();

    if (res.data.token) {
      setToken({
        accessToken: res.data.token.accessToken,
        accessTokenExpiresAt: res.data.token.accessTokenExpiresAt,
      });
      setUser(res.data.token.user);
      const milisecondDiff = getIntervalDiff(
        res.data.token.accessTokenExpiresAt
      );
      if (milisecondDiff > 0) {
        if (intervalRef) clearInterval(intervalRef);
        intervalRef = setInterval(() => {
          getToken();
        }, milisecondDiff);
      }
    } else {
      const metaRes = await graphQlClientRef.current
        .query(
          gql`
            query {
              meta {
                isGoogleLoginEnabled
                isGithubLoginEnabled
                isBasicAuthenticationEnabled
                isEmailVerificationEnabled
              }
            }
          `
        )
        .toPromise();

      setConfig({
        ...config,
        ...metaRes.data.meta,
      });
    }

    setLoading(false);
  };

  useEffect(() => {
    getToken();
    return () => {
      if (intervalRef) {
        clearInterval(intervalRef);
      }
    };
  }, []);

  const handleTokenChange = (data: null | TokenType) => {
    setToken(data);
    if (data?.accessToken) {
      const milisecondDiff = getIntervalDiff(data.accessTokenExpiresAt);
      if (milisecondDiff > 0) {
        if (intervalRef) clearInterval(intervalRef);
        intervalRef = setInterval(() => {
          getToken();
        }, milisecondDiff);
      }
    }
  };

  return (
    <AuthorizerContext.Provider
      value={{
        config,
        user,
        token,
        loading,
        setUser,
        setToken: handleTokenChange,
        setLoading,
        graphQlRef: graphQlClientRef.current,
      }}
    >
      {children}
    </AuthorizerContext.Provider>
  );
};

export const useAuthorizer = () => useContext(AuthorizerContext);
