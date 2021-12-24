import { AuthToken, User } from '@authorizerdev/authorizer-js';

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
  authorizerRef: any;
};
