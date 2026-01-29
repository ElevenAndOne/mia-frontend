import { useAuth } from '../features/auth/use-auth';
import { useOnboarding } from '../features/onboarding/use-onboarding';
import { Layout } from '../components/layout';
import { Button } from '../components/button';
import type { AuthProvider } from '../features/auth/types';

export function LandingScreen() {
  const { login: authLogin, isLoading } = useAuth();
  const { login: onboardingLogin } = useOnboarding();

  const handleLogin = async (provider: AuthProvider) => {
    await authLogin(provider);
    onboardingLogin(provider);
  };

  return (
    <Layout>
      <div className="flex flex-1 flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-8 text-center">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-gray-900">Welcome to Mia</h1>
            <p className="text-gray-600">
              Connect your ad accounts to get started
            </p>
          </div>

          <div className="space-y-3">
            <Button
              fullWidth
              variant="outline"
              onClick={() => handleLogin('google')}
              disabled={isLoading}
            >
              <span className="flex items-center justify-center gap-2">
                <GoogleIcon />
                Sign in with Google
              </span>
            </Button>

            <Button
              fullWidth
              variant="outline"
              onClick={() => handleLogin('meta')}
              disabled={isLoading}
            >
              <span className="flex items-center justify-center gap-2">
                <MetaIcon />
                Sign in with Meta
              </span>
            </Button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-gray-50 px-2 text-sm text-gray-500">or</span>
              </div>
            </div>

            <Button
              fullWidth
              variant="secondary"
              onClick={() => handleLogin('email')}
              disabled={isLoading}
            >
              <span className="flex items-center justify-center gap-2">
                <EmailIcon />
                Continue with Email
              </span>
            </Button>
          </div>

          {isLoading && (
            <p className="text-sm text-gray-500">Signing in...</p>
          )}
        </div>
      </div>
    </Layout>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function MetaIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg
      className="h-5 w-5 text-gray-600"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  );
}
