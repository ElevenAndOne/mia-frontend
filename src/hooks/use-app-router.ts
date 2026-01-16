import { useState, useEffect } from 'react'

export type AppState =
  | 'video-intro'
  | 'account-selection'
  | 'meta-account-selection'
  | 'onboarding-chat'
  | 'main'
  | 'integrations'
  | 'grow-quick'
  | 'optimize-quick'
  | 'protect-quick'
  | 'summary-quick'
  | 'invite'
  | 'workspace-settings'

export const useAppRouter = () => {
  // Persist appState to localStorage so page refresh keeps you on the same page
  const [appState, setAppState] = useState<AppState>(() => {
    const saved = localStorage.getItem('mia_app_state')
    // Only restore valid states (not video-intro or account-selection which need fresh auth check)
    if (saved && [
      'main',
      'integrations',
      'onboarding-chat',
      'grow-quick',
      'optimize-quick',
      'protect-quick',
      'summary-quick',
      'workspace-settings'
    ].includes(saved)) {
      return saved as AppState
    }
    return 'video-intro'
  })

  // Invite page state (for /invite/{invite_id} URLs)
  const [inviteId, setInviteId] = useState<string | null>(null)

  // Save appState to localStorage when it changes
  useEffect(() => {
    console.log('[APP] appState changed to:', appState)
    localStorage.setItem('mia_app_state', appState)
  }, [appState])

  // Detect invite URL on mount (/invite/{invite_id})
  useEffect(() => {
    const path = window.location.pathname
    const inviteMatch = path.match(/^\/invite\/([a-zA-Z0-9_-]+)$/)
    if (inviteMatch) {
      const id = inviteMatch[1]
      console.log('[APP] Detected invite URL, invite_id:', id)
      setInviteId(id)
      setAppState('invite')
    }
  }, [])

  return {
    appState,
    setAppState,
    inviteId,
    setInviteId
  }
}
