import { Client } from '@urql/core';

export type UserType = {
  id: string | number;
  email: string;
  firstName?: string;
  lastName?: string;
  image?: string;
};

export type AuthorizerConfigType = {
  domain: string;
  redirectURL: string;
};

export type TokenType = {
  accessToken: string;
  accessTokenExpiresAt: number;
};

export type AuthorizerContextPropsType = {
  config: {
    domain: string;
    redirectURL: string;
    isGoogleLoginEnabled: boolean;
    isGithubLoginEnabled: boolean;
    isBasicAuthenticationEnabled: boolean;
  };
  user: null | UserType;
  token: null | TokenType;
  loading: boolean;
  setLoading: (data: boolean) => void;
  setUser: (data: null | UserType) => void;
  setToken: (data: null | TokenType) => void;
  graphQlRef: Client;
};
