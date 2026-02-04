interface CookieOptions {
  days?: number
  path?: string
  sameSite?: 'Lax' | 'Strict' | 'None'
}

const buildCookieOptions = (options: CookieOptions = {}): string => {
  const parts: string[] = []

  if (typeof options.days === 'number') {
    const expires = new Date()
    expires.setTime(expires.getTime() + options.days * 24 * 60 * 60 * 1000)
    parts.push(`expires=${expires.toUTCString()}`)
  }

  parts.push(`path=${options.path || '/'}`)
  parts.push(`SameSite=${options.sameSite || 'Lax'}`)

  return parts.join('; ')
}

export const setCookie = (name: string, value: string, options?: CookieOptions): void => {
  const encodedValue = encodeURIComponent(value)
  document.cookie = `${name}=${encodedValue}; ${buildCookieOptions(options)}`
}

export const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

export const deleteCookie = (name: string): void => {
  setCookie(name, '', { days: -1 })
}
