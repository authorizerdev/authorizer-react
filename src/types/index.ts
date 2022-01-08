import { AuthToken, User } from '@authorizerdev/authorizer-js';
import { AuthorizerProviderActionType } from '../constants';

export type AuthorizerState = {
  user: User | null;
  token: AuthToken | null;
  loading: boolean;
  config: {
    authorizerURL: string;
    redirectURL: string;
    is_google_login_enabled: boolean;
    is_github_login_enabled: boolean;
    is_facebook_login_enabled: boolean;
    is_email_verification_enabled: boolean;
    is_basic_authentication_enabled: boolean;
    is_magic_link_login_enabled: boolean;
  };
};

export type AuthorizerProviderAction = {
  type: AuthorizerProviderActionType;
  payload: any;
};

export type AuthorizerContextPropsType = {
  config: {
    authorizerURL: string;
    redirectURL: string;
    is_google_login_enabled: boolean;
    is_facebook_login_enabled: boolean;
    is_github_login_enabled: boolean;
    is_email_verification_enabled: boolean;
    is_basic_authentication_enabled: boolean;
    is_magic_link_login_enabled: boolean;
  };
  user: null | User;
  token: null | AuthToken;
  loading: boolean;
  setLoading: (data: boolean) => void;
  setUser: (data: null | User) => void;
  setToken: (data: null | AuthToken) => void;
  setAuthData: (data: AuthorizerState) => void;
  authorizerRef: any;
  onTokenCallback?: (stateData: AuthorizerState) => Promise<void>;
  onLogout: () => Promise<void>;
};
