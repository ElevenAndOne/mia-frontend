import { Suspense, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { AppShell } from './app-shell'
import { Spinner } from './spinner'

/**
 * Layout route: mounts the sidebar + command palette ONCE and keeps them on
 * screen across navigation. Only the content pane suspends while a lazy child
 * route's chunk loads — previously the route-level Suspense in routes/index.tsx
 * blanked the entire viewport (sidebar included) on every page switch.
 */
// The pages one click away from the sidebar. Fetching their chunks while the user reads
// the first screen means Settings/Posts/Reports open instantly instead of showing a spinner.
const PREFETCH_PAGES: Array<() => Promise<unknown>> = [
  () => import('../pages/workspace-settings-page'),
  () => import('../pages/posts-page'),
  () => import('../pages/reports-page'),
  () => import('../pages/chat-page'),
  () => import('../pages/help-page'),
]

function usePrefetchPages() {
  useEffect(() => {
    let cancelled = false
    const run = () => {
      if (cancelled) return
      PREFETCH_PAGES.forEach((load) => {
        load().catch(() => {
          /* offline or chunk missing — the real navigation will report it */
        })
      })
    }
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => number })
      .requestIdleCallback
    const handle = idle ? idle(run) : window.setTimeout(run, 1200)
    return () => {
      cancelled = true
      if (!idle) window.clearTimeout(handle)
    }
  }, [])
}

const AppShellLayout = () => {
  usePrefetchPages()
  return (
    <AppShell>
      <Suspense
        fallback={
          <div className="w-full h-full flex items-center justify-center bg-secondary">
            <Spinner size="md" />
          </div>
        }
      >
        <Outlet />
      </Suspense>
    </AppShell>
  )
}

export default AppShellLayout
