import { AuthProvider } from './features/auth/auth-context';
import { OnboardingProvider } from './features/onboarding/onboarding-context';
import { useOnboarding } from './features/onboarding/use-onboarding';

// Screens
import { LandingScreen } from './screens/landing-screen';
import { GoogleAccountsScreen } from './screens/google/google-accounts-screen';
import { GoogleCampaignsScreen } from './screens/google/google-campaigns-screen';
import { MetaAccountsScreen } from './screens/meta/meta-accounts-screen';
import { MetaCampaignsScreen } from './screens/meta/meta-campaigns-screen';
import { ChatScreen } from './screens/chat-screen';

function Router() {
  const { currentStep } = useOnboarding();

  const screens = {
    landing: <LandingScreen />,
    'google-accounts': <GoogleAccountsScreen />,
    'google-campaigns': <GoogleCampaignsScreen />,
    'meta-accounts': <MetaAccountsScreen />,
    'meta-campaigns': <MetaCampaignsScreen />,
    chat: <ChatScreen />,
  };

  return screens[currentStep] ?? <LandingScreen />;
}

export function App() {
  return (
    <AuthProvider>
      <OnboardingProvider>
        <Router />
      </OnboardingProvider>
    </AuthProvider>
  );
}
