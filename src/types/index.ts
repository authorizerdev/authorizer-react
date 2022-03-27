import { AuthToken, User } from '@authorizerdev/authorizer-js';
import { AuthorizerProviderActionType } from '../constants';

export type AuthorizerState = {
  user: User | null;
  token: AuthToken | null;
  loading: boolean;
  config: {
    authorizerURL: string;
    redirectURL: string;
    client_id: string;
    is_google_login_enabled: boolean;
    is_github_login_enabled: boolean;
    is_facebook_login_enabled: boolean;
    is_email_verification_enabled: boolean;
    is_basic_authentication_enabled: boolean;
    is_magic_link_login_enabled: boolean;
    is_sign_up_enabled: boolean;
  };
  theme: ThemePropsType | null;
};

export type AuthorizerProviderAction = {
  type: AuthorizerProviderActionType;
  payload: any;
};

export type AuthorizerContextPropsType = {
  config: {
    authorizerURL: string;
    redirectURL: string;
    client_id: string;
    is_google_login_enabled: boolean;
    is_facebook_login_enabled: boolean;
    is_github_login_enabled: boolean;
    is_email_verification_enabled: boolean;
    is_basic_authentication_enabled: boolean;
    is_magic_link_login_enabled: boolean;
    is_sign_up_enabled: boolean;
  };
  user: null | User;
  token: null | AuthToken;
  loading: boolean;
  logout: () => Promise<void>;
  setLoading: (data: boolean) => void;
  setUser: (data: null | User) => void;
  setToken: (data: null | AuthToken) => void;
  setAuthData: (data: AuthorizerState) => void;
  authorizerRef: any;
  theme: ThemePropsType | null;
};

export type ThemePropsType = {
  colors: {
    primary: string;
    primaryDisabled: string;
    gray: string;
    danger: string;
    success: string;
    textColor: string;
  };
  fonts: {
    fontStack: string;
    largeText: string;
    mediumText: string;
    smallText: string;
    tinyText: string;
  };
  radius: {
    card: string;
    button: string;
    input: string;
  };
  background: {
    color: string;
  };
};
