export type AuthProvider = 'google' | 'meta' | 'email';

export type User = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  provider: AuthProvider;
};

export type AuthState = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
};

export type AuthContextValue = AuthState & {
  login: (provider: AuthProvider) => Promise<void>;
  logout: () => void;
};
