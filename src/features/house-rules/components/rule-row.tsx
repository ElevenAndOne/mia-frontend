import { useState } from 'react'
import { Button } from '../../../components/button'
import type { Decision, HouseRule } from '../types'

/** Plain names for the slop groups: Andrew reads these, not the code's keys. */
const GROUP_LABEL: Record<string, string> = {
  fake_contrarian: 'Fake hot take',
  fake_secret: 'Fake secret',
  fake_credential: 'Fake expertise',
  fake_drama: 'Fake drama',
  throat_clearing: 'Clearing the throat',
  worn_framing: 'Worn-out phrase',
  bait_ask: 'Begging for likes',
  structure: 'Stock shape',
}

const PLATFORM_LABEL: Record<string, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
  google: 'Google',
}

function day(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function safeLink(url: string | null): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null
  } catch {
    return null
  }
}

interface RuleRowProps {
  rule: HouseRule
  busy: boolean
  onDecide: (decision: Decision, note?: string) => void
}

export function RuleRow({ rule, busy, onDecide }: RuleRowProps) {
  const [retiring, setRetiring] = useState(false)
  const [note, setNote] = useState('')
  const isFact = rule.kind === 'platform_fact'
  const link = isFact ? safeLink(rule.source_ref) : null // every seeded line shares one source: noise for the approver
  const details = [
    isFact ? null : GROUP_LABEL[rule.group] ?? 'Other',
    !isFact && rule.applies_to === 'social' ? 'Social posts only' : null,
    !isFact && !rule.phrase ? 'Mia’s writers read this one; the test box can’t check it' : null,
    isFact && rule.confidence ? { official: 'Platform says so', tested: 'Tested', claimed: 'Claimed, not proven' }[rule.confidence] : null,
    isFact && day(rule.last_checked) ? `Checked ${day(rule.last_checked)}` : null,
  ].filter(Boolean) as string[]
  const decided =
    rule.status === 'retired' || rule.status === 'rejected'
      ? [rule.status === 'retired' ? 'Stopped' : 'Rejected', rule.decided_by ? `by ${rule.decided_by}` : null, day(rule.decided_at)]
          .filter(Boolean)
          .join(' ')
      : null

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-secondary bg-primary px-4 py-3 sm:px-5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            {isFact && rule.platform && (
              <span className="rounded-full bg-secondary px-2.5 py-0.5 label-xs text-secondary">
                {PLATFORM_LABEL[rule.platform] ?? rule.platform}
              </span>
            )}
            <span className="subheading-md text-primary break-words">{rule.text}</span>
          </div>
          {(details.length > 0 || link) && (
            <span className="paragraph-sm text-tertiary">
              {details.join(' · ')}
              {link && (
                <>
                  {details.length > 0 && ' · '}
                  <a href={link} target="_blank" rel="noopener noreferrer" className="underline hover:text-secondary">
                    Source
                  </a>
                </>
              )}
            </span>
          )}
          {decided && (
            <span className="paragraph-sm text-tertiary">
              {decided}
              {rule.decision_note ? `: ${rule.decision_note}` : ''}
            </span>
          )}
        </div>

        {rule.status === 'proposed' && (
          <div className="flex gap-2">
            <Button variant="primary" disabled={busy} onClick={() => onDecide('approve')}>
              Approve
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => onDecide('reject')}>
              Reject
            </Button>
          </div>
        )}
        {rule.status === 'active' && !retiring && (
          <Button variant="secondary" disabled={busy} onClick={() => setRetiring(true)}>
            Stop using
          </Button>
        )}
        {rule.status === 'rejected' && (
          <Button variant="secondary" disabled={busy} onClick={() => onDecide('approve')}>
            Bring back
          </Button>
        )}
      </div>

      {rule.status === 'active' && retiring && (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (note.trim()) onDecide('retire', note.trim())
          }}
        >
          <label className="flex min-w-0 flex-[1_1_280px] flex-col gap-1">
            <span className="label-sm text-secondary">Why stop using it? Once stopped it can’t come back.</span>
            <input
              autoFocus
              value={note}
              maxLength={2000}
              onChange={(e) => setNote(e.target.value)}
              className="rounded-lg border border-secondary bg-primary px-3 py-2 paragraph-md text-primary"
              placeholder="For example: our clients use it well"
            />
          </label>
          <Button type="submit" variant="danger" disabled={busy || !note.trim()}>
            Stop using
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setRetiring(false)
              setNote('')
            }}
          >
            Cancel
          </Button>
        </form>
      )}
    </li>
  )
}
