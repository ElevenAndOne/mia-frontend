export type OAuthProvider = 'google' | 'meta';

export type OAuthPopupConfig = {
  width: number;
  height: number;
  url: string;
};

export type OAuthCallbackData = {
  provider: OAuthProvider;
  code: string;
  state: string;
  error?: string;
};

export type TokenResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
};

export type SessionData = {
  userId: string;
  email: string;
  provider: OAuthProvider;
  expiresAt: number;
  accessToken: string;
};
