import { sessionCache } from '../../../utils/session-cache'
import { useEffect, useState, type ReactNode, useCallback } from 'react'
import { CollapsibleSection } from '../../../components/collapsible-section'
import { useExperience } from '../hooks/use-experience'
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
  /** Basic: the Messages (WhatsApp) group rendered between the style choices and Save. */
  messagesSection?: ReactNode
}

// Friendly labels (the "masking" — users never see raw enum values).
const DIM_META: Record<
  MiaDimension,
  { label: string; help: string; values: Record<string, string> }
> = {
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
  friendly_strategist: {
    label: 'Friendly Strategist',
    blurb: 'Warm tone, proactive recommendations.',
  },
  detailed_advisor: { label: 'Detailed Advisor', blurb: 'Full context, sections, and next steps.' },
}

// The dials are read-only — users choose a named preset, and these show what it does. Backend
// still supports custom (dial) editing if we re-enable it for power users later.
const ALL_DIMENSIONS: MiaDimension[] = ['tone', 'length', 'format', 'proactivity', 'jargon']

const PREFS_CACHE = sessionCache<MiaPreferencesResponse>('mia-prefs') // survives a refresh in this tab

export const MiaStyleTab = ({
  sessionId,
  tenantId,
  canManage,
  messagesSection,
}: MiaStyleTabProps) => {
  const { isBasic } = useExperience()
  const { showToast } = useToast()
  // The last answer per workspace shows at once on return; it refreshes behind (19 Nov 2026).
  const [data, setDataState] = useState<MiaPreferencesResponse | null>(() => PREFS_CACHE.get(tenantId) ?? null)
  const setData = useCallback(
    (u: MiaPreferencesResponse | null | ((d: MiaPreferencesResponse | null) => MiaPreferencesResponse | null)) =>
      setDataState((prev) => {
        const next = typeof u === 'function' ? u(prev) : u
        if (next) PREFS_CACHE.set(tenantId, next)
        return next
      }),
    [tenantId]
  )
  const [prefs, setPrefs] = useState<MiaPreferences | null>(() => PREFS_CACHE.get(tenantId)?.resolved ?? null)
  const [loading, setLoading] = useState(() => !PREFS_CACHE.has(tenantId))
  const [saving, setSaving] = useState(false)
  const [settingDefault, setSettingDefault] = useState(false)
  const [applyingAll, setApplyingAll] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionId) return
    setLoading(!PREFS_CACHE.has(tenantId))
    setError(null)
    fetchMiaPreferences(sessionId, tenantId)
      .then((d) => {
        setData(d)
        setPrefs(d.resolved)
      })
      .catch(() => setError('Failed to load Mia preferences.'))
      .finally(() => setLoading(false))
  }, [sessionId, tenantId, setData])

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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" aria-busy="true">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[68px] rounded-xl bg-secondary animate-pulse" />
        ))}
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

  if (isBasic) {
    // Three plain choices; the fourth preset (Detailed Advisor) is a team-mode style.
    const CHOICES: Array<{ key: string; label: string; line: string }> = [
      { key: 'balanced', label: 'Balanced', line: 'Short and clear, a next step when it helps' },
      {
        key: 'concise_analyst',
        label: 'Just the numbers',
        line: 'Bullets, figures first, no extras',
      },
      { key: 'friendly_strategist', label: 'Friendly', line: 'Warmer tone, more suggestions' },
    ].filter((c) => presetKeys.includes(c.key))
    return (
      <div className="space-y-3">
        <div className="settings-card rounded-lg border border-tertiary bg-secondary overflow-hidden">
          <p className="settings-eyebrow text-quaternary px-3 pt-3 pb-1">How Mia talks to you</p>
          <div className="divide-y divide-tertiary">
            {CHOICES.map((c) => {
              const on = prefs.preset === c.key
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => applyPreset(c.key)}
                  className="w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-tertiary/50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="subheading-md text-primary">{c.label}</p>
                    <p className="paragraph-xs text-quaternary">{c.line}</p>
                  </div>
                  <span
                    className={`relative shrink-0 w-9 h-5 rounded-full transition-colors ${on ? 'bg-utility-success-600' : 'bg-quaternary'}`}
                    aria-hidden="true"
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${on ? 'translate-x-4' : ''}`}
                    />
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <CollapsibleSection
          title="What this changes"
          summary="Tone · length · format · how often she suggests a step"
          compact
          className="px-2"
        >
          <div className="space-y-2 pt-1">
            {ALL_DIMENSIONS.map((dim) => {
              const meta = DIM_META[dim]
              const value = prefs[dim]
              return (
                <div key={dim} className="flex items-center justify-between gap-3">
                  <p className="paragraph-sm text-secondary">{meta.label}</p>
                  <span className="shrink-0 px-2.5 py-0.5 rounded-full bg-brand-primary text-brand-secondary paragraph-xs">
                    {meta.values[value] || value}
                  </span>
                </div>
              )
            })}
          </div>
        </CollapsibleSection>

        {messagesSection}

        <div className="flex items-center justify-between gap-3 settings-card rounded-lg border border-tertiary bg-secondary px-3 py-3">
          <div>
            <p className="subheading-md text-primary">Save</p>
            <p className="paragraph-xs text-quaternary">Applies to this business</p>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-brand-solid text-primary-onbrand rounded-lg paragraph-sm font-medium hover:bg-brand-solid-hover transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    )
  }

  // Agency (UI polish, 19 Nov 2026): the styles as cards; picking one saves it. The heading is the
  // Mia tab's ("How Mia replies"), so none here; no explanations, no read-only breakdown.
  const pick = async (key: string) => {
    const preset = data.catalog.presets[key]
    if (!preset || !sessionId || saving) return
    setPrefs({ ...preset })
    setSaving(true)
    try {
      await updateMiaPreferences(sessionId, tenantId, preset)
      setData((d) => (d ? { ...d, user_preferences: preset } : d))
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Failed to save', 5000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {presetKeys.map((key) => {
          const meta = PRESET_META[key] || { label: key, blurb: '' }
          const active = prefs.preset === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => void pick(key)}
              aria-pressed={active}
              className={[
                'text-left px-4 py-3 rounded-xl border transition-all duration-150 active:scale-[0.99]',
                active
                  ? 'border-brand-solid bg-brand-primary shadow-sm'
                  : 'border-secondary bg-secondary hover:border-brand-solid/40 hover:bg-tertiary',
              ].join(' ')}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="subheading-bg text-primary">{meta.label}</span>
                {active ? <span className="w-2 h-2 rounded-full bg-brand-solid" aria-hidden /> : null}
              </span>
              <span className="block paragraph-xs text-tertiary mt-1">{meta.blurb}</span>
            </button>
          )
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2 paragraph-xs text-quaternary">
        <span>{saving ? 'Saving…' : usingDefault ? 'Using the default' : 'Saved for you'}</span>
        <span aria-hidden>·</span>
        <button
          type="button"
          onClick={handleApplyAll}
          disabled={applyingAll}
          className="underline-offset-2 hover:underline hover:text-secondary disabled:opacity-50"
        >
          {applyingAll ? 'Applying…' : 'Use in all my workspaces'}
        </button>
        {canManage && (
          <>
            <span aria-hidden>·</span>
            <button
              type="button"
              onClick={handleSetDefault}
              disabled={settingDefault}
              className="underline-offset-2 hover:underline hover:text-secondary disabled:opacity-50"
            >
              {settingDefault ? 'Setting…' : 'Make it the workspace default'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
