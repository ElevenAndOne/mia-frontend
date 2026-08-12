// =============================================================================
// SENTRY CONFIGURATION - Error Tracking & Performance Monitoring
// =============================================================================
import * as Sentry from '@sentry/react'

// Determine sample rates based on environment (maximum privacy)
const isDevelopment = import.meta.env.MODE === 'development'
const tracesRate = isDevelopment ? 1.0 : 0.03 // 100% dev, 3% production
const replaysSessionRate = isDevelopment ? 0.5 : 0.02 // 50% dev, 2% production
const replaysErrorRate = isDevelopment ? 1.0 : 1.0 // Always capture errors

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [
    // React-specific integrations
    Sentry.browserTracingIntegration({
      // Don't track certain routes that may contain sensitive data
      shouldCreateSpanForRequest: (url) => {
        // Skip tracking for OAuth callbacks and credential endpoints
        const sensitiveRoutes = ['/oauth/', '/callback', '/credentials']
        return !sensitiveRoutes.some((route) => url.includes(route))
      },
    }),
    // Session Replay is added post-init via a dynamic import (see below) so the
    // rrweb recorder ships as its own chunk instead of inflating the entry.
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
      delete event.user.ip_address
      // Mask email if present
      if (event.user.email) {
        event.user.email = '[REDACTED]'
      }
    }

    // Remove potentially sensitive request data
    if (event.request) {
      delete event.request.cookies

      // Scrub sensitive headers
      const headers = event.request.headers
      if (headers) {
        const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key']
        sensitiveHeaders.forEach((header) => {
          if (headers[header]) {
            headers[header] = '[REDACTED]'
          }
        })
      }
    }

    return event
  },
  // Don't send breadcrumbs for sensitive actions
  beforeBreadcrumb(breadcrumb) {
    // Filter out breadcrumbs that might contain sensitive data
    if (breadcrumb.category === 'console') {
      // Don't send console logs to Sentry
      return null
    }
    if (breadcrumb.category === 'fetch' || breadcrumb.category === 'xhr') {
      // Check if the URL contains sensitive endpoints
      const sensitiveEndpoints = ['/oauth/', '/credentials', '/token']
      if (sensitiveEndpoints.some((endpoint) => breadcrumb.data?.url?.includes(endpoint))) {
        // Redact the URL and data
        breadcrumb.data = { url: '[REDACTED]' }
      }
    }
    return breadcrumb
  },
})

// Attach Session Replay after first paint — its own chunk, same sample rates
// as before (they're set in Sentry.init above, not on the integration).
void import('./sentry-replay').then((m) => m.installReplay()).catch(() => {})
// =============================================================================

import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/query-client'
import App from './App'
import { SessionProvider } from './contexts/session-context'
import { ThemeProvider } from './contexts/theme-context'
import { ToastProvider } from './contexts/toast-context'
import { OnboardingProvider } from './features/onboarding/onboarding-context'
// Direct import (not the ./features/overlay barrel): the barrel re-exports all
// five overlay components, which would drag framer-motion into the entry chunk.
import { OverlayProvider } from './features/overlay/overlay-context'
import './index.css'

// iPhone 16 Pro viewport optimization
const viewport = document.querySelector('meta[name="viewport"]')
if (viewport) {
  viewport.setAttribute(
    'content',
    'width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no'
  )
}

// NOTE: /report-print authenticates via a signed, report-scoped print token in the
// URL (Audit #4 Phase 5) and is not behind ProtectedRoute, so — unlike the old ?sid=
// flow — there is no session to seed into localStorage here.

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element not found')

ReactDOM.createRoot(rootElement).render(
  <Sentry.ErrorBoundary fallback={<div>An error has occurred. Please refresh the page.</div>}>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ToastProvider>
            <SessionProvider>
              <OnboardingProvider>
                <OverlayProvider>
                  <App />
                </OverlayProvider>
              </OnboardingProvider>
            </SessionProvider>
          </ToastProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </Sentry.ErrorBoundary>
)
