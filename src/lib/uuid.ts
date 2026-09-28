/** A v4 UUID that works outside a secure context.
 *
 * `crypto.randomUUID` exists only on https and localhost. The app is also opened over plain
 * http on the LAN (a phone or a second machine hitting 192.168.x.x:5173), where it is
 * undefined, and every chat send died on it before a single request went out
 * (28 Sep 2026: "the chat slides up and drops back down"). `getRandomValues` is available
 * everywhere; the format is the same 36-character UUID the backend's varchar(36) expects.
 */
export const newUuid = (): string => {
  const c = globalThis.crypto
  if (c && typeof c.randomUUID === 'function') return c.randomUUID()
  const bytes = new Uint8Array(16)
  if (c && typeof c.getRandomValues === 'function') {
    c.getRandomValues(bytes)
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
