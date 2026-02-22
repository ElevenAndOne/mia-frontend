import { useEffect, useMemo, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { initializeAnalytics, trackEvent, trackPageView } from '../utils/analytics'

const SCROLL_MILESTONES = [25, 50, 75, 90, 100]
const CLICK_SELECTOR = 'button,[role="button"],a,[data-track-id]'
const TRACKED_INPUT_TYPES = new Set(['checkbox', 'radio', 'range'])

function normalizeIdentifier(value: string | null): string | undefined {
  if (!value) return undefined

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 64)

  return normalized || undefined
}

function getAppStage(pathname: string): string {
  if (pathname === '/') return 'intro'
  if (pathname.startsWith('/invite') || pathname.startsWith('/login')) return 'auth'
  if (pathname.startsWith('/onboarding')) return 'onboarding'
  if (pathname.startsWith('/insights')) return 'insights'
  if (pathname.startsWith('/settings')) return 'settings'
  if (pathname.startsWith('/integrations')) return 'integrations'
  if (pathname.startsWith('/help')) return 'help'
  if (pathname.startsWith('/home') || pathname.startsWith('/dashboard')) return 'active_use'
  return 'other'
}

function getElementId(element: Element): string {
  const htmlElement = element as HTMLElement

  return (
    normalizeIdentifier(htmlElement.getAttribute('data-track-id')) ||
    normalizeIdentifier(htmlElement.getAttribute('aria-label')) ||
    normalizeIdentifier(htmlElement.getAttribute('id')) ||
    normalizeIdentifier(htmlElement.getAttribute('name')) ||
    `${element.tagName.toLowerCase()}_unlabeled`
  )
}

function getAnchorPath(anchor: HTMLAnchorElement): string | undefined {
  const href = anchor.getAttribute('href')
  if (!href || href.startsWith('#')) return undefined

  try {
    const url = new URL(href, window.location.origin)
    return url.pathname
  } catch {
    return undefined
  }
}

export const useAnalytics = () => {
  const location = useLocation()
  const path = `${location.pathname}${location.search}`
  const appStage = useMemo(() => getAppStage(location.pathname), [location.pathname])
  const lastStageRef = useRef<string | null>(null)
  const trackedScrollMilestonesRef = useRef(new Set<number>())

  useEffect(() => {
    initializeAnalytics()
  }, [])

  useEffect(() => {
    trackPageView(path, document.title, appStage)

    if (lastStageRef.current !== appStage) {
      trackEvent('app_progression', {
        from_stage: lastStageRef.current || 'none',
        to_stage: appStage,
        path: location.pathname,
      })
      lastStageRef.current = appStage
    }

    trackedScrollMilestonesRef.current.clear()
  }, [appStage, location.pathname, path])

  useEffect(() => {
    const onScroll = () => {
      const documentElement = document.documentElement
      const maxScrollableHeight = documentElement.scrollHeight - window.innerHeight
      const scrollPercent = maxScrollableHeight <= 0
        ? 100
        : Math.round((window.scrollY / maxScrollableHeight) * 100)

      SCROLL_MILESTONES.forEach((milestone) => {
        if (scrollPercent < milestone || trackedScrollMilestonesRef.current.has(milestone)) return

        trackedScrollMilestonesRef.current.add(milestone)
        trackEvent('scroll_depth', {
          scroll_percent: milestone,
          path: window.location.pathname,
          app_stage: getAppStage(window.location.pathname),
        })
      })
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()

    return () => {
      window.removeEventListener('scroll', onScroll)
    }
  }, [path])

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (!target) return

      const element = target.closest(CLICK_SELECTOR)
      if (!element) return

      const anchorPath = element instanceof HTMLAnchorElement ? getAnchorPath(element) : undefined

      trackEvent('ui_click', {
        path: window.location.pathname,
        app_stage: getAppStage(window.location.pathname),
        element_id: getElementId(element),
        element_type: element.tagName.toLowerCase(),
        destination_path: anchorPath,
      })
    }

    const onChange = (event: Event) => {
      const target = event.target as HTMLElement | null
      if (!target) return

      if (target instanceof HTMLInputElement && TRACKED_INPUT_TYPES.has(target.type)) {
        trackEvent('ui_state_change', {
          path: window.location.pathname,
          app_stage: getAppStage(window.location.pathname),
          control_id: getElementId(target),
          control_type: target.type,
          is_checked: target.checked,
        })
      }

      if (target instanceof HTMLSelectElement) {
        trackEvent('ui_state_change', {
          path: window.location.pathname,
          app_stage: getAppStage(window.location.pathname),
          control_id: getElementId(target),
          control_type: 'select',
          selected_index: target.selectedIndex,
        })
      }
    }

    document.addEventListener('click', onClick, true)
    document.addEventListener('change', onChange, true)

    return () => {
      document.removeEventListener('click', onClick, true)
      document.removeEventListener('change', onChange, true)
    }
  }, [])
}
