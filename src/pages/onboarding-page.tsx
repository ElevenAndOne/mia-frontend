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
  const { sessionId, activeWorkspace } = useSession()
  const [experience, setExperience] = useState<string | null>(null)
  const sessionExperience = activeWorkspace?.experience

  useEffect(() => {
    let active = true
    if (!sessionId) return
    // effective_experience, not the stored column: the column needs a default, and that
    // default must not decide which onboarding a new sign-up sees. A failed read is retried,
    // then falls back to the experience the session already resolved for this workspace,
    // and never to 'team', which dropped a Basic owner into the ads onboarding (30 Sep 2026).
    const load = async () => {
      for (let attempt = 0; attempt < 3; attempt++) {
        const r = await fetchReadiness(sessionId)
        const got = r?.effective_experience ?? r?.experience
        if (got) {
          if (active) setExperience(got)
          return
        }
        await new Promise((res) => setTimeout(res, 800 * (attempt + 1)))
        if (!active) return
      }
      if (active) setExperience(sessionExperience ?? 'basic')
    }
    void load()
    return () => {
      active = false
    }
  }, [sessionId, sessionExperience])

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
