import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { AppShell } from './app-shell'
import { Spinner } from './spinner'

/**
 * Layout route: mounts the sidebar + command palette ONCE and keeps them on
 * screen across navigation. Only the content pane suspends while a lazy child
 * route's chunk loads — previously the route-level Suspense in routes/index.tsx
 * blanked the entire viewport (sidebar included) on every page switch.
 */
const AppShellLayout = () => (
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

export default AppShellLayout
