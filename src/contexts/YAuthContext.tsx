import React, { FC, createContext, useState, useContext } from 'react';
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
});

export const YAuthProvider: FC<{ config: YAuthConfigType }> = ({
  config,
  children,
}) => {
  const [user, setUser] = useState<UserType | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  return (
    <YAuthContext.Provider
      value={{ config, user, token, loading, setUser, setToken, setLoading }}
    >
      {children}
    </YAuthContext.Provider>
  );
};

export const useYAuthContext = useContext(YAuthContext);
