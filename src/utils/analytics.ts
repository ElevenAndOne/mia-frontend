type AnalyticsPrimitive = string | number | boolean
type AnalyticsParams = Record<string, AnalyticsPrimitive | null | undefined>

interface AnalyticsWindow extends Window {
  dataLayer?: unknown[]
  gtag?: (...args: unknown[]) => void
  hj?: (...args: unknown[]) => void
  __miaAnalyticsInitialized?: boolean
}

const DEFAULT_GA_MEASUREMENT_ID = 'G-CDBT4367F0'
const DEFAULT_HOTJAR_SCRIPT_URL = 'https://t.contentsquare.net/uxa/6a0644bd3b864.js'
const MAX_EVENT_NAME_LENGTH = 40
const MAX_PARAM_KEY_LENGTH = 40
const MAX_STRING_VALUE_LENGTH = 100

const GA_MEASUREMENT_ID = (import.meta.env.VITE_GA_MEASUREMENT_ID || DEFAULT_GA_MEASUREMENT_ID).trim()
const HOTJAR_SCRIPT_URL = (
  import.meta.env.VITE_HOTJAR_SCRIPT_URL ||
  import.meta.env.VITE_CONTENTSQUARE_SCRIPT_URL ||
  DEFAULT_HOTJAR_SCRIPT_URL
).trim()
const ANALYTICS_ENABLED = import.meta.env.VITE_ENABLE_ANALYTICS === 'true' || import.meta.env.PROD

function normalizeToken(value: string, maxLength: number): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, maxLength)
}

function normalizeEventName(name: string): string {
  const normalized = normalizeToken(name, MAX_EVENT_NAME_LENGTH)
  return normalized || 'event'
}

function normalizeParams(params: AnalyticsParams): Record<string, AnalyticsPrimitive> {
  const normalized: Record<string, AnalyticsPrimitive> = {}

  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined) return

    const normalizedKey = normalizeToken(key, MAX_PARAM_KEY_LENGTH)
    if (!normalizedKey) return

    if (typeof value === 'string') {
      normalized[normalizedKey] = value.trim().slice(0, MAX_STRING_VALUE_LENGTH)
      return
    }

    normalized[normalizedKey] = value
  })

  return normalized
}

function injectScript(scriptId: string, src: string): void {
  if (!src || document.getElementById(scriptId)) return

  const script = document.createElement('script')
  script.id = scriptId
  script.async = true
  script.src = src
  document.head.appendChild(script)
}

function initializeGoogleAnalytics(analyticsWindow: AnalyticsWindow): void {
  if (!GA_MEASUREMENT_ID) return

  analyticsWindow.dataLayer = analyticsWindow.dataLayer || []
  analyticsWindow.gtag = analyticsWindow.gtag || function gtag(...args: unknown[]) {
    analyticsWindow.dataLayer?.push(args)
  }

  analyticsWindow.gtag('js', new Date())
  analyticsWindow.gtag('config', GA_MEASUREMENT_ID, {
    send_page_view: false,
    anonymize_ip: true,
  })

  const gaScriptUrl = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_MEASUREMENT_ID)}`
  injectScript('mia-ga-script', gaScriptUrl)
}

function initializeHotjarScript(): void {
  if (!HOTJAR_SCRIPT_URL) return
  injectScript('mia-hotjar-script', HOTJAR_SCRIPT_URL)
}

function getAnalyticsWindow(): AnalyticsWindow | null {
  if (typeof window === 'undefined') return null
  return window as AnalyticsWindow
}

export function initializeAnalytics(): void {
  if (!ANALYTICS_ENABLED) return

  const analyticsWindow = getAnalyticsWindow()
  if (!analyticsWindow || analyticsWindow.__miaAnalyticsInitialized) return

  analyticsWindow.__miaAnalyticsInitialized = true
  initializeGoogleAnalytics(analyticsWindow)
  initializeHotjarScript()
}

export function trackEvent(eventName: string, params: AnalyticsParams = {}): void {
  if (!ANALYTICS_ENABLED) return

  const analyticsWindow = getAnalyticsWindow()
  if (!analyticsWindow) return

  const normalizedEventName = normalizeEventName(eventName)
  const normalizedParams = normalizeParams(params)

  if (analyticsWindow.gtag) {
    analyticsWindow.gtag('event', normalizedEventName, normalizedParams)
  }

  if (typeof analyticsWindow.hj === 'function') {
    analyticsWindow.hj('event', normalizedEventName)
  }
}

export function trackPageView(path: string, title: string, stage: string): void {
  if (!ANALYTICS_ENABLED) return

  trackEvent('page_view', {
    page_path: path,
    page_title: title,
    app_stage: stage,
  })

  const analyticsWindow = getAnalyticsWindow()
  if (typeof analyticsWindow?.hj === 'function') {
    analyticsWindow.hj('stateChange', path)
  }
}
