import { useState, useCallback, type ReactNode } from 'react';
import type { AuthProvider as AuthProviderType, User } from './types';
import { authService } from './auth-service';
import { AuthContext } from './auth-context-value';

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const login = useCallback(async (provider: AuthProviderType) => {
    setIsLoading(true);
    try {
      const loggedInUser = await authService.login(provider);
      setUser(loggedInUser);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  const value = {
    user,
    isAuthenticated: user !== null,
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
