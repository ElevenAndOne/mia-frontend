import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/button'
import { useSession } from '../../contexts/session-context'
import { startBuild } from './api'

// Home chat, under Mia's reply, when the message asked for a new campaign (staff while the
// campaign page is tested). One click starts a draft from what the PM wrote (and any deck
// they attached) and opens it on the campaign page, where Mia drafts the brief.
export function CampaignOfferCard({
  offer,
  onDismiss,
}: {
  offer: { pm_text: string; deck_text?: string | null }
  onDismiss: () => void
}) {
  const navigate = useNavigate()
  const { sessionId, activeWorkspace } = useSession()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const start = async () => {
    if (!sessionId || !activeWorkspace) return
    setBusy(true)
    setError(null)
    try {
      const { campaign_id } = await startBuild(sessionId, activeWorkspace.tenant_id, {
        pm_text: offer.pm_text,
        deck_text: offer.deck_text ?? undefined,
      })
      navigate(`/campaign-builder/${campaign_id}/brief`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start the campaign')
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-secondary bg-primary px-4 py-3">
      <div className="min-w-0">
        <p className="subheading-sm text-primary">Build this as a campaign?</p>
        <p className="paragraph-xs text-tertiary">
          Mia drafts the brief on the campaign page, where the plan and the studio jobs follow.
        </p>
        {error ? <p className="paragraph-xs text-error mt-1">{error}</p> : null}
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost" onClick={onDismiss}>
          Not now
        </Button>
        <Button size="sm" variant="primary" loading={busy} onClick={start}>
          Open the campaign page
        </Button>
      </div>
    </div>
  )
}
