import { Button } from '../../../components/button'
import { Spinner } from '../../../components/spinner'
import { useCampaignGuides } from '../hooks/use-campaign-guides'
import type { CampaignGuideExtracted } from '../types'
import { CampaignGuideCard } from './campaign-guide-card'
import { CampaignGuideUpload } from './campaign-guide-upload'

interface Props {
  sessionId: string | null
  tenantId?: string | null
}

function PreviewField({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div>
      <p className="paragraph-xs font-medium text-tertiary uppercase tracking-wide">{label}</p>
      <p className="paragraph-sm text-primary mt-0.5">{value}</p>
    </div>
  )
}

function PreviewChips({ label, items }: { label: string; items: string[] | null | undefined }) {
  if (!items?.length) return null
  return (
    <div>
      <p className="paragraph-xs font-medium text-tertiary uppercase tracking-wide mb-1">{label}</p>
      <div className="flex flex-wrap gap-1">
        {items.map((item) => (
          <span key={item} className="px-2 py-0.5 rounded-full bg-secondary border border-tertiary paragraph-xs text-secondary">
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}

function ExtractionPreview({ extracted }: { extracted: CampaignGuideExtracted }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <PreviewField label="Campaign Name" value={extracted.campaign_name} />
        <PreviewField label="Period" value={extracted.period} />
        <PreviewField label="Tagline" value={extracted.tagline} />
        <PreviewField label="Target Audience" value={extracted.target_audience} />
        <PreviewField label="Content Themes" value={extracted.content_themes} />
      </div>

      <PreviewChips label="Channels" items={extracted.channels} />
      <PreviewChips label="Content Formats" items={extracted.content_formats} />

      {extracted.key_messages?.length ? (
        <div>
          <p className="paragraph-xs font-medium text-tertiary uppercase tracking-wide mb-1">Key Messages</p>
          <ul className="flex flex-col gap-1">
            {extracted.key_messages.map((msg, i) => (
              <li key={i} className="flex items-start gap-2 paragraph-sm text-primary">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-brand-solid flex-shrink-0" />
                {msg}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {extracted.objectives?.length ? (
        <div>
          <p className="paragraph-xs font-medium text-tertiary uppercase tracking-wide mb-2">Objectives</p>
          <div className="flex flex-col gap-2">
            {extracted.objectives.map((obj, i) => (
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

      {extracted.key_events?.length ? (
        <div>
          <p className="paragraph-xs font-medium text-tertiary uppercase tracking-wide mb-2">Key Events</p>
          <div className="flex flex-col gap-2">
            {extracted.key_events.map((evt, i) => (
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
  )
}

export function CampaignGuidesPage({ sessionId, tenantId }: Props) {
  const {
    guides,
    loading,
    uploadStep,
    uploadResult,
    deleting,
    handleFileSelect,
    handleSave,
    handleCancel,
    handleDelete,
  } = useCampaignGuides(sessionId, tenantId)

  // Upload in progress
  if (uploadStep === 'uploading') {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="heading-sm text-primary">Campaign Guides</h2>
          <p className="paragraph-sm text-secondary mt-1">Extracting campaign data from your PDF...</p>
        </div>
        <CampaignGuideUpload uploadStep="uploading" onFileSelect={handleFileSelect} />
      </div>
    )
  }

  // Preview / saving
  if ((uploadStep === 'preview' || uploadStep === 'saving') && uploadResult) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="heading-sm text-primary">Campaign Guides</h2>
          <p className="paragraph-sm text-secondary mt-1">
            Review the extracted information below before saving.
          </p>
        </div>

        <div className="rounded-xl border border-tertiary bg-primary p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success-subtle">
              <svg className="h-4 w-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="subheading-sm text-primary">Extracted from {uploadResult.filename}</p>
              <p className="paragraph-xs text-secondary">Read-only preview — edit fields after saving</p>
            </div>
          </div>

          <ExtractionPreview extracted={uploadResult.extracted} />

          <div className="flex items-center gap-3 mt-6 pt-4 border-t border-tertiary">
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={uploadStep === 'saving'}
            >
              {uploadStep === 'saving' ? <Spinner size="sm" /> : 'Save campaign guide'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              disabled={uploadStep === 'saving'}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Idle state
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="heading-sm text-primary">Campaign Guides</h2>
        <p className="paragraph-sm text-secondary mt-1">
          Upload campaign PDFs to extract objectives, channels, key messages, and events.
          Multiple active campaigns are supported.
        </p>
      </div>

      <CampaignGuideUpload uploadStep="idle" onFileSelect={handleFileSelect} />

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner size="md" variant="dark" />
        </div>
      ) : guides.length === 0 ? (
        <div className="rounded-xl border border-tertiary bg-secondary p-5 text-center">
          <p className="paragraph-sm text-secondary">No campaign guides yet. Upload your first one above.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {guides.map((guide) => (
            <CampaignGuideCard
              key={guide.id}
              guide={guide}
              deleting={deleting === guide.id}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}
