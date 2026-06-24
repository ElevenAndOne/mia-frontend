/**
 * Seeded, already-authenticated session state for MOCK_MODE.
 *
 * When this is fed into SessionProvider's initial state (and the init effect is
 * skipped), ProtectedRoute sees isAuthenticated + selectedAccount + activeWorkspace
 * and isLoading=false, so it passes every gate without any real auth. That is the
 * ONLY change needed to make the gated pages render credential-free.
 */
import type { SessionState } from '../contexts/session-context'
import { mockUser, mockAccounts, mockWorkspaces, MOCK_SESSION_ID } from './fixtures'

export const mockSessionState: SessionState = {
  isAuthenticated: true,
  isLoading: false,
  hasSeenIntro: true,
  user: mockUser,
  sessionId: MOCK_SESSION_ID,
  selectedAccount: mockAccounts[0],
  availableAccounts: mockAccounts,
  activeWorkspace: mockWorkspaces[0],
  availableWorkspaces: mockWorkspaces,
  error: null,
  isMetaAuthenticated: true,
  metaUser: { id: 'mock_meta_1', name: 'Demo Designer', email: 'designer@example.com' },
  connectingPlatform: null,
}
