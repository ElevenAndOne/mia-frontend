import { useState } from 'react'
import { MetaPushPreflight } from './meta-push-preflight'
import type { Asset } from '../../types'

const META = '#0866FF'

interface Props {
  actionId: string
  assets: Asset[]
}

// "Push to Meta" for a Meta Ads channel action. Opens the preflight modal,
// which shows exactly what will be created (objective, budget/flight, per-ad
// creative types) and lets the PM review the Advantage+ audience seeds before
// confirming. Everything is created PAUSED.
export const PushToMetaButton = ({ actionId, assets }: Props) => {
  const [open, setOpen] = useState(false)
  const readyCount = assets.filter((a) => a.status === 'ready').length

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={readyCount === 0}
        title={readyCount === 0 ? 'No assets marked Ready to launch' : 'Push ready ads to Meta (paused)'}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg label-xs font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ backgroundColor: META }}
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
        Push to Meta{readyCount > 0 ? ` (${readyCount} ready)` : ''}
      </button>

      {open && <MetaPushPreflight actionId={actionId} onClose={() => setOpen(false)} />}
    </>
  )
}
