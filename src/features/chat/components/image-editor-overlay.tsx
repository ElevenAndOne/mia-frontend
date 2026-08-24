import { useCallback, useEffect, useRef, useState } from 'react'
import { XClose } from '../../../components/icon/x-close'
import { Spinner } from '../../../components/spinner'
import { useSession } from '../../../contexts/session-context'
import { useToast } from '../../../contexts/toast-context'
import {
  miaCreateApi,
  type EditState,
  type EditedAsset,
  type MiaAsset,
} from '../../creative-studio/creative-studio-api'

type Mode = 'place' | 'select'
type Handle = 'headline' | 'logo'
type Drag = { handle: Handle; kind: 'move' | 'resize'; dx: number; dy: number; from: number }

/** Mirrors the compositor's hybrid reference edge so the preview matches the render. */
const refEdge = (w: number, h: number) => (Math.min(w, h) * 3 + Math.max(w, h)) / 4
const LOGO_WIDTH_FRAC = 0.18 // overlay_logo's width_frac
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

/** Meta's story safe zone, same numbers as the compositor's _safe_insets. */
const safeInsets = (w: number, h: number) =>
  h / w >= 1.6 ? { top: h * 0.14, bottom: h * 0.35, side: w * 0.06 } : { top: 0, bottom: 0, side: 0 }

/**
 * Where overlay_logo puts a corner-positioned logo, as frame fractions.
 *
 * An un-dragged logo keeps its corner preset server-side, so the preview has to agree —
 * showing it bottom-right while the render put it top-right is how the editor looked
 * like it had lost the logo's position.
 */
const logoCornerXY = (
  position: string | undefined,
  w: number,
  h: number,
  logoW: number,
  logoH: number,
): [number, number] => {
  const s = safeInsets(w, h)
  const mx = Math.max(w * 0.05, s.side)
  const mt = Math.max(w * 0.05, s.top)
  const mb = Math.max(w * 0.05, s.bottom)
  const right = (w - logoW - mx) / w
  const bottom = (h - logoH - mb) / h
  switch (position) {
    case 'top-right':
      return [right, mt / h]
    case 'bottom-left':
      return [mx / w, bottom]
    case 'bottom-right':
      return [right, bottom]
    case 'top-center':
      return [(w - logoW) / 2 / w, mt / h]
    default: // top-left
      return [mx / w, mt / h]
  }
}

interface Props {
  asset: MiaAsset
  conversationId?: string | null
  onClose: () => void
  onEdited: (asset: EditedAsset) => void
}

/**
 * Full-screen editor for a chat image.
 *
 * Placement is previewed ENTIRELY in the browser: the headline and logo are real DOM
 * elements over the text-free base, so dragging is instant and WYSIWYG. Only "Apply"
 * hits the server. (The first version re-rendered server-side on every drop, which
 * took 13-31s each and gave no idea where things would land.)
 *
 * The preview frame is locked to the COMPOSITED aspect with the base cropped `cover`,
 * which is exactly what resize_to_placement does — otherwise a 9:16 story previewed as
 * the square generation it came from and the headline landed somewhere else entirely.
 *
 * Select mode clicks through SAM2 for a true object outline, then repaints only inside it.
 */
