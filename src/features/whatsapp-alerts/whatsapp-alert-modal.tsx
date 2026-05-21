import { useNavigate } from 'react-router-dom'
import { Modal } from '../overlay/components/modal'
import type { WhatsAppAlertData } from './types'

interface WhatsAppAlertModalProps {
  data: WhatsAppAlertData
  onClose: () => void
}

export function WhatsAppAlertModal({ data, onClose }: WhatsAppAlertModalProps) {
  const navigate = useNavigate()

  const handleGoToCampaign = () => {
    onClose()
    navigate('/campaigns')
  }

  return (
    <Modal isOpen onClose={onClose} title="Campaign Alert" size="lg">
      <div className="space-y-5">
        {/* Header */}
        <div>
          <p className="paragraph-sm text-tertiary mb-1">{data.campaign_name}</p>
          <h3 className="subheading-lg text-primary">{data.phase_name} Phase — Behind Target</h3>
        </div>

        {/* Red KPIs */}
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
        <div>
          <h4 className="subheading-md text-primary mb-3">Mia's Recommendations</h4>
          <div className="space-y-3">
            {[data.recommendation_1, data.recommendation_2, data.recommendation_3]
              .filter(Boolean)
              .map((rec, i) => (
                <div
                  key={i}
                  className="flex gap-3 p-4 bg-secondary rounded-xl border border-tertiary"
                >
                  <span className="shrink-0 w-6 h-6 rounded-full bg-brand-solid text-primary-onbrand paragraph-sm font-semibold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <p className="paragraph-sm text-primary leading-relaxed">{rec}</p>
                </div>
              ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={handleGoToCampaign}
            className="flex-1 py-3 px-4 bg-brand-solid text-primary-onbrand rounded-xl subheading-md hover:bg-brand-solid-hover transition-colors"
          >
            View Campaign
          </button>
          <button
            onClick={onClose}
            className="py-3 px-4 border border-primary text-secondary rounded-xl subheading-md hover:bg-tertiary transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </Modal>
  )
}
