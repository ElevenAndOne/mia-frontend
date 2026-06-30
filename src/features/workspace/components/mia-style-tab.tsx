import { useEffect, useState } from 'react'
import { Spinner } from '../../../components/spinner'
import { useToast } from '../../../contexts/toast-context'
import {
  fetchMiaPreferences,
  updateMiaPreferences,
  setMiaWorkspaceDefault,
  applyMiaPreferencesToAll,
  type MiaDimension,
  type MiaPreferences,
  type MiaPreferencesResponse,
} from '../services/mia-preferences-service'

interface MiaStyleTabProps {
  sessionId: string | null
  tenantId: string
  /** Owner/admin — gets the full slider set + workspace-default control. */
  canManage: boolean
}

// Friendly labels (the "masking" — users never see raw enum values).
const DIM_META: Record<MiaDimension, { label: string; help: string; values: Record<string, string> }> = {
  tone: {
    label: 'Tone',
    help: 'How formal Mia sounds when she talks to you.',
    values: { professional: 'Professional', friendly: 'Friendly', casual: 'Casual' },
  },
  length: {
    label: 'Response length',
    help: 'How much detail Mia gives by default.',
    values: { brief: 'Brief', balanced: 'Balanced', detailed: 'Detailed' },
  },
  format: {
    label: 'Format',
    help: 'How Mia structures her replies.',
    values: { prose: 'Prose', bullets: 'Bullets' },
  },
  proactivity: {
    label: 'Proactivity',
    help: 'How much Mia volunteers next steps.',
    values: { just_answer: 'Just answer', suggest: 'Suggest a step', advisor: 'Strategic advisor' },
  },
  jargon: {
    label: 'Detail level',
    help: 'Vocabulary and depth of explanation.',
    values: { exec: 'Executive', marketer: 'Marketer', analyst: 'Data analyst' },
  },
}

const PRESET_META: Record<string, { label: string; blurb: string }> = {
  balanced: { label: 'Balanced', blurb: "Mia's standard style — concise and professional." },
  concise_analyst: { label: 'Concise Analyst', blurb: 'Short, bulleted, numbers-first, no fluff.' },
  friendly_strategist: { label: 'Friendly Strategist', blurb: 'Warm tone, proactive recommendations.' },
  detailed_advisor: { label: 'Detailed Advisor', blurb: 'Full context, sections, and next steps.' },
}

// The dials are read-only — users choose a named preset, and these show what it does. Backend
// still supports custom (dial) editing if we re-enable it for power users later.
const ALL_DIMENSIONS: MiaDimension[] = ['tone', 'length', 'format', 'proactivity', 'jargon']