export const ImageEditorOverlay = ({ asset, conversationId, onClose, onEdited }: Props) => {
  const { sessionId, activeWorkspace } = useSession()
  const { showToast } = useToast()
  const tenantId = activeWorkspace?.tenant_id || ''

  const [mode, setMode] = useState<Mode>('place')
  const [state, setState] = useState<EditState | null>(null)
  const [assetId, setAssetId] = useState(asset.asset_id)
  const [busy, setBusy] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const frameRef = useRef<HTMLDivElement>(null)

  // Live placement (fractions + scales). Seeded from the recipe, then owned by the drag.
  const [headlinePos, setHeadlinePos] = useState<[number, number] | null>(null)
  const [logoPos, setLogoPos] = useState<[number, number] | null>(null)
  const [textScale, setTextScale] = useState(1)
  const [logoScale, setLogoScale] = useState(1)
  // A recipe with max_lines=1 auto-shrinks the headline back to fit one line, so scaling
  // up would silently undo itself. Once the designer has grabbed the resize handle their
  // size wins and the text is allowed to wrap.
  const [scaleTouched, setScaleTouched] = useState(false)
  const [dirty, setDirty] = useState(false)
  const dragRef = useRef<Drag | null>(null)

  // Select mode
  const [points, setPoints] = useState<{ x: number; y: number; label: number }[]>([])
  const [maskUrl, setMaskUrl] = useState<string | null>(null)
  const [inverted, setInverted] = useState(false)
  const [instruction, setInstruction] = useState('')

  const recipe = state?.recipe ?? {}
  const headline = (recipe.headline || '').trim()

  // Warm the segmentation model as soon as the editor opens — fal spins idle
  // containers down, so without this the first click of a session waits 6-18s.
  // Once per overlay, regardless of which mode the user ends up using.
  const prewarmedRef = useRef(false)
  useEffect(() => {
    if (prewarmedRef.current || !sessionId || !tenantId) return
    prewarmedRef.current = true
    void miaCreateApi.prewarmEditor(sessionId, tenantId, asset.asset_id)
  }, [sessionId, tenantId, asset.asset_id])

  // Load the base + recipe
  useEffect(() => {
    if (!sessionId || !tenantId) return
    let cancelled = false
    ;(async () => {
      try {
        const s = await miaCreateApi.getEditState(sessionId, tenantId, assetId)
        if (cancelled) return
        setState(s)
        setHeadlinePos(s.recipe.headline_xy ?? null)
        setLogoPos(s.recipe.logo_xy ?? null)
        setTextScale(Number(s.recipe.text_scale) || 1)
        setLogoScale(Number(s.recipe.logo_scale) || 1)
        setDirty(false)
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Could not open the editor')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [sessionId, tenantId, assetId])

  // The headline font needs to be available to the browser for a faithful preview.
  useEffect(() => {
    const fam = recipe.font_family
    if (!fam) return
    const id = `editor-font-${fam.replace(/\s+/g, '-')}`
    if (document.getElementById(id)) return
    const link = document.createElement('link')
    link.id = id
    link.rel = 'stylesheet'
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fam).replace(/%20/g, '+')}:wght@700&display=swap`
    document.head.appendChild(link)
  }, [recipe.font_family])

  // Webfonts load async, so a width measured before the real face arrives is the
  // fallback's width — and the auto-fit factor derived from it would be wrong.
  const [fontsReady, setFontsReady] = useState(0)
  useEffect(() => {
    const fam = recipe.font_family
    if (!fam || !document.fonts?.load) return
    let cancelled = false
    document.fonts
      .load(`700 40px '${fam}'`)
      .then(() => !cancelled && setFontsReady((n) => n + 1))
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [recipe.font_family])

  // Escape closes, but not out from under unsaved placement work, and not while you're
  // typing in the instruction box (where Escape means "clear what I typed", not "throw
  // away everything I just arranged").
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      const el = e.target as HTMLElement | null
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return
      if (dirty && !window.confirm('Discard the placement changes you just made?')) return
      onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, dirty])

  const fractionsFrom = useCallback((clientX: number, clientY: number) => {
    const el = frameRef.current
    if (!el) return null
    const r = el.getBoundingClientRect()
    return {
      x: clamp((clientX - r.left) / r.width, 0, 1),
      y: clamp((clientY - r.top) / r.height, 0, 1),
    }
  }, [])

  const [logoAspect, setLogoAspect] = useState(1)
  const [headlineSize, setHeadlineSize] = useState({ w: 0, h: 0 })
  const headlineElRef = useRef<HTMLSpanElement>(null)
  // Natural one-line width of the headline at its nominal size, measured off-screen.
  const [natWidth, setNatWidth] = useState(0)
  const measureRef = useRef<HTMLSpanElement>(null)

  // The frame is sized in JS, not CSS.
  //
  // `aspectRatio` + a definite height + `max-width:100%` silently drops the aspect lock
  // the moment max-width binds (16:9 in a narrow window, 1:1 on mobile) — which puts
  // clicks back into the wrong pixel space: the exact bug the dimension fix just closed,
  // relocated to CSS. A contain-fit computed from measured numbers can't drift.
  const stageRef = useRef<HTMLDivElement>(null)
  const [stage, setStage] = useState({ w: 0, h: 0 })
  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const measure = () => setStage({ w: el.clientWidth, h: el.clientHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const frame =
    state?.width && state?.height && stage.w > 0 && stage.h > 0
      ? (() => {
          const fit = Math.min(stage.w / state.width, stage.h / state.height)
          return { w: Math.round(state.width * fit), h: Math.round(state.height * fit) }
        })()
      : null
  const box = frame ?? { w: 0, h: 0 }

  // The rendered text block's size, so an un-dragged "center"/"bottom" headline previews
  // where the compositor would actually put it. Also the natural one-line width, which
  // drives the auto-fit shrink below.
  useEffect(() => {
    const el = headlineElRef.current
    if (el) {
      const r = el.getBoundingClientRect()
      setHeadlineSize({ w: r.width, h: r.height })
    }
    const m = measureRef.current
    if (m) setNatWidth(m.getBoundingClientRect().width)
  }, [headline, textScale, box.w, box.h, mode, recipe.font_family, fontsReady])

  /** Grab the element where the user actually clicked, not by its corner. */
  const startDrag = (e: React.PointerEvent, handle: Handle, kind: 'move' | 'resize') => {
    e.preventDefault()
    e.stopPropagation()
    // Capture the pointer so the drag survives the cursor leaving the element, and so a
    // touch drag doesn't turn into a page scroll halfway through.
    try {
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    } catch {
      // Older Safari — the drag still works via the container's pointermove.
    }
    const frame = frameRef.current
    if (!frame) return
    const fr = frame.getBoundingClientRect()
    if (kind === 'resize') {
      // Anchor on the pointer's starting position: movementX/Y is not reported by every
      // touch implementation, so a handle drag did nothing at all on a tablet.
      dragRef.current = {
        handle,
        kind,
        dx: e.clientX,
        dy: e.clientY,
        from: handle === 'headline' ? textScale : logoScale,
      }
      return
    }
    // Offset from the element's top-left to the pointer, as a fraction of the frame.
    // Without this the element jumped its own corner under the cursor and the headline
    // shot off to the right on every grab.
    const er = (e.currentTarget as HTMLElement).getBoundingClientRect()
    dragRef.current = {
      handle,
      kind,
      dx: (e.clientX - er.left) / fr.width,
      dy: (e.clientY - er.top) / fr.height,
      from: 0,
    }
  }

  // Dragging is local state only — no network until Apply.
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current
    if (!d || !box.w) return
    if (d.kind === 'resize') {
      // Total distance from where the handle was grabbed — works with touch, and doesn't
      // accumulate rounding the way per-event deltas do.
      const travel = (e.clientX - d.dx + (e.clientY - d.dy)) / 2
      const next = clamp(
        d.from * (1 + travel / (box.w * 0.4)),
        d.handle === 'headline' ? 0.5 : 0.3,
        d.handle === 'headline' ? 1.6 : 3,
      )
      if (d.handle === 'headline') {
        setTextScale(next)
        setScaleTouched(true)
      } else setLogoScale(next)
      setDirty(true)
      return
    }
    const f = fractionsFrom(e.clientX, e.clientY)
    if (!f) return
    const pos: [number, number] = [clamp(f.x - d.dx, 0, 1), clamp(f.y - d.dy, 0, 1)]
    if (d.handle === 'headline') setHeadlinePos(pos)
    else setLogoPos(pos)
    setDirty(true)
  }

  /** Back to the recipe as stored — the state the editor opened in. */
  const resetPlacement = useCallback(() => {
    if (!state) return
    setHeadlinePos(state.recipe.headline_xy ?? null)
    setLogoPos(state.recipe.logo_xy ?? null)
    setTextScale(Number(state.recipe.text_scale) || 1)
    setLogoScale(Number(state.recipe.logo_scale) || 1)
    setScaleTouched(false)
    setDirty(false)
  }, [state])

  const applyPlacement = async () => {
    if (!sessionId || !tenantId || !dirty) return
    setBusy('Applying…')
    try {
      const next = await miaCreateApi.recompose(
        sessionId,
        tenantId,
        assetId,
        {
          // The on-screen (frame-clamped) positions, so what renders is what was shown.
          ...(headlinePos ? { headline_xy: placedRef.current.headline } : {}),
          ...(logoPos ? { logo_xy: placedRef.current.logo } : {}),
          text_scale: Number(textScale.toFixed(3)),
          logo_scale: Number(logoScale.toFixed(3)),
          // An explicit size beats the stored line limit — otherwise the auto-fit shrinks
          // the headline straight back to where it was.
          ...(scaleTouched ? { max_lines: 0 } : {}),
        },
        conversationId,
      )
      onEdited(next)
      setDirty(false)
      // Close on Apply: the card behind now shows the rendered result, which is the
      // only place the render can be judged at its real size.
      onClose()
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Could not apply that')
    } finally {
      setBusy(null)
    }
  }

  // Segmentation takes seconds, so a reply can land after the user has already cleared the
  // selection or switched tabs — restoring a mask with no dots under it. Only the newest
  // request is allowed to write state.
  const segmentSeq = useRef(0)

  const runSegment = async (
    nextPoints: { x: number; y: number; label: number }[],
    invert = inverted,
  ) => {
    if (!sessionId || !tenantId) return
    const seq = ++segmentSeq.current
    if (!nextPoints.length) {
      setMaskUrl(null)
      return
    }
    setBusy('Selecting…')
    // The selector's container is spun down when idle, and a cold start is 30-60s. Say so
    // rather than showing "Selecting…" for a minute and looking broken.
    const slowTimer = setTimeout(() => {
      if (seq === segmentSeq.current) setBusy('Warming up the selector (first click only)…')
    }, 5000)
    try {
      const res = await miaCreateApi.segment(
        sessionId,
        tenantId,
        assetId,
        nextPoints,
        undefined,
        state?.width && state?.height ? { width: state.width, height: state.height } : undefined,
        invert,
      )
      if (seq === segmentSeq.current) setMaskUrl(res.mask_url)
    } catch (err) {
      if (seq === segmentSeq.current) {
        showToast('error', err instanceof Error ? err.message : 'Selection failed')
      }
    } finally {
      clearTimeout(slowTimer)
      if (seq === segmentSeq.current) setBusy(null)
    }
  }

  const onImageClick = async (e: React.MouseEvent) => {
    if (mode !== 'select' || busy) return
    const f = fractionsFrom(e.clientX, e.clientY)
    if (!f) return
    // Clicking an existing dot removes it — the obvious way to undo a mis-click.
    const hitRadius = 16 / Math.max(1, box.w)
    const hit = points.findIndex(
      (p) => Math.abs(p.x - f.x) < hitRadius && Math.abs(p.y - f.y) < hitRadius * (box.w / box.h),
    )
    const next =
      hit >= 0
        ? points.filter((_, i) => i !== hit)
        : [...points, { x: f.x, y: f.y, label: e.altKey ? 0 : 1 }]
    setPoints(next)
    await runSegment(next)
  }

  const toggleInvert = async () => {
    const next = !inverted
    setInverted(next)
    await runSegment(points, next)
  }

  const runInpaint = async () => {
    if (!sessionId || !tenantId || !maskUrl || !instruction.trim()) return
    setBusy('Repainting…')
    try {
      const next = await miaCreateApi.inpaint(
        sessionId,
        tenantId,
        assetId,
        maskUrl,
        instruction.trim(),
        conversationId,
      )
      onEdited(next)
      setAssetId(next.asset_id)
      setPoints([])
      setMaskUrl(null)
      setInverted(false)
      setInstruction('')
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Edit failed')
    } finally {
      setBusy(null)
    }
  }

  const inSelect = mode === 'select'

  // Defaults for anything the designer hasn't dragged yet have to match the compositor's
  // corner/safe-zone maths, or the preview shows the logo and headline somewhere the
  // render won't put them.
  const insets = safeInsets(box.w || 1, box.h || 1)
  const marginPx = Math.max(box.w * 0.07, insets.side)

  // The compositor shrinks a max_lines=1 headline until it fits the text column, so the
  // preview has to shrink by the same factor — drawn at the nominal size it ran straight
  // off the right edge while the render fitted comfortably. natWidth is measured from a
  // hidden copy at the nominal size, so this can't feed back on itself.
  const nominalFontPx = box.w ? refEdge(box.w, box.h) * 0.085 * textScale : 0
  const textColumn = Math.max(1, box.w - 2 * marginPx)
  const oneLine = recipe.max_lines === 1 && !scaleTouched
  const fitScale = oneLine && natWidth > textColumn ? textColumn / natWidth : 1
  const fontPx = nominalFontPx * fitScale
  // composite_text: pad = head_size * 0.45, applied on all four sides of the text block.
  const scrimPad = fontPx * 0.45
  const logoPx = box.w * LOGO_WIDTH_FRAC * logoScale
  const defaultLogoXY = logoCornerXY(
    recipe.logo_position,
    box.w || 1,
    box.h || 1,
    logoPx,
    logoPx * logoAspect,
  )
  const defaultHeadlineY = (() => {
    const pos = recipe.text_position || 'top'
    if (pos === 'center') return (box.h - headlineSize.h) / 2 / (box.h || 1)
    if (pos === 'bottom')
      return (box.h - Math.max(box.w * 0.07, insets.bottom) - headlineSize.h) / (box.h || 1)
    return Math.max(box.w * 0.07, insets.top) / (box.h || 1)
  })()

  // Positions are the element's TOP-LEFT, so keeping them inside 0..1 only stops things
  // leaving the left and top edges — they slid straight out the right and bottom. The
  // compositor clamps by the FAR edge (W - widest_line, H - block_h), so clamping here the
  // same way both fixes the drag and keeps the preview honest about where it will render.
  const inFrame = (
    pos: [number, number] | null,
    fallback: [number, number],
    w: number,
    h: number,
  ): [number, number] => {
    const [x, y] = pos ?? fallback
    return [
      clamp(x, 0, Math.max(0, 1 - w / (box.w || 1))),
      clamp(y, 0, Math.max(0, 1 - h / (box.h || 1))),
    ]
  }
  const headlineAt = inFrame(
    headlinePos,
    [marginPx / (box.w || 1), defaultHeadlineY],
    headlineSize.w,
    headlineSize.h,
  )
  const logoAt = inFrame(logoPos, defaultLogoXY, logoPx, logoPx * logoAspect)
  // Latest on-screen positions, readable from the Apply handler (which is defined above).
  const placedRef = useRef({ headline: headlineAt, logo: logoAt })
  placedRef.current = { headline: headlineAt, logo: logoAt }
  // Place mode shows the TEXT-FREE base; select mode shows what's on screen now.
  const previewSrc = inSelect ? (state?.composited_cdn_url ?? '') : (state?.base_cdn_url ?? '')

  return (
    <div className="fixed inset-0 z-[60] bg-black/95 flex flex-col select-none">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 shrink-0">
        <div className="flex rounded-lg overflow-hidden border border-white/20">
          {(['place', 'select'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => {
                // Invalidate any selection request in flight, or its late reply lands in
                // the tab you've just switched away from.
                segmentSeq.current += 1
                setMode(m)
                setPoints([])
                setMaskUrl(null)
                setInverted(false)
                setBusy(null)
              }}
              className={[
                'px-3 py-1.5 paragraph-sm font-medium transition-colors',
                mode === m ? 'bg-white text-black' : 'text-white/80 hover:bg-white/10',
              ].join(' ')}
            >
              {m === 'place' ? 'Move text & logo' : 'Select & replace'}
            </button>
          ))}
        </div>

        <span className="paragraph-xs text-white/60 hidden md:block">
          {mode === 'place'
            ? 'Drag to move, drag a corner to resize — then Apply to render it'
            : 'Click an object to select it (click a dot to remove it), then say what belongs there'}
        </span>

        <div className="ml-auto flex items-center gap-3">
          {/* What's actually on this image. Two near-identical thumbnails — the raw
              generation and the finished creative — are easy to mix up, and editing the
              raw one silently produces a result with no headline or logo (2026-08-21). */}
          {state && (
            <span
              className={[
                'paragraph-xs px-2 py-1 rounded border hidden sm:block',
                headline || state.logo_cdn_url
                  ? 'text-white/60 border-white/15'
                  : 'text-warning border-white/30',
              ].join(' ')}
              title={
                headline || state.logo_cdn_url
                  ? 'This image has text/logo, and edits keep it'
                  : "This is the plain image — the version with your headline and logo is a different tile"
              }
            >
              {[headline ? 'headline' : null, state.logo_cdn_url ? 'logo' : null]
                .filter(Boolean)
                .join(' + ') || 'no headline or logo'}
            </span>
          )}
          {busy && (
            <span className="flex items-center gap-2 paragraph-xs text-white/80">
              <Spinner size="sm" variant="light" /> {busy}
            </span>
          )}
          {mode === 'place' && (
            <>
              {/* No way back from a bad drag until now — Apply was the only exit. */}
              <button
                onClick={resetPlacement}
                disabled={!dirty || !!busy}
                className="px-3 py-1.5 rounded-lg paragraph-sm text-white/80 hover:bg-white/10 disabled:opacity-30"
                title="Put the headline and logo back where they were"
              >
                Reset
              </button>
              <button
                onClick={() => void applyPlacement()}
                disabled={!dirty || !!busy}
                className="px-4 py-1.5 rounded-lg bg-brand-solid text-primary-onbrand paragraph-sm font-medium disabled:opacity-40"
              >
                {dirty ? 'Apply' : 'Applied'}
              </button>
            </>
          )}
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-white/80 hover:bg-white/10"
            aria-label="Close editor"
          >
            <XClose size={20} />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div
        className="flex-1 min-h-0 p-4 overflow-hidden"
        // A touch drag would otherwise pan the page instead of moving the headline.
        style={{ touchAction: 'none' }}
        onPointerMove={onPointerMove}
        onPointerUp={() => {
          dragRef.current = null
        }}
        onPointerLeave={() => {
          dragRef.current = null
        }}
      >
        <div ref={stageRef} className="w-full h-full flex items-center justify-center">
        {loadError ? (
          <p className="paragraph-sm text-white/70">{loadError}</p>
        ) : !state ? (
          <Spinner size="lg" variant="light" />
        ) : (
          <div
            ref={frameRef}
            // The frame IS the render canvas: exactly the composited aspect, with the base
            // cropped `cover` the same way resize_to_placement does.
            className="relative overflow-hidden"
            style={
              frame
                ? { width: `${frame.w}px`, height: `${frame.h}px` }
                : { maxWidth: '100%', maxHeight: '100%' }
            }
          >
            <img
              src={previewSrc}
              alt="Editing"
              draggable={false}
              onClick={onImageClick}
              className={[
                'w-full h-full block',
                inSelect ? 'object-contain cursor-pointer' : 'object-cover cursor-default',
              ].join(' ')}
            />

            {inSelect && maskUrl && (
              <img
                src={maskUrl}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-contain pointer-events-none opacity-45 mix-blend-screen"
              />
            )}

            {inSelect &&
              points.map((p, i) => (
                <span
                  key={i}
                  className={[
                    'absolute w-3.5 h-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white pointer-events-none',
                    p.label === 1 ? 'bg-brand-solid' : 'bg-error-solid',
                    // Pulse the newest dot while its selection is resolving — feedback
                    // belongs where the user just clicked, not in a toolbar far away.
                    busy && i === points.length - 1 ? 'animate-ping' : '',
                  ].join(' ')}
                  style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
                />
              ))}

            {/* Off-screen ruler: the headline's natural one-line width at the nominal
                size, which the auto-fit shrink is computed from. */}
            {!inSelect && headline && (
              <span
                ref={measureRef}
                aria-hidden="true"
                // No padding: the compositor's auto-fit compares the TEXT width against the
                // column, so the ruler has to measure glyphs only.
                className="absolute left-0 top-0 invisible whitespace-nowrap pointer-events-none"
                style={{
                  fontFamily: recipe.font_family
                    ? `'${recipe.font_family}', system-ui, sans-serif`
                    : 'system-ui, sans-serif',
                  fontSize: `${nominalFontPx}px`,
                  fontWeight: 700,
                  lineHeight: 1.12,
                  textTransform: 'uppercase',
                }}
              >
                {headline}
              </span>
            )}

            {/* Live preview: the ACTUAL headline and logo, dragged directly */}
            {!inSelect && headline && box.w > 0 && (
              <div
                onPointerDown={(e) => startDrag(e, 'headline', 'move')}
                className="absolute group cursor-grab active:cursor-grabbing"
                style={{
                  left: `${headlineAt[0] * 100}%`,
                  top: `${headlineAt[1] * 100}%`,
                  // The compositor wraps within W - 2*margin. Subtracting a single margin
                  // here let the preview fit "PINK ON THE INSIDE" on one line while the
                  // render wrapped it to two — the same layout, reported as wrong.
                  maxWidth: `${textColumn}px`,
                }}
                title="Drag to move — drag the corner to resize"
              >
                {/* Scrim as its own layer, bleeding `pad` OUTSIDE the text box. The stored
                    headline_xy is the text's top-left, not the band's — padding the text
                    span instead would push the glyphs down and right by pad, which is part
                    of why the preview and the render disagreed. */}
                <span
                  aria-hidden="true"
                  className="absolute pointer-events-none"
                  style={{
                    // The compositor draws a FULL-WIDTH bar for preset positions and only
                    // hugs the block for freely-placed text (band_l/band_r = 0/W when
                    // free_x is None). So an un-dragged composite must preview a full-width
                    // bar, or the first frame after opening misrepresents the render.
                    ...(headlinePos
                      ? { inset: `-${scrimPad}px` }
                      : {
                          top: -scrimPad,
                          bottom: -scrimPad,
                          left: -headlineAt[0] * box.w,
                          width: box.w,
                        }),
                    // 115/255 alpha, same as the compositor's scrim fill.
                    background: 'rgba(0,0,0,0.451)',
                  }}
                />
                <span
                  ref={headlineElRef}
                  className="relative inline-block"
                  style={{
                    // Matches draw_line's drop shadow (offset = size/28).
                    textShadow: `${Math.max(2, fontPx / 28)}px ${Math.max(2, fontPx / 28)}px 0 rgba(0,0,0,0.59)`,
                    color: recipe.text_color || '#FFFFFF',
                    fontFamily: recipe.font_family
                      ? `'${recipe.font_family}', system-ui, sans-serif`
                      : 'system-ui, sans-serif',
                    fontSize: `${fontPx}px`,
                    fontWeight: 700,
                    lineHeight: 1.12,
                    whiteSpace: recipe.max_lines === 1 && !scaleTouched ? 'nowrap' : 'normal',
                    textTransform: 'uppercase',
                  }}
                >
                  {headline}
                </span>
                <span
                  onPointerDown={(e) => startDrag(e, 'headline', 'resize')}
                  className="absolute -right-1.5 -bottom-1.5 w-4 h-4 rounded-sm bg-white border border-black/30 opacity-0 group-hover:opacity-100 cursor-nwse-resize"
                  title="Drag to resize the text"
                />
              </div>
            )}

            {!inSelect && state.logo_cdn_url && box.w > 0 && (
              <div
                onPointerDown={(e) => startDrag(e, 'logo', 'move')}
                className="absolute group cursor-grab active:cursor-grabbing"
                style={{
                  left: `${logoAt[0] * 100}%`,
                  top: `${logoAt[1] * 100}%`,
                  width: `${logoPx}px`,
                }}
                title="Drag to move — drag the corner to resize"
              >
                <img
                  src={state.logo_cdn_url}
                  alt="Logo"
                  draggable={false}
                  className="w-full"
                  onLoad={(e) => {
                    const im = e.currentTarget
                    if (im.naturalWidth) setLogoAspect(im.naturalHeight / im.naturalWidth)
                  }}
                />
                <span
                  onPointerDown={(e) => startDrag(e, 'logo', 'resize')}
                  className="absolute -right-1.5 -bottom-1.5 w-4 h-4 rounded-sm bg-white border border-black/30 opacity-0 group-hover:opacity-100 cursor-nwse-resize"
                  title="Drag to resize the logo"
                />
              </div>
            )}

            {!inSelect && !headline && !state.logo_cdn_url && (
              <div className="absolute inset-x-0 bottom-3 flex justify-center">
                <span className="paragraph-xs text-white/70 bg-black/60 rounded px-2 py-1">
                  This image has no headline or logo yet — ask Mia to add one first
                </span>
              </div>
            )}
          </div>
        )}
        </div>
      </div>

      {/* Instruction bar. Always RENDERED, not just always present: hiding the bar but
          leaving its children conditional collapsed it to bare padding in place mode, so
          the stage was taller there and the same image previewed at two different sizes
          depending on the tab. `invisible` also takes the input out of the tab order. */}
      <div
        className={[
          'shrink-0 px-4 py-3 border-t border-white/10 flex items-center gap-2',
          inSelect ? '' : 'invisible pointer-events-none',
        ].join(' ')}
        aria-hidden={!inSelect}
      >
          <input
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void runInpaint()
            }}
            disabled={!maskUrl || !!busy}
            placeholder={
              maskUrl
                ? 'What should change? (e.g. "make it Dutoit Green", "darker", "a pile of oranges")'
                : 'Click an object on the image first'
            }
            className="flex-1 bg-white/10 text-white paragraph-sm rounded-lg px-3 py-2 outline-none border border-white/20 focus:border-white/40 disabled:opacity-50 placeholder:text-white/40"
          />
          {/* Clicking sky or a blurred background gives SAM2 nothing to latch onto —
              selecting the subject and inverting is the reliable route. */}
          {!!points.length && (
            <button
              onClick={() => void toggleInvert()}
              disabled={!!busy}
              className={[
                'px-3 py-2 rounded-lg paragraph-sm border',
                inverted
                  ? 'bg-white text-black border-white'
                  : 'text-white/80 border-white/20 hover:bg-white/10',
              ].join(' ')}
              title="Select everything except what you clicked"
            >
              Invert
            </button>
          )}
          {maskUrl && (
            <button
              onClick={() => {
                setPoints([])
                setMaskUrl(null)
                setInverted(false)
              }}
              disabled={!!busy}
              className="px-3 py-2 rounded-lg paragraph-sm text-white/80 hover:bg-white/10"
            >
              Clear
            </button>
          )}
          <button
            onClick={() => void runInpaint()}
            disabled={!maskUrl || !instruction.trim() || !!busy}
            className="px-4 py-2 rounded-lg bg-brand-solid text-primary-onbrand paragraph-sm font-medium disabled:opacity-40"
          >
            Replace
          </button>
      </div>
    </div>
  )
}

export default ImageEditorOverlay
