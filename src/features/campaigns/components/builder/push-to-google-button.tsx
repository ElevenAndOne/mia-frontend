import { useState } from 'react'
import type { Asset } from '../../types'
import { GooglePushPreflight } from './google-push-preflight'

const GOOGLE = '#4285F4'

interface Props {
  actionId: string
  assets: Asset[]
}

// Mirrors PushToMetaButton: opens the Google preflight modal for this channel
// action's READY assets. Each asset becomes one ad group (keyword theme + RSA)
// inside a single PAUSED Search campaign.
export const PushToGoogleButton = ({ actionId, assets }: Props) => {
  const [open, setOpen] = useState(false)
  const readyCount = assets.filter((a) => a.status === 'ready').length

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={readyCount === 0}
        title={readyCount === 0 ? 'No assets marked Ready to launch' : 'Push ready ads to Google (paused)'}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg label-xs font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ backgroundColor: GOOGLE }}
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
        Push to Google ({readyCount} ready)
      </button>
      {open && <GooglePushPreflight actionId={actionId} onClose={() => setOpen(false)} />}
    </>
  )
}
