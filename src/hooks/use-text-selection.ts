import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'

export interface TextSelection {
  rect: DOMRect
  text: string
}

/**
 * Capture a text highlight inside a container, for highlight-to-edit.
 *
 * Two capture paths feed the same state:
 * - mouse release (the container's `onMouseUp`, plus a document-level mouseup for
 *   drags that end outside it) — the desktop path. Capture waits for release so
 *   the native highlight stays visible for the whole drag.
 * - a debounced document `selectionchange` listener — the only reliable signal on
 *   touch, where long-press selection never dispatches mouseup. Suppressed while
 *   a mouse button is held, so it can't open the toolbar mid-drag.
 *
 * selectionchange only ever sets/updates a selection, never clears one: focusing
 * the edit toolbar's input collapses the document selection, and that must not
 * close the toolbar that was just opened from it. Clearing is explicit (`clear`,
 * or a collapsed desktop click via onMouseUp).
 */
export function useTextSelection(containerRef: RefObject<HTMLElement | null>, enabled = true) {
  const [selection, setSelection] = useState<TextSelection | null>(null)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // True while a mouse button is held: the selectionchange path must not capture
  // mid-drag (the toolbar would open — and steal focus — before the user releases).
  const mouseIsDown = useRef(false)

  const readSelection = useCallback((): TextSelection | null => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || !sel.rangeCount) return null
    const text = sel.toString().trim()
    if (!text) return null
    const range = sel.getRangeAt(0)
    if (!containerRef.current?.contains(range.commonAncestorContainer)) return null
    return { rect: range.getBoundingClientRect(), text }
  }, [containerRef])

  const onMouseUp = useCallback(() => {
    if (!enabled) return
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      setSelection(null) // collapsed click in the container dismisses
      return
    }
    const next = readSelection()
    if (next) setSelection(next)
  }, [enabled, readSelection])

  useEffect(() => {
    if (!enabled) return
    const onChange = () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
      // Debounced past the drag-handle churn of a touch selection.
      debounceTimer.current = setTimeout(() => {
        // Mid-drag on desktop: keep the native highlight, capture on release.
        if (mouseIsDown.current) return
        const next = readSelection()
        if (next) setSelection(next)
      }, 300)
    }
    document.addEventListener('selectionchange', onChange)
    return () => {
      document.removeEventListener('selectionchange', onChange)
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [enabled, readSelection])

  // Track the mouse button document-wide, and capture on release — a drag that
  // starts in the container but ends outside it never fires the container's
  // own mouseup. Touch long-press never dispatches these, so it keeps the
  // selectionchange path above. readSelection() already scopes to the container,
  // so unrelated mouseups (menus, buttons) are no-ops.
  useEffect(() => {
    if (!enabled) return
    const onDown = () => {
      mouseIsDown.current = true
    }
    const onUp = () => {
      mouseIsDown.current = false
      const next = readSelection()
      if (next) setSelection(next)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('mouseup', onUp)
      mouseIsDown.current = false
    }
  }, [enabled, readSelection])

  // Drop the selection when capture is disabled (e.g. the pane enters edit mode).
  useEffect(() => {
    if (!enabled) setSelection(null)
  }, [enabled])

  const clear = useCallback(() => {
    setSelection(null)
    window.getSelection()?.removeAllRanges()
  }, [])

  /** Open the toolbar without a highlight — the "Edit with Mia" whole-text fallback. */
  const selectAll = useCallback(
    (text: string) => {
      if (!text.trim()) return
      const rect =
        containerRef.current?.getBoundingClientRect() ?? new DOMRect(0, 0, 0, 0)
      setSelection({ rect, text })
    },
    [containerRef]
  )

  /**
   * Tap-to-select (mobile pick mode): capture the text of the line the user
   * tapped — no long-press needed. Returns false when the tap didn't land on a
   * specific piece of text (so callers can keep pick mode armed).
   */
  const pickFromEvent = useCallback((e: { target: EventTarget | null }): boolean => {
    const el =
      e.target instanceof Element
        ? e.target.closest('p, span, h1, h2, h3, h4, h5, h6, li, td, blockquote, a, em, strong')
        : null
    const text = el?.textContent?.trim()
    if (!el || !text) return false
    // A container-sized hit means the tap was between lines, not on one.
    if (text.length > 400) return false
    // Select the line for real so the user sees the same native highlight a
    // long-press gives (the selectionchange listener ignores this — it only
    // ever re-captures, and we set state ourselves right after).
    const sel = window.getSelection()
    if (sel) {
      const range = document.createRange()
      range.selectNodeContents(el)
      sel.removeAllRanges()
      sel.addRange(range)
    }
    setSelection({ rect: el.getBoundingClientRect(), text })
    return true
  }, [])

  return { selection, onMouseUp, clear, selectAll, pickFromEvent }
}
