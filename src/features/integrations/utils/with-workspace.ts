/**
 * Append the on-screen workspace to an integrations API path.
 *
 * WHY: the backend session is shared by every browser tab and remembers whichever
 * workspace was switched to LAST. Integration endpoints that fell back to it listed,
 * linked or disconnected in another client's workspace when an agency user had two
 * client tabs open. Naming the workspace on screen fixes that; the backend checks the
 * caller is a member (utils/auth.py resolve_workspace_tenant).
 */
export const withWorkspace = (path: string, tenantId?: string | null): string => {
  if (!tenantId) return path
  const sep = path.includes('?') ? '&' : '?'
  return `${path}${sep}tenant_id=${encodeURIComponent(tenantId)}`
}
