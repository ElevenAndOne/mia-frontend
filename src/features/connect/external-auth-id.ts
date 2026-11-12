/**
 * The id WorkOS puts on /connect/login?external_auth_id=... when Claude starts a connection.
 *
 * It arrives once, in the query string, and the query string does not survive: signing in
 * sends the browser to Google or Facebook and back to the bare path, and the session
 * bootstrap also strips queries. So it is saved to sessionStorage the moment this module
 * loads (it is imported by the route table, before any effect runs), and the page reads it
 * from there. sessionStorage, not localStorage: it belongs to this tab's connection only.
 */
const KEY = 'mia_connect_external_auth_id'
// Loose on purpose: the format is WorkOS's to change. It only keeps junk out of storage.
const SHAPE = /^[A-Za-z0-9_.~-]{8,512}$/

export const CONNECT_LOGIN_PATH = '/connect/login'

export const captureExternalAuthId = (): void => {
  if (window.location.pathname !== CONNECT_LOGIN_PATH) return
  const id = new URLSearchParams(window.location.search).get('external_auth_id')
  if (id && SHAPE.test(id)) {
    sessionStorage.setItem(KEY, id)
  }
}

export const readExternalAuthId = (): string | null => {
  const id = sessionStorage.getItem(KEY)
  return id && SHAPE.test(id) ? id : null
}

export const clearExternalAuthId = (): void => {
  sessionStorage.removeItem(KEY)
}

captureExternalAuthId()
