// =============================================================================
// SENTRY CONFIGURATION - Error Tracking & Performance Monitoring
// =============================================================================
import * as Sentry from "@sentry/react";

// Determine sample rates based on environment (maximum privacy)
const isDevelopment = import.meta.env.MODE === 'development';
const tracesRate = isDevelopment ? 1.0 : 0.03; // 100% dev, 3% production
const replaysSessionRate = isDevelopment ? 0.5 : 0.02; // 50% dev, 2% production
const replaysErrorRate = isDevelopment ? 1.0 : 1.0; // Always capture errors

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [
    // React-specific integrations
    Sentry.browserTracingIntegration({
      // Don't track certain routes that may contain sensitive data
      shouldCreateSpanForRequest: (url) => {
        // Skip tracking for OAuth callbacks and credential endpoints
        const sensitiveRoutes = ['/oauth/', '/callback', '/credentials'];
        return !sensitiveRoutes.some(route => url.includes(route));
      },
    }),
    Sentry.replayIntegration({
      // Maximum privacy protection
      maskAllText: true, // Mask ALL text content
      maskAllInputs: true, // Mask all input fields
      blockAllMedia: true, // Block all images/videos
      // Additional privacy: Block specific elements
      block: [
        '.sentry-block', // Elements with this class
        '[data-sensitive]', // Elements with this attribute
        '.user-email',
        '.account-name',
        '.workspace-name',
      ],
      // Don't record network requests/responses (may contain API data)
      networkDetailAllowUrls: [],
      // Mask specific network request/response headers
      networkCaptureBodies: false,
      networkRequestHeaders: [],
      networkResponseHeaders: [],
    }),
  ],
  // Performance Monitoring - Lower rates for privacy and cost
  tracesSampleRate: tracesRate,
  // Session Replay - Minimal recording to protect user privacy
  replaysSessionSampleRate: replaysSessionRate, // Very low rate for normal sessions
  replaysOnErrorSampleRate: replaysErrorRate, // Still capture errors
  // Environment detection
  environment: import.meta.env.MODE,
  // Privacy settings
  beforeSend(event) {
    // Additional client-side scrubbing
    // Remove user IP address
    if (event.user) {
      delete event.user.ip_address;
      // Mask email if present
      if (event.user.email) {
        event.user.email = '[REDACTED]';
      }
    }

    // Remove potentially sensitive request data
    if (event.request) {
      delete event.request.cookies;

      // Scrub sensitive headers
      const headers = event.request.headers;
      if (headers) {
        const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
        sensitiveHeaders.forEach(header => {
          if (headers[header]) {
            headers[header] = '[REDACTED]';
          }
        });
      }
    }

    return event;
  },
  // Don't send breadcrumbs for sensitive actions
  beforeBreadcrumb(breadcrumb) {
    // Filter out breadcrumbs that might contain sensitive data
    if (breadcrumb.category === 'console') {
      // Don't send console logs to Sentry
      return null;
    }
    if (breadcrumb.category === 'fetch' || breadcrumb.category === 'xhr') {
      // Check if the URL contains sensitive endpoints
      const sensitiveEndpoints = ['/oauth/', '/credentials', '/token'];
      if (sensitiveEndpoints.some(endpoint => breadcrumb.data?.url?.includes(endpoint))) {
        // Redact the URL and data
        breadcrumb.data = { url: '[REDACTED]' };
      }
    }
    return breadcrumb;
  },
});
// =============================================================================

import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './app'
import { SessionProvider } from './contexts/session-context'
import { OnboardingProvider } from './features/onboarding/onboarding-context'
import './index.css'

// iPhone 16 Pro viewport optimization
const viewport = document.querySelector('meta[name="viewport"]')
if (viewport) {
  viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no')
}

// Create React Query client with smart defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is fresh for 5 minutes - won't refetch if already cached
      staleTime: 5 * 60 * 1000,
      // Keep unused data in cache for 10 minutes
      gcTime: 10 * 60 * 1000,
      // Don't refetch on window focus (annoying for users)
      refetchOnWindowFocus: false,
      // Retry failed requests once
      retry: 1,
      // Don't refetch when component remounts if data exists
      refetchOnMount: false,
    },
  },
})

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element not found')

ReactDOM.createRoot(rootElement).render(
  <Sentry.ErrorBoundary fallback={<div>An error has occurred. Please refresh the page.</div>}>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <OnboardingProvider>
            <App />
          </OnboardingProvider>
        </SessionProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </Sentry.ErrorBoundary>,
)