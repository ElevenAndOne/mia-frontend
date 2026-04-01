/**
 * Format text for WhatsApp and open the share link.
 * WhatsApp supports: *bold*, _italic_, ~strikethrough~
 * We convert markdown to WhatsApp-compatible format.
 */
function formatForWhatsApp(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '*$1*')   // **bold** → *bold*
    .replace(/#{1,6}\s+(.+)/g, '*$1*')    // # Heading → *Heading*
    .replace(/^[-*]\s+/gm, '• ')          // - bullet → • bullet
    .replace(/`{1,3}[^`]*`{1,3}/g, '')    // strip inline/block code
    .trim()
}

export function shareViaWhatsApp(text: string): void {
  const formatted = formatForWhatsApp(text)
  const url = `https://wa.me/?text=${encodeURIComponent(formatted)}`
  window.open(url, '_blank', 'noopener,noreferrer')
}