import { createContext } from 'react';
import type { AuthContextValue } from './types';

const initialState: AuthContextValue = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  login: async () => {},
  logout: () => {},
};

export const AuthContext = createContext<AuthContextValue>(initialState);
