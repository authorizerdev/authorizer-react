import { Client } from '@urql/core';

export type UserType = {
  id: string | number;
  email: string;
  firstName?: string;
  lastName?: string;
  image?: string;
};

export type YAuthConfigType = {
  domain: string;
  isGoogleLoginEnabled: boolean;
  isGithubLoginEnabled: boolean;
  redirectURL: string;
};

export type YAuthContextPropsType = {
  config: YAuthConfigType;
  user: null | UserType;
  token: null | string;
  loading: boolean;
  setLoading: (data: boolean) => void;
  setUser: (data: null | UserType) => void;
  setToken: (data: null | string) => void;
  graphQlRef: Client;
};
