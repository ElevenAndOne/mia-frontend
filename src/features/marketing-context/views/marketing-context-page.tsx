import { useState } from 'react'
import { Button } from '../../../components/button'
import { Spinner } from '../../../components/spinner'
import { useMarketingContext } from '../hooks/use-marketing-context'
import type { BrandGuideExtracted } from '../types'
import { FIELD_LABELS } from '../types'
import { BrandGuideUpload } from './brand-guide-upload'
import { ContextFieldsEditor } from './context-fields-editor'

interface Props {
  sessionId: string | null
}

function timeAgo(isoString: string): string {
  const ms = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function MarketingContextPage({ sessionId }: Props) {
  const {
    context,
    loading,
    uploadStep,
    uploadResult,
    editedFields,
    snapshotRefreshing,
    handleFileSelect,
    handleFieldChange,
    handleSaveExtraction,
    handleSaveOverrides,
    handleRefreshSnapshot,
    handleCancelUpload,
  } = useMarketingContext(sessionId)

  const [editingOverrides, setEditingOverrides] = useState(false)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    )
  }

  // --- Upload / preview flow ---
  if (uploadStep === 'uploading' || uploadStep === 'preview' || uploadStep === 'saving') {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="heading-sm text-primary">Brand Guide</h2>
          <p className="paragraph-sm text-secondary mt-1">
            Review the extracted information below and correct anything that looks off.
          </p>
        </div>

        {uploadStep === 'uploading' ? (
          <BrandGuideUpload
            uploadStep={uploadStep}
            existingFilename={context?.brand_guide_filename ?? null}
            onFileSelect={handleFileSelect}
          />
        ) : (
          <div className="rounded-xl border border-tertiary bg-primary p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success-subtle">
                <svg className="h-4 w-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="subheading-sm text-primary">Extracted from {uploadResult?.filename}</p>
                <p className="paragraph-xs text-secondary">Review and edit the fields below before saving</p>
              </div>
            </div>
            <ContextFieldsEditor
              fields={editedFields}
              onChange={handleFieldChange}
              onSave={handleSaveExtraction}
              onCancel={handleCancelUpload}
              saving={uploadStep === 'saving'}
              saveLabel="Save brand guide"
            />
          </div>
        )}
      </div>
    )
  }

  // --- Empty state: no brand guide uploaded yet ---
  if (!context?.has_context && uploadStep === 'idle') {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="heading-sm text-primary">Marketing Context</h2>
          <p className="paragraph-sm text-secondary mt-1">
            Upload your client's brand guide to personalise all AI responses with their specific
            brand voice, audience, and goals.
          </p>
        </div>

        <BrandGuideUpload
          uploadStep={uploadStep}
          existingFilename={null}
          onFileSelect={handleFileSelect}
        />

        <div className="rounded-xl border border-tertiary bg-secondary p-5">
          <p className="subheading-sm text-primary mb-2">What gets extracted automatically</p>
          <ul className="grid grid-cols-2 gap-1">
            {Object.values(FIELD_LABELS).map((label) => (
              <li key={label} className="flex items-center gap-2 paragraph-xs text-secondary">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-solid flex-shrink-0" />
                {label}
              </li>
            ))}
          </ul>
        </div>
      </div>
    )
  }

  // --- Loaded state: brand guide exists ---
  const mergedFields: Partial<BrandGuideExtracted> = {
    ...(context?.brand_guide_extracted ?? {}),
    ...(context?.manual_overrides ?? {}),
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="heading-sm text-primary">Marketing Context</h2>
          <p className="paragraph-xs text-tertiary mt-0.5">
            {context?.brand_guide_filename
              ? `From ${context.brand_guide_filename}`
              : 'Manually configured'}
            {context?.brand_guide_uploaded_at && ` · uploaded ${timeAgo(context.brand_guide_uploaded_at)}`}
          </p>
        </div>
        <BrandGuideUpload
          uploadStep={uploadStep}
          existingFilename={context?.brand_guide_filename ?? null}
          onFileSelect={handleFileSelect}
        />
      </div>

      {/* Brand context fields */}
      <div className="rounded-xl border border-tertiary bg-primary">
        <div className="flex items-center justify-between px-5 py-4 border-b border-tertiary">
          <p className="subheading-sm text-primary">Brand Context</p>
          {!editingOverrides && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditingOverrides(true)
              }}
            >
              Edit
            </Button>
          )}
        </div>

        <div className="p-5">
          {editingOverrides ? (
            <ContextFieldsEditor
              fields={mergedFields}
              onChange={handleFieldChange}
              onSave={async () => {
                await handleSaveOverrides()
                setEditingOverrides(false)
              }}
              onCancel={() => setEditingOverrides(false)}
              saveLabel="Save changes"
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {(Object.keys(FIELD_LABELS) as Array<keyof BrandGuideExtracted>).map((key) => {
                const value = mergedFields[key]
                if (!value || (Array.isArray(value) && value.length === 0)) return null
                const displayValue = Array.isArray(value) ? value.join(', ') : value
                return (
                  <div key={key}>
                    <p className="paragraph-xs font-medium text-tertiary uppercase tracking-wide">
                      {FIELD_LABELS[key]}
                    </p>
                    <p className="paragraph-sm text-primary mt-0.5 line-clamp-3">{displayValue}</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Platform snapshot */}
      <div className="rounded-xl border border-tertiary bg-primary">
        <div className="flex items-center justify-between px-5 py-4 border-b border-tertiary">
          <div>
            <p className="subheading-sm text-primary">Performance Baselines</p>
            <p className="paragraph-xs text-tertiary mt-0.5">
              {context?.platform_snapshot_updated_at
                ? `Last updated ${timeAgo(context.platform_snapshot_updated_at)}`
                : 'Not yet refreshed'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefreshSnapshot}
            disabled={snapshotRefreshing}
          >
            {snapshotRefreshing ? <Spinner /> : 'Refresh'}
          </Button>
        </div>
        <div className="p-5">
          {Object.keys(context?.platform_snapshot ?? {}).length === 0 ? (
            <p className="paragraph-sm text-secondary">
              No platform data yet.{' '}
              <button
                className="text-brand-solid underline"
                onClick={handleRefreshSnapshot}
              >
                Refresh now
              </button>{' '}
              to pull current performance baselines.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(context?.platform_snapshot ?? {}).map(([platform, data]) => {
                if (!data) return null
                return (
                  <div key={platform} className="rounded-lg border border-tertiary bg-secondary p-3">
                    <p className="paragraph-xs font-medium text-secondary uppercase tracking-wide mb-2">
                      {platform.replace('_', ' ')}
                    </p>
                    {Object.entries(data).map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-2">
                        <span className="paragraph-xs text-tertiary">{k.replace(/_/g, ' ')}</span>
                        <span className="paragraph-xs text-primary font-medium">
                          {v != null ? String(v) : '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
