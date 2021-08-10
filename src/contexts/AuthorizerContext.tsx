import React, {
  FC,
  createContext,
  useState,
  useContext,
  useRef,
  useEffect,
} from 'react';
import {
  Authorizer,
  User,
  AuthToken,
  ConfigType,
} from '@authorizerdev/authorizer-js';

import { AuthorizerContextPropsType } from '../types';

const getIntervalDiff = (accessTokenExpiresAt: number): number => {
  const expiresAt = accessTokenExpiresAt * 1000 - 300000;

  const currentDate = new Date();

  const milisecondDiff = new Date(expiresAt).getTime() - currentDate.getTime();
  return milisecondDiff;
};

const AuthorizerContext = createContext<AuthorizerContextPropsType>({
  config: {
    authorizerURL: '',
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
  authorizerRef: new Authorizer({
    authorizerURL: `http://localhost:8080`,
    redirectURL: window.location.origin,
  }),
});

export const AuthorizerProvider: FC<{
  config: ConfigType;
}> = ({ config: defaultConfig, children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<AuthToken | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [config, setConfig] = useState({
    ...defaultConfig,
    isGoogleLoginEnabled: false,
    isGithubLoginEnabled: false,
    isBasicAuthenticationEnabled: false,
  });
  let intervalRef: any = null;

  const authorizerRef = useRef(
    new Authorizer({
      authorizerURL: config.authorizerURL,
      redirectURL: window.location.origin,
    })
  );

  const getToken = async () => {
    try {
      const res = await authorizerRef.current.getSession();

      if (res.accessToken && res.user) {
        setToken({
          accessToken: res.accessToken,
          accessTokenExpiresAt: res.accessTokenExpiresAt,
        });
        setUser(res?.user);
        const milisecondDiff = getIntervalDiff(res.accessTokenExpiresAt);
        if (milisecondDiff > 0) {
          if (intervalRef) clearInterval(intervalRef);
          intervalRef = setInterval(() => {
            getToken();
          }, milisecondDiff);
        }
      }
    } catch (err) {}

    const metaRes = await authorizerRef.current.getMetaData();

    setConfig({
      ...config,
      ...metaRes,
    });

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

  const handleTokenChange = (data: null | AuthToken) => {
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
        authorizerRef: authorizerRef.current,
      }}
    >
      {children}
    </AuthorizerContext.Provider>
  );
};

export const useAuthorizer = () => useContext(AuthorizerContext);
