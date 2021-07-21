import React, {
  FC,
  createContext,
  useState,
  useContext,
  useRef,
  useEffect,
} from 'react';
import { createClient, gql } from '@urql/core';

import { UserType, YAuthConfigType, YAuthContextPropsType } from '../types';

const YAuthContext = createContext<YAuthContextPropsType>({
  config: {
    domain: '',
    isGithubLoginEnabled: false,
    isGoogleLoginEnabled: false,
    redirectURL: window.location.origin,
  },
  user: null,
  token: null,
  loading: false,
  setLoading: () => {},
  setToken: () => {},
  setUser: () => {},
  graphQlRef: createClient({ url: 'http://localhost:8080' }),
});

export const YAuthProvider: FC<{ config: YAuthConfigType }> = ({
  config,
  children,
}) => {
  const [user, setUser] = useState<UserType | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
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

  useEffect(() => {
    let isMounted = true;
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
        if (isMounted) {
          setToken(res.data.token.accessToken);
          setUser(res.data.token.user);

          const expiresAt = res.data.token.accessTokenExpiresAt * 1000 - 300000;
          const currentDate = new Date();

          const milisecondDiff =
            new Date(expiresAt).getTime() - currentDate.getTime();

          if (milisecondDiff > 0) {
            if (intervalRef) clearInterval(intervalRef);
            intervalRef = setInterval(() => {
              getToken();
            }, milisecondDiff);
          }
        }
      }
      if (isMounted) {
        setLoading(false);
      }
    };

    getToken();
    return () => {
      isMounted = false;
      if (intervalRef) {
        clearInterval(intervalRef);
      }
    };
  }, []);

  return (
    <YAuthContext.Provider
      value={{
        config,
        user,
        token,
        loading,
        setUser,
        setToken,
        setLoading,
        graphQlRef: graphQlClientRef.current,
      }}
    >
      {children}
    </YAuthContext.Provider>
  );
};

export const useYAuth = () => useContext(YAuthContext);
