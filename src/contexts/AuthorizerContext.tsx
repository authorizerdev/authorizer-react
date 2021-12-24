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
import { hasWindow } from '../utils/window';

const getIntervalDiff = (accessTokenExpiresAt: number): number => {
  const expiresAt = accessTokenExpiresAt * 1000 - 300000;

  const currentDate = new Date();

  const millisecond = new Date(expiresAt).getTime() - currentDate.getTime();
  return millisecond;
};

const AuthorizerContext = createContext<AuthorizerContextPropsType>({
  config: {
    authorizerURL: '',
    redirectURL: '/',
    is_google_login_enabled: false,
    is_github_login_enabled: false,
    is_facebook_login_enabled: false,
    is_email_verification_enabled: false,
    is_basic_authentication_enabled: false,
    is_magic_link_login_enabled: false,
  },
  user: null,
  token: null,
  loading: false,
  setLoading: () => {},
  setToken: () => {},
  setUser: () => {},
  authorizerRef: new Authorizer({
    authorizerURL: `http://localhost:8080`,
    redirectURL: hasWindow() ? window.location.origin : '/',
  }),
});

export const AuthorizerProvider: FC<{
  config: ConfigType;
  onTokenCallback?: ({
    token,
    user,
  }: {
    token: AuthToken;
    user: User;
  }) => Promise<void>;
}> = ({ config: defaultConfig, onTokenCallback, children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<AuthToken | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [config, setConfig] = useState({
    ...defaultConfig,
    is_google_login_enabled: false,
    is_github_login_enabled: false,
    is_facebook_login_enabled: false,
    is_email_verification_enabled: false,
    is_basic_authentication_enabled: false,
    is_magic_link_login_enabled: false,
  });
  let intervalRef: any = null;

  const authorizerRef = useRef(
    new Authorizer({
      authorizerURL: config.authorizerURL,
      redirectURL: hasWindow() ? window.location.origin : '/',
    })
  );

  const getToken = async () => {
    try {
      const res = await authorizerRef.current.getSession();

      if (res.access_token && res.user) {
        const token = {
          access_token: res.access_token,
          expires_at: res.expires_at,
        };
        setToken(token);
        setUser(res?.user);
        if (onTokenCallback) {
          await onTokenCallback({
            token,
            user: res.user,
          });
        }
        const millisecond = getIntervalDiff(res.expires_at);
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
    if (data?.access_token) {
      const millisecond = getIntervalDiff(data.expires_at);
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
