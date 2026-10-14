import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useSession } from '../contexts/session-context'

/**
 * Route guard for pages only 11&1 staff see while they're tested (the new campaign builder,
 * Oct 2026). The backend refuses non-staff too; this just keeps the page from rendering.
 * Waits for the user to load rather than bouncing a staff member on a cold start.
 */
export const RequireStaff = ({ children }: { children: ReactNode }) => {
  const { user } = useSession()
  if (!user) return null
  if (!user.is_staff) return <Navigate to="/home" replace />
  return <>{children}</>
}
