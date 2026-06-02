import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Modal } from '../overlay/components/modal'
import type { WhatsAppAlertData } from './types'

interface WhatsAppAlertModalProps {
  data: WhatsAppAlertData
  onSnooze: () => void  // backdrop, X, Remind Me Later — re-shows after 24h
  onDismiss: () => void // permanent hide
}

function parseRecommendation(rec: string): { title: string; body: string } {
  const parts = rec.split('\n\n')
  if (parts.length >= 2) {
    return {
      title: parts[0].replace(/^\*\*|\*\*$/g, '').trim(),
      body: parts.slice(1).join('\n\n').trim(),
    }
  }
  return { title: '', body: rec }
}

export function WhatsAppAlertModal({ data, onSnooze, onDismiss }: WhatsAppAlertModalProps) {
  const navigate = useNavigate()
  const [expandedRecs, setExpandedRecs] = useState<Set<number>>(new Set())

  const recs = [data.recommendation_1, data.recommendation_2, data.recommendation_3].filter(Boolean)

  const toggleRec = (i: number) => {
    setExpandedRecs((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  const handleGoToCampaign = () => {
    onDismiss()
    navigate('/campaigns')
  }

  return (
    <Modal isOpen onClose={onSnooze} title="Campaign Alert" size="xl">
      <div className="px-6 pt-5 pb-6 space-y-5">
        {/* Campaign / phase header */}
        <div>
          <p className="paragraph-sm text-tertiary mb-1">{data.campaign_name}</p>
          <h3 className="subheading-lg text-primary">{data.phase_name} Phase — Behind Target</h3>
        </div>

        {/* Red KPI badges */}
        {data.red_kpi_names.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {data.red_kpi_names.map((kpi) => (
              <span
                key={kpi}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-error-primary border border-error-subtle rounded-full paragraph-sm text-error"
              >
                <span className="w-2 h-2 rounded-full bg-error shrink-0" />
                {kpi}
              </span>
            ))}
          </div>
        )}

        {/* Recommendations */}
        {recs.length > 0 && (
          <div>
            <h4 className="subheading-md text-primary mb-3">Mia's Recommendations</h4>
            <div className="space-y-3">
              {recs.map((rec, i) => {
                const { title, body } = parseRecommendation(rec)
                const isExpanded = expandedRecs.has(i)

                return (
                  <div
                    key={i}
                    className="p-4 bg-secondary rounded-xl border border-tertiary"
                  >
                    <div className="flex gap-3 mb-2">
                      <span className="shrink-0 w-6 h-6 rounded-full bg-brand-solid text-primary-onbrand paragraph-sm font-semibold flex items-center justify-center">
                        {i + 1}
                      </span>
                      {title ? (
                        <p className="subheading-sm text-primary">{title}</p>
                      ) : (
                        // Legacy format (no title) — show number only, body below
                        <span />
                      )}
                    </div>

                    <div className={!isExpanded ? 'line-clamp-2' : ''}>
                      <p className="paragraph-sm text-secondary leading-relaxed">{body || rec}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleRec(i)}
                      className="mt-2 paragraph-sm text-tertiary hover:text-primary transition-colors"
                    >
                      {isExpanded ? 'Read less' : 'Read more'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={handleGoToCampaign}
            className="w-full py-3 px-4 bg-brand-solid text-primary-onbrand rounded-xl subheading-md hover:bg-brand-solid-hover transition-colors"
          >
            View Campaign
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onSnooze}
              className="flex-1 py-2.5 px-4 border border-primary text-secondary rounded-xl subheading-sm hover:bg-tertiary transition-colors"
            >
              Remind Me Later
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className="py-2.5 px-4 text-tertiary rounded-xl subheading-sm hover:bg-tertiary hover:text-secondary transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
