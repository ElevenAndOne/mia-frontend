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
  tenantId?: string | null
  /** When false (analyst/viewer), the page renders read-only — no upload/generate/edit affordances. */
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

function GlobeIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  )
}

export function MarketingContextPage({ sessionId, tenantId, canManage = true }: Props) {
  const {
    context,
    loading,
    uploadStep,
    uploadResult,
    editedFields,
    snapshotRefreshing,
    competitorSearching,
    isGenerating,
    generateHasExisting,
    generateExistingFilename,
    handleFileSelect,
    handleGenerateFromWebsite,
    handleFieldChange,
    handleSaveExtraction,
    handleSaveOverrides,
    handleRefreshSnapshot,
    handleFindCompetitors,
    handleCancelUpload,
  } = useMarketingContext(sessionId, tenantId)

  const [editingOverrides, setEditingOverrides] = useState(false)
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [showGenerateInput, setShowGenerateInput] = useState(false)

  const handleGenerateSubmit = async () => {
    const url = websiteUrl.trim()
    if (!url) return
    setShowGenerateInput(false)
    setWebsiteUrl('')
    await handleGenerateFromWebsite(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    )
  }

  // --- Upload / generate / preview flow ---
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
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-secondary">
            <Spinner />
            <p className="paragraph-sm">
              {isGenerating
                ? 'Crawling website and generating brand guide — this may take a moment…'
                : 'Reading brand guide — this may take up to a minute for large files…'}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-tertiary bg-primary p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success-subtle">
                <svg className="h-4 w-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="subheading-sm text-primary">
                  {isGenerating
                    ? `Generated from ${uploadResult?.filename?.replace('[Generated from ', '').replace(']', '')}`
                    : `Extracted from ${uploadResult?.filename}`}
                </p>
                <p className="paragraph-xs text-secondary">Review and edit the fields below before saving</p>
              </div>
            </div>

            {isGenerating && generateHasExisting && (
              <div className="mb-4 flex items-start gap-2 rounded-lg bg-warning-subtle border border-warning px-3 py-2.5">
                <svg className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                <p className="paragraph-xs text-warning-foreground">
                  This will replace your existing brand guide
                  {generateExistingFilename ? ` (${generateExistingFilename})` : ''}.
                </p>
              </div>
            )}

            <ContextFieldsEditor
              fields={editedFields}
              onChange={handleFieldChange}
              onSave={handleSaveExtraction}
              onCancel={handleCancelUpload}
              saving={uploadStep === 'saving'}
              saveLabel={isGenerating && generateHasExisting ? 'Replace brand guide' : 'Save brand guide'}
            />
          </div>
        )}
      </div>
    )
  }

  // --- Empty state: no brand guide yet ---
  if (!context?.has_context && uploadStep === 'idle') {
    if (!canManage) {
      return (
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="heading-sm text-primary">Marketing Context</h2>
            <p className="paragraph-sm text-secondary mt-1">
              No brand guide has been set up for this workspace yet.
            </p>
          </div>
        </div>
      )
    }
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

        {/* OR divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 border-t border-tertiary" />
          <span className="paragraph-xs text-tertiary">or</span>
          <div className="flex-1 border-t border-tertiary" />
        </div>

        {/* Generate from website */}
        <div className="rounded-xl border border-tertiary bg-secondary p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="text-secondary">
              <GlobeIcon />
            </div>
            <p className="subheading-sm text-primary">Generate from your website</p>
          </div>
          <p className="paragraph-xs text-secondary mb-4">
            Don't have a brand guide PDF? Enter your client's website URL and Mia will crawl it
            and generate one automatically.
          </p>
          <div className="flex gap-2">
            <input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleGenerateSubmit() }}
              placeholder="https://www.clientwebsite.co.za"
              className="flex-1 rounded-lg border border-tertiary bg-primary px-3 py-2 paragraph-sm text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-brand-solid"
            />
            <Button
              variant="primary"
              size="sm"
              onClick={handleGenerateSubmit}
              disabled={!websiteUrl.trim()}
            >
              Generate
            </Button>
          </div>
        </div>

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
        {canManage && (
          <BrandGuideUpload
            uploadStep={uploadStep}
            existingFilename={context?.brand_guide_filename ?? null}
            onFileSelect={handleFileSelect}
          />
        )}
      </div>

      {/* Brand context fields */}
      <div className="rounded-xl border border-tertiary bg-primary">
        <div className="flex items-center justify-between px-5 py-4 border-b border-tertiary">
          <p className="subheading-sm text-primary">Brand Context</p>
          {canManage && !editingOverrides && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleFindCompetitors}
                disabled={competitorSearching}
              >
                {competitorSearching ? <Spinner size="sm" /> : 'Find Competitors'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowGenerateInput((v) => !v)}
              >
                <span className="flex items-center gap-1.5">
                  <GlobeIcon />
                  Generate
                </span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingOverrides(true)}
              >
                Edit
              </Button>
            </div>
          )}
        </div>

        {/* Inline generate URL input (loaded state) */}
        {canManage && showGenerateInput && !editingOverrides && (
          <div className="px-5 py-3 border-b border-tertiary bg-secondary flex items-center gap-2">
            <input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleGenerateSubmit() }}
              placeholder="https://www.clientwebsite.co.za"
              className="flex-1 rounded-lg border border-tertiary bg-primary px-3 py-1.5 paragraph-sm text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-brand-solid"
              autoFocus
            />
            <Button
              variant="primary"
              size="sm"
              onClick={handleGenerateSubmit}
              disabled={!websiteUrl.trim()}
            >
              Generate
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setShowGenerateInput(false); setWebsiteUrl('') }}
            >
              Cancel
            </Button>
          </div>
        )}

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
          {canManage && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefreshSnapshot}
              disabled={snapshotRefreshing}
            >
              {snapshotRefreshing ? <Spinner /> : 'Refresh'}
            </Button>
          )}
        </div>
        <div className="p-5">
          {Object.keys(context?.platform_snapshot ?? {}).length === 0 ? (
            <p className="paragraph-sm text-secondary">
              No platform data yet.{canManage ? ' ' : ''}
              {canManage && (
                <>
                  <button
                    className="text-brand-solid underline"
                    onClick={handleRefreshSnapshot}
                  >
                    Refresh now
                  </button>{' '}
                  to pull current performance baselines.
                </>
              )}
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
