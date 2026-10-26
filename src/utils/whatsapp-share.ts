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
/**
 * The same chat in WhatsApp Web, for a computer: wa.me on a computer without the WhatsApp app
 * (every Linux machine, most work laptops) stops on WhatsApp's download page (local test,
 * 22 Oct 2026). web.whatsapp.com/send opens the chat with the message typed once they're logged
 * in to WhatsApp Web. Null when the link carries no number.
 */
export function webChatUrl(waMe: string): string | null {
  const m = /wa\.me\/(\d{8,15})(?:\?text=([^&#]*))?/.exec(waMe || '')
  if (!m) return null
  return `https://web.whatsapp.com/send?phone=${m[1]}${m[2] ? `&text=${m[2]}` : ''}`
}

export function openWhatsAppChat(appUrl: string | null | undefined, webUrl: string): boolean {
  if (!isPhone()) {
    const web = webChatUrl(webUrl)
    if (!web) return false
    window.open(web, '_blank', 'noopener,noreferrer')
    return true
  }
  if (!appUrl) return false
  if (!/android/i.test(navigator.userAgent || '')) {
    // iPhone: the app link, and nothing after it. Safari asks "Open in WhatsApp?" and waits for
    // the tap; the old 1.5 s fallback took them to WhatsApp's download page while it asked
    // (local test, 22 Oct 2026). wa.me on its own stopped on that page too (18 Oct).
    window.location.href = appUrl
    return true
  }
  if (appUrl.startsWith('whatsapp://send')) {
    // Android: Chrome's own intent link opens the app, or the wa.me page when it isn't there.
    // Our timer used to jump to wa.me while Chrome was still asking "open WhatsApp?" (an
    // incognito tab always asks), which landed on the download page (local test, 22 Oct 2026).
    const query = appUrl.slice('whatsapp://send'.length)
    window.location.href =
      // No package: WhatsApp Business takes the same link, and naming com.whatsapp sent a phone
      // with only Business straight to the download page.
      `intent://send${query}#Intent;scheme=whatsapp;` +
      `S.browser_fallback_url=${encodeURIComponent(webUrl)};end`
    return true
  }
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
