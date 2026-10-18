/**
 * Format text for WhatsApp and open the share link.
 * WhatsApp supports: *bold*, _italic_, ~strikethrough~
 * We convert markdown to WhatsApp-compatible format.
 */
function formatForWhatsApp(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '*$1*') // **bold** → *bold*
    .replace(/#{1,6}\s+(.+)/g, '*$1*') // # Heading → *Heading*
    .replace(/^[-*]\s+/gm, '• ') // - bullet → • bullet
    .replace(/`{1,3}[^`]*`{1,3}/g, '') // strip inline/block code
    .trim()
}

export function shareViaWhatsApp(text: string): void {
  const formatted = formatForWhatsApp(text)
  const url = `https://wa.me/?text=${encodeURIComponent(formatted)}`
  window.open(url, '_blank', 'noopener,noreferrer')
}

const isPhone = (): boolean =>
  typeof navigator !== 'undefined' && /android|iphone|ipad|ipod/i.test(navigator.userAgent || '')

/**
 * Open a chat with Mia. On a phone the WhatsApp app opens directly (whatsapp://): wa.me in a
 * mobile browser stopped on a "download / open app" page first (phone test, 18 Oct). If the
 * app doesn't take over within a moment (not installed), the wa.me link is the fallback.
 * Returns true when it handled the tap, so the link's own navigation is skipped.
 */
export function openWhatsAppChat(appUrl: string | null | undefined, webUrl: string): boolean {
  if (!appUrl || !isPhone()) return false
  let left = false
  const onHide = () => {
    left = true
  }
  document.addEventListener('visibilitychange', onHide, { once: true })
  window.location.href = appUrl
  window.setTimeout(() => {
    document.removeEventListener('visibilitychange', onHide)
    if (!left && !document.hidden) window.location.href = webUrl
  }, 1500)
  return true
}
