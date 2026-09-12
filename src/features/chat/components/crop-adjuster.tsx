import { useRef, useState } from 'react'

import type { CropBox } from './crop-utils'

interface CropAdjusterProps {
  url: string
  imgRatio: number
  targetRatio: number
  onSave: (crop: CropBox) => void
  onClose: () => void
  title?: string
  hint?: string
  /** When set, a third button lets the user skip cropping (Facebook accepts any ratio). */
  onUseAsIs?: () => void
}

/**
 * Drag-to-crop: the image inside a platform-ratio frame; the user slides it along
 * the overflow axis to choose which part survives. Saving emits a fractional crop
 * box — the caller either applies it in the browser (Swap photo) or sends it to the
 * backend (Schedule).
 */
export const CropAdjuster = ({
  url,
  imgRatio,
  targetRatio,
  onSave,
  onClose,
  title = 'Adjust crop',
  hint = 'Drag the image to choose what stays in frame.',
  onUseAsIs,
}: CropAdjusterProps) => {
  const [offset, setOffset] = useState(0.5) // 0 = top/left … 1 = bottom/right
  const frameRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ start: number; startOffset: number } | null>(null)

  const vertical = imgRatio < targetRatio // taller than frame → slides up/down

  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { start: vertical ? e.clientY : e.clientX, startOffset: offset }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current || !frameRef.current) return
    const frame = frameRef.current.getBoundingClientRect()
    // How far (px) the image can travel inside the frame along the overflow axis.
    const travel = vertical
      ? frame.width / imgRatio - frame.height
      : frame.height * imgRatio - frame.width
    if (travel <= 0) return
    const deltaPx = (vertical ? e.clientY : e.clientX) - drag.current.start
    setOffset(Math.min(1, Math.max(0, drag.current.startOffset - deltaPx / travel)))
  }
  const onPointerUp = () => {
    drag.current = null
  }

  const save = () => {
    if (vertical) {
      const visible = imgRatio / targetRatio // fraction of source height that fits
      onSave({ x: 0, y: offset * (1 - visible), w: 1, h: visible })
    } else {
      const visible = targetRatio / imgRatio // fraction of source width that fits
      onSave({ x: offset * (1 - visible), y: 0, w: visible, h: 1 })
    }
  }

  // object-position percentage along the overflow axis
  const posPct = `${(offset * 100).toFixed(1)}%`

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-4"
      onClick={onClose}
    >
      <div
        className="bg-primary border border-tertiary rounded-2xl p-4 w-full max-w-sm flex flex-col gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="paragraph-sm font-semibold text-primary">{title}</p>
        <p className="paragraph-xs text-quaternary">{hint}</p>
        <div
          ref={frameRef}
          className="w-full overflow-hidden rounded-lg border border-tertiary select-none touch-none cursor-grab active:cursor-grabbing"
          style={{ aspectRatio: `${targetRatio}` }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          <img
            src={url}
            alt=""
            draggable={false}
            className="w-full h-full object-cover pointer-events-none"
            style={{ objectPosition: vertical ? `50% ${posPct}` : `${posPct} 50%` }}
          />
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg paragraph-sm text-secondary hover:bg-tertiary transition-colors"
          >
            Cancel
          </button>
          {onUseAsIs && (
            <button
              type="button"
              onClick={onUseAsIs}
              className="px-3 py-1.5 rounded-lg border border-primary paragraph-sm text-secondary hover:bg-tertiary transition-colors"
            >
              Use as is
            </button>
          )}
          <button
            type="button"
            onClick={save}
            className="px-3 py-1.5 rounded-lg bg-brand-solid text-primary-onbrand paragraph-sm font-medium"
          >
            Save crop
          </button>
        </div>
      </div>
    </div>
  )
}
