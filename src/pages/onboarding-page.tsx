import OnboardingChat from '../features/onboarding/views/onboarding-chat'

interface OnboardingPageProps {
  onComplete: () => void
  onConnectPlatform: (platformId: string) => void
}

const OnboardingPage = ({ onComplete, onConnectPlatform }: OnboardingPageProps) => {
  return <OnboardingChat onComplete={onComplete} onConnectPlatform={onConnectPlatform} />
}

export default OnboardingPage
