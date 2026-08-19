import { useCallback, useEffect, useRef, useState } from 'react'
import { XClose } from '../../../components/icon/x-close'
import { Spinner } from '../../../components/spinner'
import { useSession } from '../../../contexts/session-context'
import { useToast } from '../../../contexts/toast-context'
import {
  miaCreateApi,
  type EditedAsset,
  type MiaAsset,
} from '../../creative-studio/creative-studio-api'

type Mode = 'place' | 'select'
/** What's being dragged in place mode. */
type Handle = 'headline' | 'logo' | null

interface Props {
  asset: MiaAsset
  conversationId?: string | null
  onClose: () => void
  /** A new asset was produced — the thread appends it as the latest version. */
  onEdited: (asset: EditedAsset) => void
}

/**
 * Full-screen editor for an image in the chat thread.
 *
 * Two modes, both deliberately outside the chat loop so they feel immediate:
 *  place  — drag the headline / logo anywhere; each drop re-renders from the clean base
 *           (so text never stacks) and the position is persisted with the asset.
 *  select — click objects to build a precise selection (SAM2), then say what should be
 *           there instead; only the selected pixels change.
 */
export const ImageEditorOverlay = ({ asset, conversationId, onClose, onEdited }: Props) => {
  const { sessionId, activeWorkspace } = useSession()
  const { showToast } = useToast()
  const tenantId = activeWorkspace?.tenant_id || ''

  const [mode, setMode] = useState<Mode>('place')
  const [current, setCurrent] = useState<MiaAsset>(asset)
  const [busy, setBusy] = useState<string | null>(null)
  const imgRef = useRef<HTMLImageElement>(null)

  // place mode — fractional positions, seeded from whatever the asset was composited with
  const meta = current as MiaAsset & {
    headline?: string | null
    headline_xy?: [number, number] | null
    logo_xy?: [number, number] | null
  }
  const [headlinePos, setHeadlinePos] = useState<[number, number] | null>(
    meta.headline_xy ?? null
  )
  const [logoPos, setLogoPos] = useState<[number, number] | null>(meta.logo_xy ?? null)
  const [dragging, setDragging] = useState<Handle>(null)

  // select mode
  const [points, setPoints] = useState<{ x: number; y: number; label: number }[]>([])
  const [maskUrl, setMaskUrl] = useState<string | null>(null)
  const [instruction, setInstruction] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  /** Pointer position as 0-1 fractions of the displayed image. */
  const fractionsFrom = useCallback((clientX: number, clientY: number) => {
    const el = imgRef.current
    if (!el) return null
    const r = el.getBoundingClientRect()
    return {
      x: Math.max(0, Math.min(1, (clientX - r.left) / r.width)),
      y: Math.max(0, Math.min(1, (clientY - r.top) / r.height)),
    }
  }, [])

  const applyPlacement = async (overrides: {
    headline_xy?: [number, number]
    logo_xy?: [number, number]
  }) => {
    if (!sessionId || !tenantId) return
    setBusy('Moving…')
    try {
      const next = await miaCreateApi.recompose(
        sessionId,
        tenantId,
        current.asset_id,
        overrides,
        conversationId
      )
      setCurrent({ ...current, asset_id: next.asset_id, cdn_url: next.cdn_url })
      onEdited(next)
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Could not move that')
    } finally {
      setBusy(null)
    }
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (mode !== 'place' || !dragging) return
    const f = fractionsFrom(e.clientX, e.clientY)
    setDragging(null)
    if (!f) return
    if (dragging === 'headline') {
      setHeadlinePos([f.x, f.y])
      void applyPlacement({ headline_xy: [f.x, f.y] })
    } else {
      setLogoPos([f.x, f.y])
      void applyPlacement({ logo_xy: [f.x, f.y] })
    }
  }

  const handleImageClick = async (e: React.MouseEvent) => {
    if (mode !== 'select' || !sessionId || !tenantId) return
    const f = fractionsFrom(e.clientX, e.clientY)
    if (!f) return
    // alt-click subtracts from the selection, matching Photoshop's muscle memory
    const next = [...points, { x: f.x, y: f.y, label: e.altKey ? 0 : 1 }]
    setPoints(next)
    setBusy('Selecting…')
    try {
      const res = await miaCreateApi.segment(sessionId, tenantId, current.asset_id, next)
      setMaskUrl(res.mask_url)
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Selection failed')
      setPoints(points) // roll back the click that failed
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
        current.asset_id,
        maskUrl,
        instruction.trim(),
        conversationId
      )
      setCurrent({ ...current, asset_id: next.asset_id, cdn_url: next.cdn_url })
      onEdited(next)
      setPoints([])
      setMaskUrl(null)
      setInstruction('')
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Edit failed')
    } finally {
      setBusy(null)
    }
  }

  const clearSelection = () => {
    setPoints([])
    setMaskUrl(null)
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 shrink-0">
        <div className="flex rounded-lg overflow-hidden border border-white/20">
          {(['place', 'select'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m)
                clearSelection()
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

        <span className="paragraph-xs text-white/60 hidden sm:block">
          {mode === 'place'
            ? 'Drag the handles onto the image — each drop re-renders from the clean original'
            : 'Click an object to select it (alt-click to remove part), then say what belongs there'}
        </span>

        {busy && (
          <span className="flex items-center gap-2 paragraph-xs text-white/80 ml-auto">
            <Spinner size="sm" variant="light" /> {busy}
          </span>
        )}

        <button
          onClick={onClose}
          className={`p-2 rounded-lg text-white/80 hover:bg-white/10 ${busy ? '' : 'ml-auto'}`}
          aria-label="Close editor"
        >
          <XClose size={20} />
        </button>
      </div>

      {/* Canvas */}
      <div
        className="flex-1 min-h-0 flex items-center justify-center p-4 overflow-hidden"
        onPointerUp={handlePointerUp}
      >
        <div className="relative max-h-full">
          <img
            ref={imgRef}
            src={current.cdn_url}
            alt="Editing"
            draggable={false}
            onClick={handleImageClick}
            className={[
              'max-h-[calc(100dvh-180px)] max-w-full object-contain select-none',
              mode === 'select' ? 'cursor-crosshair' : '',
            ].join(' ')}
          />

          {/* The selection, drawn as the mask itself so the outline follows the object */}
          {mode === 'select' && maskUrl && (
            <img
              src={maskUrl}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-contain pointer-events-none opacity-45 mix-blend-screen"
            />
          )}

          {/* Click markers */}
          {mode === 'select' &&
            points.map((p, i) => (
              <span
                key={i}
                className={[
                  'absolute w-3 h-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white pointer-events-none',
                  p.label === 1 ? 'bg-brand-solid' : 'bg-error-solid',
                ].join(' ')}
                style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
              />
            ))}

          {/* Draggable handles */}
          {mode === 'place' && (
            <>
              <DragHandle
                label="Headline"
                pos={headlinePos ?? [0.07, 0.07]}
                active={dragging === 'headline'}
                onGrab={() => setDragging('headline')}
              />
              <DragHandle
                label="Logo"
                pos={logoPos ?? [0.78, 0.82]}
                active={dragging === 'logo'}
                onGrab={() => setDragging('logo')}
              />
            </>
          )}
        </div>
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
              onClick={clearSelection}
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

const DragHandle = ({
  label,
  pos,
  active,
  onGrab,
}: {
  label: string
  pos: [number, number]
  active: boolean
  onGrab: () => void
}) => (
  <button
    onPointerDown={(e) => {
      e.preventDefault()
      onGrab()
    }}
    className={[
      'absolute -translate-x-1 -translate-y-1 px-2 py-1 rounded paragraph-xs font-semibold',
      'cursor-grab active:cursor-grabbing border',
      active
        ? 'bg-brand-solid text-primary-onbrand border-white'
        : 'bg-black/70 text-white border-white/50 hover:bg-black/90',
    ].join(' ')}
    style={{ left: `${pos[0] * 100}%`, top: `${pos[1] * 100}%` }}
  >
    {label}
  </button>
)

export default ImageEditorOverlay
