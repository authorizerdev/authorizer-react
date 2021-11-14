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

  const millisecond = new Date(expiresAt).getTime() - currentDate.getTime();
  return millisecond;
};

const AuthorizerContext = createContext<AuthorizerContextPropsType>({
  config: {
    authorizerURL: '',
    redirectURL: window.location.origin,
    isGoogleLoginEnabled: false,
    isGithubLoginEnabled: false,
    isFacebookLoginEnabled: false,
    isBasicAuthenticationEnabled: false,
    isMagicLoginEnabled: false,
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
    isFacebookLoginEnabled: false,
    isBasicAuthenticationEnabled: false,
    isMagicLoginEnabled: false,
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
        const millisecond = getIntervalDiff(res.accessTokenExpiresAt);
        if (millisecond > 0) {
          if (intervalRef) clearInterval(intervalRef);
          intervalRef = setInterval(() => {
            getToken();
          }, millisecond);
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
      const millisecond = getIntervalDiff(data.accessTokenExpiresAt);
      if (millisecond > 0) {
        if (intervalRef) clearInterval(intervalRef);
        intervalRef = setInterval(() => {
          getToken();
        }, millisecond);
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
