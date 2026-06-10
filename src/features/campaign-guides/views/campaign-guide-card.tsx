import { Spinner } from '../../../components/spinner'
import type { CampaignGuide } from '../types'

interface Props {
  guide: CampaignGuide
  deleting: boolean
  onDelete: (id: string) => void
  canManage?: boolean
}

function timeAgo(isoString: string): string {
  const ms = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function Chips({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {items.map((item) => (
        <span key={item} className="px-2 py-0.5 rounded-full bg-secondary border border-tertiary paragraph-xs text-secondary">
          {item}
        </span>
      ))}
    </div>
  )
}

export function CampaignGuideCard({ guide, deleting, onDelete, canManage = true }: Props) {
  const d = guide.extracted_data
  const uploadedAt = guide.uploaded_at ?? guide.created_at

  return (
    <div className="rounded-xl border border-tertiary bg-primary overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-tertiary">
        <div className="min-w-0">
          <p className="subheading-sm text-primary truncate">
            {d?.campaign_name ?? guide.filename}
          </p>
          <p className="paragraph-xs text-tertiary mt-0.5">
            {guide.filename}
            {uploadedAt && ` · uploaded ${timeAgo(uploadedAt)}`}
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => onDelete(guide.id)}
            disabled={deleting}
            className="shrink-0 px-3 py-1.5 border border-primary rounded-lg paragraph-sm text-error hover:bg-error-primary transition-colors disabled:opacity-50"
          >
            {deleting ? <Spinner size="sm" /> : 'Delete'}
          </button>
        )}
      </div>

      {/* Body */}
      <div className="p-5 flex flex-col gap-4">
        {/* Top meta row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {d?.period && (
            <div>
              <p className="paragraph-xs font-medium text-tertiary uppercase tracking-wide">Period</p>
              <p className="paragraph-sm text-primary mt-0.5">{d.period}</p>
            </div>
          )}
          {d?.tagline && (
            <div>
              <p className="paragraph-xs font-medium text-tertiary uppercase tracking-wide">Tagline</p>
              <p className="paragraph-sm text-primary mt-0.5">{d.tagline}</p>
            </div>
          )}
          {d?.target_audience && (
            <div>
              <p className="paragraph-xs font-medium text-tertiary uppercase tracking-wide">Target Audience</p>
              <p className="paragraph-sm text-primary mt-0.5">{d.target_audience}</p>
            </div>
          )}
          {d?.content_themes && (
            <div>
              <p className="paragraph-xs font-medium text-tertiary uppercase tracking-wide">Content Themes</p>
              <p className="paragraph-sm text-primary mt-0.5 line-clamp-3">{d.content_themes}</p>
            </div>
          )}
        </div>

        {/* Channels + formats */}
        {(d?.channels?.length || d?.content_formats?.length) ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {d?.channels?.length ? (
              <div>
                <p className="paragraph-xs font-medium text-tertiary uppercase tracking-wide">Channels</p>
                <Chips items={d.channels} />
              </div>
            ) : null}
            {d?.content_formats?.length ? (
              <div>
                <p className="paragraph-xs font-medium text-tertiary uppercase tracking-wide">Content Formats</p>
                <Chips items={d.content_formats} />
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Key messages */}
        {d?.key_messages?.length ? (
          <div>
            <p className="paragraph-xs font-medium text-tertiary uppercase tracking-wide mb-1">Key Messages</p>
            <ul className="flex flex-col gap-1">
              {d.key_messages.map((msg, i) => (
                <li key={i} className="flex items-start gap-2 paragraph-sm text-primary">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-brand-solid flex-shrink-0" />
                  {msg}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* Objectives */}
        {d?.objectives?.length ? (
          <div>
            <p className="paragraph-xs font-medium text-tertiary uppercase tracking-wide mb-2">Objectives</p>
            <div className="flex flex-col gap-2">
              {d.objectives.map((obj, i) => (
                <div key={i} className="rounded-lg bg-secondary border border-tertiary p-3">
                  <p className="subheading-xs text-primary">{obj.title}</p>
                  {obj.intention && <p className="paragraph-xs text-secondary mt-1">{obj.intention}</p>}
                  {obj.outcome && (
                    <p className="paragraph-xs text-tertiary mt-1">
                      <span className="font-medium">Expected: </span>{obj.outcome}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Tone + visual */}
        {(d?.emotional_tone || d?.visual_references || d?.color_palette) && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {d?.emotional_tone && (
              <div>
                <p className="paragraph-xs font-medium text-tertiary uppercase tracking-wide">Emotional Tone</p>
                <p className="paragraph-sm text-primary mt-0.5">{d.emotional_tone}</p>
              </div>
            )}
            {d?.color_palette && (
              <div>
                <p className="paragraph-xs font-medium text-tertiary uppercase tracking-wide">Colour Direction</p>
                <p className="paragraph-sm text-primary mt-0.5">{d.color_palette}</p>
              </div>
            )}
            {d?.visual_references && (
              <div className="sm:col-span-2">
                <p className="paragraph-xs font-medium text-tertiary uppercase tracking-wide">Visual Style</p>
                <p className="paragraph-sm text-primary mt-0.5 line-clamp-2">{d.visual_references}</p>
              </div>
            )}
          </div>
        )}

        {/* Activation mechanics */}
        {d?.activation_mechanics && (
          <div>
            <p className="paragraph-xs font-medium text-tertiary uppercase tracking-wide">Activations & Mechanics</p>
            <p className="paragraph-sm text-primary mt-0.5 line-clamp-3">{d.activation_mechanics}</p>
          </div>
        )}

        {/* Strategic insights */}
        {d?.strategic_insights && (
          <div>
            <p className="paragraph-xs font-medium text-tertiary uppercase tracking-wide">Strategic Insights</p>
            <p className="paragraph-sm text-primary mt-0.5 line-clamp-3">{d.strategic_insights}</p>
          </div>
        )}

        {/* Key events */}
        {d?.key_events?.length ? (
          <div>
            <p className="paragraph-xs font-medium text-tertiary uppercase tracking-wide mb-2">Key Events</p>
            <div className="flex flex-col gap-2">
              {d.key_events.map((evt, i) => (
                <div key={i} className="rounded-lg bg-secondary border border-tertiary p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="subheading-xs text-primary">{evt.name}</p>
                    {evt.date && <p className="paragraph-xs text-tertiary shrink-0">{evt.date}</p>}
                  </div>
                  {evt.alignment && <p className="paragraph-xs text-secondary mt-1">{evt.alignment}</p>}
                  {evt.participation && (
                    <p className="paragraph-xs text-tertiary mt-0.5">{evt.participation}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
