import { useEffect, useRef } from 'react'
import type { ChatMessageInput } from '../onboarding-chat-types'

interface UseOnboardingSessionErrorArgs {
  sessionError: string | null
  hasSelectedAccount: boolean
  queueMessages: (messages: ChatMessageInput[]) => void
}

export const useOnboardingSessionError = ({
  sessionError,
  hasSelectedAccount,
  queueMessages
}: UseOnboardingSessionErrorArgs) => {
  const queuedSessionErrorRef = useRef<string | null>(null)

  useEffect(() => {
    if (!sessionError || queuedSessionErrorRef.current === sessionError) {
      return
    }

    queuedSessionErrorRef.current = sessionError
    const isMetaError = sessionError.toLowerCase().includes('meta')
    const retryAction = hasSelectedAccount
      ? (isMetaError ? 'connect_meta' : 'connect_google')
      : (isMetaError ? 'connect_primary_meta' : 'connect_primary_google')

    queueMessages([
      { type: 'mia', content: 'I can see that login did not complete successfully.' },
      {
        type: 'choice-buttons',
        choices: [
          { label: 'Try again', action: retryAction, variant: 'primary' },
          { label: 'Skip for now', action: 'skip', variant: 'secondary' }
        ]
      }
    ])
  }, [hasSelectedAccount, queueMessages, sessionError])
}
