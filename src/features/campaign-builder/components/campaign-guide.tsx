import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Button } from '../../../components/button'
import { useSession } from '../../../contexts/session-context'
import * as api from '../api'
import { buildKey } from '../use-build'
import type { BuildState } from '../types'
import { Card, day } from './parts'

// This campaign's guide (22 Oct). Only a guide attached here is read as this campaign's guide; one uploaded in
// Settings for another campaign never is. Attaching to a brief that hasn't read a guide yet has Mia redraft it from
// the guide's words, keeping what you set and answered. The workspace brand guide (Settings) is read by every step
// too, whole: the brief, the plan, each job's words, the self-check and the chat (22 Oct). The card says which one.

export function CampaignGuide({
  campaignId,
  readOnly,
  brand,
  look = null,
  never = [],
}: {
  campaignId: string
  readOnly: boolean
  brand: BuildState['brand_guide'] | null
  look?: BuildState['brand_look'] | null
  never?: string[]
}) {
  const { sessionId, activeWorkspace } = useSession()
  const tenantId = activeWorkspace?.tenant_id
  const queryClient = useQueryClient()
  const key = ['campaign-guides', tenantId, campaignId]
  const q = useQuery({
    queryKey: key,
    queryFn: () => api.fetchGuides(sessionId!, tenantId!, campaignId),
    enabled: !!sessionId && !!tenantId,
  })
  const [pick, setPick] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const attach = async (guideId: string | null) => {
    setBusy(true)
    setError(null)
    try {
      await api.attachGuide(sessionId!, tenantId!, campaignId, guideId)
      setPick('')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: key }),
        queryClient.invalidateQueries({ queryKey: buildKey(tenantId, campaignId) }),
      ])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That didn’t work. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const attached = q.data?.attached
  const available = q.data?.available ?? []
  return (
    <Card className="flex flex-col gap-2">
      <BrandGuideLine brand={brand} look={look} never={never} campaignId={campaignId} readOnly={readOnly} />
      {!attached && !available.length ? null : <h3 className="subheading-sm text-primary">Campaign guide</h3>}
      {attached ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="paragraph-sm text-primary">
            {attached.filename}
            <span className="text-tertiary"> · read as this campaign’s guide</span>
          </p>
          {readOnly ? null : (
            <button
              type="button"
              disabled={busy}
              onClick={() => void attach(null)}
              className="paragraph-xs underline text-secondary hover:text-primary disabled:opacity-50"
            >
              Detach
            </button>
          )}
        </div>
      ) : available.length ? (
        <p className="paragraph-xs text-secondary">
          Guides uploaded in Settings aren’t read for this campaign until you attach one here.
        </p>
      ) : null}
      {readOnly || !available.length ? null : (
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="guide-pick" className="sr-only">
            A guide uploaded in Settings
          </label>
          <select
            id="guide-pick"
            value={pick}
            onChange={(e) => setPick(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-secondary bg-primary px-2 py-1.5 paragraph-sm text-primary"
          >
            <option value="">{attached ? 'Use a different guide…' : 'Attach a guide uploaded in Settings…'}</option>
            {available.map((g) => (
              <option key={g.id} value={g.id}>
                {g.campaign_name || g.filename}
                {g.attached_to ? ` (attached to ${g.attached_to})` : ''}
              </option>
            ))}
          </select>
          <Button size="sm" disabled={!pick} loading={busy} onClick={() => void attach(pick)}>
            Attach
          </Button>
        </div>
      )}
      {error ? <p className="paragraph-xs text-error">{error}</p> : null}
    </Card>
  )
}

// Which brand guide Mia reads for every step, or a way to add one here (3 Nov: the line only pointed to Settings), and
// the Brand Kit that goes to the studio with every job.
function BrandGuideLine({
  brand,
  look,
  never,
  campaignId,
  readOnly,
}: {
  brand: BuildState['brand_guide'] | null
  look: BuildState['brand_look'] | null
  never: string[]
  campaignId: string
  readOnly: boolean
}) {
  const settings = (
    <Link to="/settings/workspace?tab=brand" className="underline text-secondary hover:text-primary">
      {brand ? 'Open in Settings' : 'Settings'}
    </Link>
  )
  const kit = lookLine(look)
  if (!brand) {
    return (
      <div className="flex flex-col gap-1.5">
        <p className="paragraph-xs text-secondary">
          <span className="text-primary">Brand guide:</span> none saved for this workspace yet, so Mia writes from your
          brief alone.{kit ? ` ${kit}` : ''} Add the guide here or in {settings}.
        </p>
        {readOnly ? null : <AddBrandGuide campaignId={campaignId} />}
      </div>
    )
  }
  const edited = brand.edited_in_settings?.length ?? 0
  return (
    <p className="paragraph-xs text-secondary">
      <span className="text-primary">Brand guide:</span> {brand.file || 'from Settings'}
      {brand.uploaded ? `, uploaded ${day(brand.uploaded)}` : ''}
      {edited ? `, ${edited} edit${edited === 1 ? '' : 's'} in Settings` : ''}. Mia reads it whole for the brief, the
      plan, every job’s words and her checks
      {never.length ? `, and sends back any words that use one of the ${never.length} it rules out` : ''}.
      {kit ? ` ${kit}` : ''} {settings}
    </p>
  )
}

const lookLine = (look: BuildState['brand_look'] | null | undefined) => {
  if (!look) return ''
  const has = [
    look.colours ? `${look.colours} colour${look.colours === 1 ? '' : 's'}` : '',
    look.fonts ? 'fonts' : '',
    look.logo ? 'the logo' : '',
  ].filter(Boolean)
  return has.length ? `Their Brand Kit (${has.join(', ')}) goes to the studio with every job.` : ''
}

/** Add the workspace brand guide without leaving the campaign: read and saved as Settings does. */
export function AddBrandGuide({ campaignId, onDone }: { campaignId: string; onDone?: () => void }) {
  const { sessionId, activeWorkspace } = useSession()
  const tenantId = activeWorkspace?.tenant_id
  const queryClient = useQueryClient()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pick = async (file: File | undefined) => {
    if (!file || !sessionId || !tenantId) return
    setBusy(true)
    setError(null)
    try {
      await api.addBrandGuide(sessionId, tenantId, file)
      await queryClient.invalidateQueries({ queryKey: buildKey(tenantId, campaignId) })
      onDone?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That didn’t work. Try again.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="flex flex-col gap-1">
      <label className={`inline-flex w-fit items-center gap-2 ${busy ? 'opacity-60' : 'cursor-pointer'}`}>
        <input
          type="file"
          accept=".pdf,.ppt,.pptx,.doc,.docx,.md,.txt"
          className="sr-only"
          disabled={busy}
          onChange={(e) => {
            void pick(e.target.files?.[0])
            e.target.value = ''
          }}
        />
        <span className="rounded-lg border border-secondary bg-primary px-3 py-1.5 label-sm text-primary hover:bg-secondary">
          {busy ? 'Mia is reading it…' : 'Add brand guide'}
        </span>
      </label>
      {error ? <p className="paragraph-xs text-error">{error}</p> : null}
    </div>
  )
}
