import { AuthToken, User } from '@authorizerdev/authorizer-js';

export type AuthorizerContextPropsType = {
  config: {
    authorizerURL: string;
    redirectURL?: string;
    isGoogleLoginEnabled: boolean;
    isGithubLoginEnabled: boolean;
    isBasicAuthenticationEnabled: boolean;
  };
  user: null | User;
  token: null | AuthToken;
  loading: boolean;
  setLoading: (data: boolean) => void;
  setUser: (data: null | User) => void;
  setToken: (data: null | AuthToken) => void;
  authorizerRef: any;
};
