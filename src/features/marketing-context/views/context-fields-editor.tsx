import { useState } from 'react'
import { Button } from '../../../components/button'
import type { BrandGuideExtracted } from '../types'
import { ARRAY_FIELDS, FIELD_LABELS } from '../types'

interface Props {
  fields: Partial<BrandGuideExtracted>
  onChange: (key: keyof BrandGuideExtracted, value: string | string[]) => void
  onSave: () => void
  onCancel?: () => void
  saving?: boolean
  saveLabel?: string
  cancelLabel?: string
}

export function ContextFieldsEditor({
  fields,
  onChange,
  onSave,
  onCancel,
  saving = false,
  saveLabel = 'Save changes',
  cancelLabel = 'Cancel',
}: Props) {
  const allKeys = Object.keys(FIELD_LABELS) as Array<keyof BrandGuideExtracted>

  // Local raw string state for array fields — lets users type commas and spaces freely.
  // We only parse (trim + filter) when the field loses focus.
  const [rawInputs, setRawInputs] = useState<Partial<Record<keyof BrandGuideExtracted, string>>>(
    () => {
      const init: Partial<Record<keyof BrandGuideExtracted, string>> = {}
      for (const key of allKeys) {
        if (ARRAY_FIELDS.includes(key)) {
          const val = fields[key]
          init[key] = Array.isArray(val) ? val.join(', ') : ''
        }
      }
      return init
    }
  )

  const handleArrayChange = (key: keyof BrandGuideExtracted, raw: string) => {
    setRawInputs((prev) => ({ ...prev, [key]: raw }))
    // Pass unparsed split to parent so the displayed tag list stays roughly in sync
    onChange(key, raw.split(',').map((s) => s.trim()).filter(Boolean))
  }

  const handleArrayBlur = (key: keyof BrandGuideExtracted) => {
    const raw = rawInputs[key] ?? ''
    const cleaned = raw.split(',').map((s) => s.trim()).filter(Boolean)
    // Normalise the raw display string to remove stray leading/trailing commas
    setRawInputs((prev) => ({ ...prev, [key]: cleaned.join(', ') }))
    onChange(key, cleaned)
  }

  return (
    <div className="flex flex-col gap-5">
      {allKeys.map((key) => {
        const label = FIELD_LABELS[key]
        const isArray = ARRAY_FIELDS.includes(key)
        const rawValue = fields[key]

        // Array fields use local rawInputs; scalar fields derive from props directly
        const displayValue = isArray
          ? (rawInputs[key] ?? '')
          : typeof rawValue === 'string' ? rawValue : ''

        return (
          <div key={key} className="flex flex-col gap-1.5">
            <label className="paragraph-sm font-medium text-primary">{label}</label>
            {key === 'problems_solved' || key === 'key_differentiators' || key === 'target_audience' ? (
              <textarea
                className="w-full rounded-lg border border-tertiary bg-primary px-3 py-2 paragraph-sm text-primary placeholder:text-tertiary focus:outline-none focus:ring-1 focus:ring-brand-solid resize-none"
                rows={3}
                value={displayValue}
                placeholder={isArray ? 'Separate multiple with commas' : `Enter ${label.toLowerCase()}...`}
                onChange={(e) => {
                  isArray
                    ? handleArrayChange(key, e.target.value)
                    : onChange(key, e.target.value)
                }}
                onBlur={isArray ? () => handleArrayBlur(key) : undefined}
              />
            ) : (
              <input
                type="text"
                className="w-full rounded-lg border border-tertiary bg-primary px-3 py-2 paragraph-sm text-primary placeholder:text-tertiary focus:outline-none focus:ring-1 focus:ring-brand-solid"
                value={displayValue}
                placeholder={isArray ? 'Separate multiple with commas' : `Enter ${label.toLowerCase()}...`}
                onChange={(e) => {
                  isArray
                    ? handleArrayChange(key, e.target.value)
                    : onChange(key, e.target.value)
                }}
                onBlur={isArray ? () => handleArrayBlur(key) : undefined}
              />
            )}
            {isArray && (
              <p className="paragraph-xs text-tertiary">Separate multiple entries with commas</p>
            )}
          </div>
        )
      })}

      <div className="flex justify-end gap-3 pt-2 border-t border-tertiary">
        {onCancel && (
          <Button variant="ghost" onClick={onCancel} disabled={saving}>
            {cancelLabel}
          </Button>
        )}
        <Button variant="primary" onClick={onSave} disabled={saving}>
          {saving ? 'Saving...' : saveLabel}
        </Button>
      </div>
    </div>
  )
}