export const MiaStyleTab = ({ sessionId, tenantId, canManage }: MiaStyleTabProps) => {
  const { showToast } = useToast()
  const [data, setData] = useState<MiaPreferencesResponse | null>(null)
  const [prefs, setPrefs] = useState<MiaPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settingDefault, setSettingDefault] = useState(false)
  const [applyingAll, setApplyingAll] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionId) return
    setLoading(true)
    setError(null)
    fetchMiaPreferences(sessionId, tenantId)
      .then((d) => {
        setData(d)
        setPrefs(d.resolved)
      })
      .catch(() => setError('Failed to load Mia preferences.'))
      .finally(() => setLoading(false))
  }, [sessionId, tenantId])

  const applyPreset = (presetKey: string) => {
    const preset = data?.catalog.presets[presetKey]
    if (preset) setPrefs({ ...preset })
  }

  const handleSave = async () => {
    if (!sessionId || !prefs || saving) return
    setSaving(true)
    try {
      await updateMiaPreferences(sessionId, tenantId, prefs)
      showToast('success', 'Saved — Mia will use this style for you here.', 4000)
      setData((d) => (d ? { ...d, user_preferences: prefs } : d))
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Failed to save', 5000)
    } finally {
      setSaving(false)
    }
  }

  const handleSetDefault = async () => {
    if (!sessionId || !prefs || settingDefault) return
    setSettingDefault(true)
    try {
      await setMiaWorkspaceDefault(sessionId, tenantId, prefs)
      showToast('success', 'Set as the default for everyone in this workspace.', 4000)
      setData((d) => (d ? { ...d, workspace_default: prefs } : d))
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Failed to set default', 5000)
    } finally {
      setSettingDefault(false)
    }
  }

  const handleApplyAll = async () => {
    if (!sessionId || applyingAll) return
    setApplyingAll(true)
    try {
      // Persist current choices here first so "apply to all" copies what's on screen.
      if (prefs) await updateMiaPreferences(sessionId, tenantId, prefs)
      const count = await applyMiaPreferencesToAll(sessionId, tenantId)
      showToast('success', `Applied to ${count} other workspace${count === 1 ? '' : 's'}.`, 4000)
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Failed to apply', 5000)
    } finally {
      setApplyingAll(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="md" variant="dark" />
      </div>
    )
  }

  if (error || !data || !prefs) {
    return (
      <div className="p-3 bg-error-primary border border-error-subtle rounded-lg">
        <p className="paragraph-sm text-error">{error || 'Could not load preferences.'}</p>
      </div>
    )
  }

  const usingDefault = !data.user_preferences
  const presetKeys = Object.keys(data.catalog.presets)

  return (
    <div className="space-y-6">
      <div>
        <p className="subheading-md text-primary">How Mia talks to you</p>
        <p className="paragraph-sm text-tertiary mt-0.5">
          Tune how Mia phrases her chat replies for you in this workspace. This changes her
          delivery, never her data — she always uses the real numbers.
        </p>
        {usingDefault && (
          <p className="paragraph-sm text-quaternary mt-1.5">
            You're currently using the {data.workspace_default ? 'workspace' : 'Mia'} default.
            Pick a style below to personalize it.
          </p>
        )}
      </div>

      {/* Preset picker */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {presetKeys.map((key) => {
          const meta = PRESET_META[key] || { label: key, blurb: '' }
          const active = prefs.preset === key
          return (
            <button
              key={key}
              onClick={() => applyPreset(key)}
              className={[
                'text-left p-3 rounded-xl border transition-colors',
                active
                  ? 'border-brand-solid bg-brand-primary'
                  : 'border-tertiary bg-secondary hover:bg-tertiary',
              ].join(' ')}
            >
              <p className="subheading-md text-primary">{meta.label}</p>
              <p className="paragraph-sm text-tertiary mt-0.5">{meta.blurb}</p>
            </button>
          )
        })}
      </div>

      {/* What this style does — read-only summary of the selected preset's settings */}
      <div className="p-4 bg-secondary rounded-xl border border-tertiary space-y-4">
        <div className="flex items-center justify-between">
          <p className="subheading-md text-primary">What this style does</p>
          <span className="paragraph-sm text-quaternary">
            {prefs.preset && PRESET_META[prefs.preset]?.label
              ? PRESET_META[prefs.preset].label
              : 'Custom'}
          </span>
        </div>

        {ALL_DIMENSIONS.map((dim) => {
          const meta = DIM_META[dim]
          const value = prefs[dim]
          return (
            <div key={dim} className="flex items-center justify-between gap-3">
              <div>
                <p className="paragraph-sm text-primary font-medium">{meta.label}</p>
                <p className="paragraph-sm text-quaternary">{meta.help}</p>
              </div>
              <span className="shrink-0 px-3 py-1 rounded-full bg-brand-primary text-brand-secondary subheading-sm">
                {meta.values[value] || value}
              </span>
            </div>
          )
        })}

        <p className="paragraph-sm text-quaternary">
          Pick a style above to change how Mia talks to you — these settings update to match.
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-brand-solid text-primary-onbrand rounded-lg subheading-md hover:bg-brand-solid-hover transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save my style'}
        </button>

        <button
          onClick={handleApplyAll}
          disabled={applyingAll}
          className="px-4 py-2 border border-primary text-secondary rounded-lg subheading-md hover:bg-tertiary transition-colors disabled:opacity-50"
        >
          {applyingAll ? 'Applying…' : 'Apply to all my workspaces'}
        </button>

        {canManage && (
          <button
            onClick={handleSetDefault}
            disabled={settingDefault}
            className="px-4 py-2 border border-primary text-secondary rounded-lg subheading-md hover:bg-tertiary transition-colors disabled:opacity-50"
          >
            {settingDefault ? 'Setting…' : 'Set as workspace default'}
          </button>
        )}
      </div>

      {canManage && (
        <p className="paragraph-sm text-quaternary">
          "Set as workspace default" applies these choices to everyone who hasn't picked their
          own style. Individual members can always override it.
        </p>
      )}
    </div>
  )
}