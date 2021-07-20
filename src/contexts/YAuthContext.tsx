import React, { FC, createContext, useState, useContext, useRef } from 'react';
import { createClient } from '@urql/core';

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
  const [loading, setLoading] = useState<boolean>(false);

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
