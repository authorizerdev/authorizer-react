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
  isGoogleLoginEnabled: boolean;
  isGithubLoginEnabled: boolean;
  redirectURL: string;
};

export type AuthorizerContextPropsType = {
  config: AuthorizerConfigType;
  user: null | UserType;
  token: null | string;
  loading: boolean;
  setLoading: (data: boolean) => void;
  setUser: (data: null | UserType) => void;
  setToken: (data: null | string) => void;
  graphQlRef: Client;
};
