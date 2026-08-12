import { addIntegration, replayIntegration } from '@sentry/react'

// Session Replay, split out of main.tsx so the rrweb recorder (~100KB+ of the
// old entry chunk) loads as its own chunk after first paint instead of
// blocking it. Loaded via dynamic import from main.tsx right after Sentry.init.
export function installReplay() {
  addIntegration(
    replayIntegration({
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
    })
  )
}
