import type { User } from '../features/auth/types';

export const mockUsers: Record<string, User> = {
  google: {
    id: 'user-google-1',
    email: 'demo@gmail.com',
    name: 'Demo User',
    avatarUrl: null,
    provider: 'google',
  },
  meta: {
    id: 'user-meta-1',
    email: 'demo@facebook.com',
    name: 'Meta Demo User',
    avatarUrl: null,
    provider: 'meta',
  },
  email: {
    id: 'user-email-1',
    email: 'demo@example.com',
    name: 'Email User',
    avatarUrl: null,
    provider: 'email',
  },
};
