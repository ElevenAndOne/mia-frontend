import { useCallback, useRef } from 'react'
import { Button } from '../../../components/button'
import { Spinner } from '../../../components/spinner'
import type { CampaignUploadStep } from '../hooks/use-campaign-guides'

interface Props {
  uploadStep: CampaignUploadStep
  onFileSelect: (file: File) => void
}

// The formats the backend reads (services/campaign_builder/deck.py): the same as the campaign builder's upload.
const GUIDE_TYPES = '.pdf,.pptx,.docx,.md,.markdown,.txt,.html,.htm'
const isGuide = (f: File) => /\.(pdf|pptx|docx|md|markdown|txt|html?)$/i.test(f.name)

export function CampaignGuideUpload({ uploadStep, onFileSelect }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      const file = e.dataTransfer.files[0]
      if (file && isGuide(file)) {
        onFileSelect(file)
      }
    },
    [onFileSelect]
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) onFileSelect(file)
      e.target.value = ''
    },
    [onFileSelect]
  )

  if (uploadStep === 'uploading') {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-10 text-secondary">
        <Spinner />
        <p className="paragraph-sm">Reading campaign guide — this may take up to a minute...</p>
      </div>
    )
  }

  return (
    <div
      className="flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-tertiary p-10 text-center transition-colors hover:border-brand-solid hover:bg-secondary cursor-pointer"
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={GUIDE_TYPES}
        className="hidden"
        onChange={handleChange}
      />
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
        <svg className="h-6 w-6 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <div>
        <p className="subheading-md text-primary">Add campaign guide</p>
        <p className="paragraph-sm text-secondary mt-1">Drag and drop a PDF, PowerPoint, Word, Markdown, web page or text file, or click to browse</p>
      </div>
      <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); inputRef.current?.click() }}>
        Choose file
      </Button>
    </div>
  )
}
