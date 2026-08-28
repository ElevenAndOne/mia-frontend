import { useMemo, useState } from 'react'
import { useLinkedContent } from '../../hooks/use-linked-content'
import { channelLabel } from '../../utils/channel-colors'
import type { LinkedContentCandidate, LinkedContentChannel } from '../../types'

interface Props {
  campaignId: string
  onClose: () => void
  onSaved?: () => void
}

interface ContentProps {
  campaignId: string
  onSaved?: () => void
  /** Present when rendered as a slide-over: Save closes it and a Cancel button shows. */
  onClose?: () => void
}

const fmtDate = (iso?: string | null) => {
  if (!iso) return null
  const d = new Date(`${iso}T00:00:00`)
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

const fmtWindow = (start: string | null, end: string | null) =>
  start || end ? `${fmtDate(start) ?? '—'} → ${fmtDate(end) ?? '—'}` : 'no dates set'

// One row: a platform campaign, email send, list or organic post.
const CandidateRow = ({
  candidate,
  checked,
  onToggle,
}: {
  candidate: LinkedContentCandidate
  checked: boolean
  onToggle: () => void
}) => {
  const stat =
    candidate.impressions !== undefined && candidate.impressions > 0
      ? `${candidate.impressions.toLocaleString()} impressions · ${candidate.engagements ?? 0} engagements`
      : candidate.status

  return (
    <button
      onClick={onToggle}
      className="w-full flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-tertiary text-left"
    >
      <div
        className={`w-4 h-4 mt-0.5 rounded border shrink-0 flex items-center justify-center ${
          checked ? 'bg-utility-brand-600 border-utility-brand-600' : 'border-tertiary'
        }`}
      >
        {checked && (
          <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="paragraph-xs text-primary line-clamp-2">{candidate.name}</p>
        <div className="flex items-center gap-2 flex-wrap mt-0.5">
          {stat && <span className="paragraph-xs text-quaternary">{stat}</span>}
          {candidate.suggested && (
            <span className="label-xs px-1.5 py-0.5 rounded bg-utility-brand-100 text-utility-brand-700">
              suggested
            </span>
          )}
          {candidate.dismissed && !checked && (
            <span className="label-xs px-1.5 py-0.5 rounded bg-primary border border-secondary text-quaternary">
              previously rejected
            </span>
          )}
          {candidate.has_stats === false && (
            <span
              className="label-xs text-quaternary"
              title="LinkedIn only reports statistics for the last 12 months — older posts return nothing"
            >
              no stats available
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

const ChannelBlock = ({
  channel,
  selected,
  onToggle,
  onSetAll,
}: {
  channel: LinkedContentChannel
  selected: Set<string>
  onToggle: (id: string) => void
  onSetAll: (ids: string[]) => void
}) => {
  const suggestedIds = channel.candidates.filter((c) => c.suggested).map((c) => c.id)
  // Suggestions first, then anything already linked, then the rest — the things needing
  // a decision are the things the user should not have to scroll for.
  const ordered = useMemo(() => {
    const rank = (c: LinkedContentCandidate) => (c.suggested ? 0 : c.linked ? 1 : 2)
    return [...channel.candidates].sort(
      (a, b) => rank(a) - rank(b) || (b.starts_at ?? '').localeCompare(a.starts_at ?? ''),
    )
  }, [channel.candidates])

  const [expanded, setExpanded] = useState(
    channel.unreviewed_count > 0 || channel.linked_count > 0,
  )
  const visible = expanded ? ordered : ordered.filter((c) => c.suggested || selected.has(c.id))

  return (
    <div className="rounded-xl border border-secondary bg-primary">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-tertiary">
        <div className="min-w-0">
          <p className="label-sm text-primary">{channelLabel(channel.channel)}</p>
          <p className="paragraph-xs text-quaternary">
            {fmtWindow(channel.window_start, channel.window_end)}
            {' · '}
            {selected.size} selected
            {!channel.supports_auto_suggest && ' · no dates to match on'}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {suggestedIds.length > 0 && (
            <button
              onClick={() => onSetAll([...new Set([...selected, ...suggestedIds])])}
              className="label-xs px-2 py-1 rounded-lg bg-utility-brand-600 text-white hover:bg-utility-brand-700"
            >
              Accept {suggestedIds.length}
            </button>
          )}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="label-xs px-2 py-1 rounded-lg border border-tertiary text-secondary hover:bg-tertiary"
          >
            {expanded ? 'Show less' : `Show ${ordered.length}`}
          </button>
        </div>
      </div>

      {channel.message && (
        <p className="paragraph-xs text-quaternary px-3 py-2">{channel.message}</p>
      )}
      {!channel.message && ordered.length === 0 && (
        <p className="paragraph-xs text-quaternary px-3 py-2">Nothing found on this channel</p>
      )}

      <div className="p-1 max-h-72 overflow-y-auto">
        {visible.map((c) => (
          <CandidateRow
            key={c.id}
            candidate={c}
            checked={selected.has(c.id)}
            onToggle={() => onToggle(c.id)}
          />
        ))}
        {!expanded && visible.length === 0 && ordered.length > 0 && (
          <p className="paragraph-xs text-quaternary px-3 py-2">
            Nothing selected or suggested — use “Show {ordered.length}” to link something
            manually.
          </p>
        )}
        {expanded && channel.candidates_truncated && (
          <p className="paragraph-xs text-quaternary px-3 py-2 border-t border-tertiary">
            Showing the {ordered.length} most recent of {channel.candidates_available}. Everything
            suggested or already linked is here; use the channel’s own picker to search the rest.
          </p>
        )}
      </div>
    </div>
  )
}

// Campaign-wide linking. Replaces opening a picker modal per phase × channel: every
// channel is fetched once, the phase dates propose what belongs, and one save writes
// the lot. Layout-agnostic: it is the campaign's "Linked content" tab, and the same
// body inside the slide-over below.
export const LinkedContentContent = ({ campaignId, onSaved, onClose }: ContentProps) => {
  const { data, selection, loading, saving, error, dirty, toggle, setChannel, save } =
    useLinkedContent(campaignId, true)

  const acceptAll = () => {
    if (!data) return
    for (const phase of data.phases) {
      for (const ch of phase.channels) {
        const suggested = ch.candidates.filter((c) => c.suggested).map((c) => c.id)
        if (suggested.length === 0) continue
        setChannel(ch.action_id, [...new Set([...(selection[ch.action_id] ?? []), ...suggested])])
      }
    }
  }

  const onSave = async () => {
    if (await save()) {
      onSaved?.()
      onClose?.()
    }
  }

  const unreviewed = data?.summary.unreviewed_total ?? 0

  return (
    <div className="flex flex-col min-h-0 flex-1">
        {unreviewed > 0 && (
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-utility-brand-100 border-b border-tertiary">
            <p className="paragraph-xs text-utility-brand-700">
              {unreviewed} item{unreviewed === 1 ? '' : 's'} published inside your phase dates
              {unreviewed === 1 ? ' is' : ' are'} not linked yet.
            </p>
            <button
              onClick={acceptAll}
              className="label-xs px-2.5 py-1 rounded-lg bg-utility-brand-600 text-white hover:bg-utility-brand-700 shrink-0"
            >
              Accept all
            </button>
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-5">
          {loading && <p className="paragraph-xs text-tertiary text-center py-8">Loading…</p>}
          {error && <p className="paragraph-xs text-utility-error-500 text-center py-4">{error}</p>}

          {data?.phases.map((phase) => (
            <div key={phase.phase_id} className="space-y-2">
              <div className="flex items-baseline gap-2">
                <p className="label-sm text-primary">{phase.phase_name}</p>
                <p className="paragraph-xs text-quaternary">
                  {fmtWindow(phase.start_date, phase.end_date)}
                </p>
              </div>
              {phase.channels.length === 0 && (
                <p className="paragraph-xs text-quaternary">No channels on this phase</p>
              )}
              {phase.channels.map((ch) => (
                <ChannelBlock
                  key={ch.action_id}
                  channel={ch}
                  selected={selection[ch.action_id] ?? new Set<string>()}
                  onToggle={(id) => toggle(ch.action_id, id)}
                  onSetAll={(ids) => setChannel(ch.action_id, ids)}
                />
              ))}
            </div>
          ))}

          {data?.notes.map((note) => (
            <p key={note} className="paragraph-xs text-quaternary border-t border-tertiary pt-3">
              {note}
            </p>
          ))}
        </div>

        <div className="flex items-center gap-2 p-4 border-t border-tertiary">
          <p className="paragraph-xs text-quaternary flex-1">
            {data ? `${data.summary.linked_total} linked` : ''}
            {dirty ? ' · unsaved changes' : ''}
          </p>
          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-2 rounded-lg border border-tertiary paragraph-sm text-secondary hover:bg-tertiary"
            >
              Cancel
            </button>
          )}
          <button
            onClick={onSave}
            disabled={saving || !dirty}
            className="px-4 py-2 rounded-lg bg-utility-brand-600 paragraph-sm text-white hover:bg-utility-brand-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
    </div>
  )
}

// Slide-over wrapper, kept for any caller that still wants linking as an overlay.
export const LinkedContentPanel = ({ campaignId, onClose, onSaved }: Props) => (
  <div className="campaign-workspace fixed inset-0 z-50 flex justify-end bg-black/60" onClick={onClose}>
    <div
      className="bg-secondary w-full max-w-2xl h-full flex flex-col border-l border-secondary shadow-xl"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-start justify-between gap-3 p-4 border-b border-tertiary">
        <div className="min-w-0">
          <p className="label-sm text-primary">Linked content</p>
          <p className="paragraph-xs text-quaternary mt-0.5">
            What counts towards this campaign’s KPIs. Anything not linked is not measured.
          </p>
        </div>
        <button onClick={onClose} className="text-quaternary hover:text-secondary shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <LinkedContentContent campaignId={campaignId} onSaved={onSaved} onClose={onClose} />
    </div>
  </div>
)
