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

interface Props {
  asset: MiaAsset
  conversationId?: string | null
  onClose: () => void
  onEdited: (asset: EditedAsset) => void
}

/** Mirrors the compositor's hybrid reference edge so the preview matches the render. */
const refEdge = (w: number, h: number) => (Math.min(w, h) * 3 + Math.max(w, h)) / 4
const LOGO_WIDTH_FRAC = 0.18 // overlay_logo's width_frac

/**
 * Full-screen editor for a chat image.
 *
 * Placement is previewed ENTIRELY in the browser: the headline and logo are real DOM
 * elements over the text-free base, so dragging is instant and WYSIWYG. Only "Apply"
 * hits the server. (The first version re-rendered server-side on every drop, which
 * took 13-31s each and gave no idea where things would land.)
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

  // Live placement (fractions). Seeded from the recipe, then owned by the drag.
  const [headlinePos, setHeadlinePos] = useState<[number, number] | null>(null)
  const [logoPos, setLogoPos] = useState<[number, number] | null>(null)
  const [dirty, setDirty] = useState(false)
  const dragRef = useRef<Handle | null>(null)

  // Select mode
  const [points, setPoints] = useState<{ x: number; y: number; label: number }[]>([])
  const [maskUrl, setMaskUrl] = useState<string | null>(null)
  const [instruction, setInstruction] = useState('')

  const recipe = state?.recipe ?? {}
  const headline = (recipe.headline || '').trim()

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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const fractionsFrom = useCallback((clientX: number, clientY: number) => {
    const el = frameRef.current
    if (!el) return null
    const r = el.getBoundingClientRect()
    return {
      x: Math.max(0, Math.min(1, (clientX - r.left) / r.width)),
      y: Math.max(0, Math.min(1, (clientY - r.top) / r.height)),
    }
  }, [])

  // Dragging is local state only — no network until Apply.
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return
    const f = fractionsFrom(e.clientX, e.clientY)
    if (!f) return
    if (dragRef.current === 'headline') setHeadlinePos([f.x, f.y])
    else setLogoPos([f.x, f.y])
    setDirty(true)
  }

  const applyPlacement = async () => {
    if (!sessionId || !tenantId || !dirty) return
    setBusy('Applying…')
    try {
      const next = await miaCreateApi.recompose(
        sessionId,
        tenantId,
        assetId,
        {
          ...(headlinePos ? { headline_xy: headlinePos } : {}),
          ...(logoPos ? { logo_xy: logoPos } : {}),
        },
        conversationId
      )
      onEdited(next)
      setAssetId(next.asset_id) // keep editing the new version
      setDirty(false)
      showToast('success', 'Placement applied')
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Could not apply that')
    } finally {
      setBusy(null)
    }
  }

  const onImageClick = async (e: React.MouseEvent) => {
    if (mode !== 'select' || !sessionId || !tenantId) return
    const f = fractionsFrom(e.clientX, e.clientY)
    if (!f) return
    const next = [...points, { x: f.x, y: f.y, label: e.altKey ? 0 : 1 }]
    setPoints(next)
    setBusy('Selecting…')
    try {
      const res = await miaCreateApi.segment(sessionId, tenantId, assetId, next)
      setMaskUrl(res.mask_url)
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Selection failed')
      setPoints(points)
    } finally {
      setBusy(null)
    }
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
        conversationId
      )
      onEdited(next)
      setAssetId(next.asset_id)
      setPoints([])
      setMaskUrl(null)
      setInstruction('')
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Edit failed')
    } finally {
      setBusy(null)
    }
  }

  // Preview geometry, derived from the DISPLAYED size so it matches the render.
  const [box, setBox] = useState({ w: 0, h: 0 })
  useEffect(() => {
    const el = frameRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect()
      setBox({ w: r.width, h: r.height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [state])

  const fontPx = box.w
    ? refEdge(box.w, box.h) * 0.085 * (Number(recipe.text_scale) || 1)
    : 0
  const marginPx = box.w * 0.07
  const previewSrc = mode === 'select' ? (state?.composited_cdn_url ?? '') : (state?.base_cdn_url ?? '')

  return (
    <div className="fixed inset-0 z-[60] bg-black/95 flex flex-col select-none">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 shrink-0">
        <div className="flex rounded-lg overflow-hidden border border-white/20">
          {(['place', 'select'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m)
                setPoints([])
                setMaskUrl(null)
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
            ? 'Drag the headline or logo — the preview is live, then Apply to render it'
            : 'Click an object to select it (alt-click to remove part), then say what belongs there'}
        </span>

        <div className="ml-auto flex items-center gap-3">
          {busy && (
            <span className="flex items-center gap-2 paragraph-xs text-white/80">
              <Spinner size="sm" variant="light" /> {busy}
            </span>
          )}
          {mode === 'place' && (
            <button
              onClick={() => void applyPlacement()}
              disabled={!dirty || !!busy}
              className="px-4 py-1.5 rounded-lg bg-brand-solid text-primary-onbrand paragraph-sm font-medium disabled:opacity-40"
            >
              {dirty ? 'Apply' : 'Applied'}
            </button>
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
        className="flex-1 min-h-0 flex items-center justify-center p-4 overflow-hidden"
        onPointerMove={onPointerMove}
        onPointerUp={() => {
          dragRef.current = null
        }}
        onPointerLeave={() => {
          dragRef.current = null
        }}
      >
        {loadError ? (
          <p className="paragraph-sm text-white/70">{loadError}</p>
        ) : !state ? (
          <Spinner size="lg" variant="light" />
        ) : (
          <div ref={frameRef} className="relative inline-block max-h-full">
            <img
              src={previewSrc}
              alt="Editing"
              draggable={false}
              onClick={onImageClick}
              className={[
                'max-h-[calc(100dvh-190px)] max-w-full object-contain block',
                mode === 'select' ? 'cursor-pointer' : 'cursor-default',
              ].join(' ')}
            />

            {mode === 'select' && maskUrl && (
              <img
                src={maskUrl}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-contain pointer-events-none opacity-45 mix-blend-screen"
              />
            )}

            {mode === 'select' &&
              points.map((p, i) => (
                <span
                  key={i}
                  className={[
                    'absolute w-3.5 h-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white pointer-events-none',
                    p.label === 1 ? 'bg-brand-solid' : 'bg-error-solid',
                  ].join(' ')}
                  style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
                />
              ))}

            {/* Live preview: the ACTUAL headline and logo, dragged directly */}
            {mode === 'place' && headline && box.w > 0 && (
              <div
                onPointerDown={(e) => {
                  e.preventDefault()
                  dragRef.current = 'headline'
                }}
                className="absolute cursor-grab active:cursor-grabbing"
                style={{
                  left: headlinePos ? `${headlinePos[0] * 100}%` : `${(marginPx / box.w) * 100}%`,
                  top: headlinePos ? `${headlinePos[1] * 100}%` : `${(marginPx / box.h) * 100}%`,
                  maxWidth: `${box.w - marginPx}px`,
                }}
                title="Drag to place the headline"
              >
                <span
                  className="inline-block px-2 py-1"
                  style={{
                    background: 'rgba(0,0,0,0.45)',
                    color: recipe.text_color || '#FFFFFF',
                    fontFamily: recipe.font_family
                      ? `'${recipe.font_family}', system-ui, sans-serif`
                      : 'system-ui, sans-serif',
                    fontSize: `${fontPx}px`,
                    fontWeight: 700,
                    lineHeight: 1.12,
                    whiteSpace: recipe.max_lines === 1 ? 'nowrap' : 'normal',
                    textTransform: 'uppercase',
                  }}
                >
                  {headline}
                </span>
              </div>
            )}

            {mode === 'place' && state.logo_cdn_url && box.w > 0 && (
              <img
                src={state.logo_cdn_url}
                alt="Logo"
                draggable={false}
                onPointerDown={(e) => {
                  e.preventDefault()
                  dragRef.current = 'logo'
                }}
                className="absolute cursor-grab active:cursor-grabbing"
                style={{
                  left: logoPos ? `${logoPos[0] * 100}%` : '76%',
                  top: logoPos ? `${logoPos[1] * 100}%` : '80%',
                  width: `${box.w * LOGO_WIDTH_FRAC}px`,
                }}
                title="Drag to place the logo"
              />
            )}

            {mode === 'place' && !headline && !state.logo_cdn_url && (
              <div className="absolute inset-x-0 bottom-3 flex justify-center">
                <span className="paragraph-xs text-white/70 bg-black/60 rounded px-2 py-1">
                  This image has no headline or logo yet — ask Mia to add one first
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Select-mode instruction bar */}
      {mode === 'select' && (
        <div className="shrink-0 px-4 py-3 border-t border-white/10 flex items-center gap-2">
          <input
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void runInpaint()
            }}
            disabled={!maskUrl || !!busy}
            placeholder={
              maskUrl
                ? 'What should be there instead? (e.g. "a green apple", "empty grass")'
                : 'Click an object on the image first'
            }
            className="flex-1 bg-white/10 text-white paragraph-sm rounded-lg px-3 py-2 outline-none border border-white/20 focus:border-white/40 disabled:opacity-50 placeholder:text-white/40"
          />
          {maskUrl && (
            <button
              onClick={() => {
                setPoints([])
                setMaskUrl(null)
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
      )}
    </div>
  )
}

export default ImageEditorOverlay
