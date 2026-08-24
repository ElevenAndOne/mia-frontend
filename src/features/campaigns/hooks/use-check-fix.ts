import { useState } from 'react'
import { hasUtm, parseLines } from '../utils/launch-check-fixes'
import type { FixSpec } from '../utils/launch-check-fixes'
import type { Asset } from '../types'
import type { FixHandlers } from '../components/builder/launch-check-row'

// The editing state behind one checklist row's fix, and the single save that knows
// which kind writes where. Split out of launch-check-row.tsx so the row stays
// presentation (verdict, waiver line, buttons) and this owns the mechanics.
export function useCheckFix(
  spec: FixSpec | undefined,
  notReady: Asset[],
  assetIds: string[],
  fixes?: FixHandlers,
) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [value, setValue] = useState('')
  const [descriptions, setDescriptions] = useState('')
  const [period, setPeriod] = useState('total')
  const [readyIds, setReadyIds] = useState<string[]>([])
  const [addTags, setAddTags] = useState(true)
  const [preview, setPreview] = useState<string | null>(null)

  const willTag = !!spec?.taggable && addTags && !hasUtm(value)

  const start = () => {
    setValue('')
    setDescriptions('')
    setPreview(null)
    setAddTags(true)
    setPeriod('total')
    // 'ready' pre-ticks everything: the common case is "all of these are approved",
    // and un-ticking one is less work than ticking five.
    setReadyIds(spec?.kind === 'ready' ? notReady.map((a) => a.asset_id) : [])
    setOpen(true)
  }

  const save = async () => {
    if (!spec || !fixes) return
    setSaving(true)
    try {
      if (spec.kind === 'rsa') {
        // Both halves in one write: Google validates them together, so saving
        // headlines alone would just re-fail on the descriptions.
        await fixes.asset(assetIds, {
          rsa_headlines: parseLines('keywords', value),
          rsa_descriptions: parseLines('keywords', descriptions),
        })
      } else if (spec.kind === 'ready') {
        await fixes.asset(readyIds, { status: 'ready' })
      } else if (spec.kind === 'budget') {
        await fixes.channel({ budget: Number(value), budget_period: period })
      } else if (spec.target === 'push_config') {
        // Only special_ad_categories is a list; default_cta / name_template are strings.
        await fixes.pushConfig({
          [spec.field]:
            spec.field === 'special_ad_categories' ? (value === 'none' ? [] : [value]) : value.trim(),
        })
      } else if (spec.target === 'channel') {
        await fixes.channel({ [spec.field]: value })
      } else if (willTag) {
        await fixes.tagAndSave(assetIds, value.trim())
      } else {
        await fixes.asset(assetIds, {
          [spec.field]: spec.kind === 'lines' ? parseLines(spec.field, value) : value.trim(),
        })
      }
      setOpen(false)
    } finally {
      setSaving(false)
    }
  }

  // On blur rather than per keystroke — each preview is a real request.
  const loadPreview = async () => {
    if (!willTag || !fixes || !assetIds[0] || !value.trim()) return setPreview(null)
    setPreview(await fixes.previewTagged(assetIds[0], value.trim()))
  }

  // Fill the boxes with Mia's draft so it can be read and edited. Which field it
  // lands in depends on what this row is asking for.
  const suggest = async (assetId: string) => {
    if (!fixes) return
    setSaving(true)
    try {
      const draft = await fixes.suggest(assetId)
      if (!draft) return
      if (spec?.kind === 'rsa') {
        setValue(draft.headlines)
        setDescriptions(draft.descriptions)
      } else if (spec?.field === 'keywords') {
        setValue(draft.keywords)
      }
    } finally {
      setSaving(false)
    }
  }

  // Nothing was written by us — an account was linked elsewhere, so look again.
  const connected = async () => {
    setOpen(false)
    await fixes?.recheck()
  }

  const saveDisabled =
    saving ||
    (spec?.kind === 'ready'
      ? readyIds.length === 0
      : spec?.kind === 'budget'
        ? !Number(value)
        : spec?.kind === 'rsa'
          ? !value.trim() || !descriptions.trim()
          : !value.trim())

  return {
    open,
    setOpen,
    start,
    save,
    saving,
    saveDisabled,
    loadPreview,
    connected,
    suggest,
    state: {
      value,
      setValue,
      descriptions,
      setDescriptions,
      period,
      setPeriod,
      readyIds,
      setReadyIds,
      addTags,
      setAddTags,
      preview,
      setPreview,
    },
  }
}
