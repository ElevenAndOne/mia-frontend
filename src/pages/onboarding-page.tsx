import { lazy, Suspense, useEffect, useState } from 'react'
import OnboardingChat from '../features/onboarding/views/onboarding-chat'
import { useSession } from '../contexts/session-context'
import { fetchReadiness } from '../features/onboarding/services/basic-onboarding-service'

const BasicOnboarding = lazy(() => import('../features/onboarding/views/basic-onboarding'))

interface OnboardingPageProps {
  onComplete: () => void
  onConnectPlatform: (platformId: string) => void
}

/**
 * Which onboarding someone gets.
 *
 * Until now there was only one, and it connects ad accounts and explains a spend insight —
 * the wrong conversation with the owner of a business that has a Page and no budget. The
 * experience comes from the workspace, not from what they clicked, so it is read once here
 * and the right view is mounted; neither view has to know the other exists.
 *
 * While we do not know yet, nothing is rendered. Flashing the wrong onboarding for a moment
 * and then swapping it is worse than a beat of nothing.
 */
const OnboardingPage = ({ onComplete, onConnectPlatform }: OnboardingPageProps) => {
  const { sessionId } = useSession()
  const [experience, setExperience] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    if (!sessionId) return
    fetchReadiness(sessionId).then((r) => {
      // effective_experience, not the stored column: every new workspace is created as
      // "team" because the column needs a default, and that default would hand the ads
      // onboarding to someone who signed up with nothing but a Facebook Page.
      if (active) setExperience(r?.effective_experience ?? r?.experience ?? 'team')
    })
    return () => {
      active = false
    }
  }, [sessionId])

  if (!experience) return null

  if (experience === 'basic') {
    return (
      <Suspense fallback={null}>
        <BasicOnboarding onComplete={onComplete} onConnectPlatform={onConnectPlatform} />
      </Suspense>
    )
  }
  return <OnboardingChat onComplete={onComplete} onConnectPlatform={onConnectPlatform} />
}

export default OnboardingPage
