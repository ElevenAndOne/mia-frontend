import { useCallback, useEffect, useState } from 'react'
import { useSession } from '../../../contexts/session-context'
import { useToast } from '../../../contexts/toast-context'
import { Spinner } from '../../../components/spinner'
import type { FeatureCatalogEntry, FeatureKey } from '../feature-keys'
import { fetchWorkspaceFeatures, updateWorkspaceFeatures } from '../services/workspace-service'

interface FeatureFlagsPanelProps {
  sessionId: string
  tenantId: string
}

/**
 * Workspace Settings → "Features": turn product surfaces on or off for this workspace.
 *
 * Backed by GET/PATCH /api/tenants/{id}/features. A switch sets a per-workspace override;
 * "Reset" clears it so the flag follows the registry default again. After a change we
 * refresh the session's workspaces so the sidebar (useFeatures) updates immediately.
 */
export const FeatureFlagsPanel = ({ sessionId, tenantId }: FeatureFlagsPanelProps) => {
  const { refreshWorkspaces } = useSession()
  const { showToast } = useToast()
  const [catalog, setCatalog] = useState<FeatureCatalogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<FeatureKey | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchWorkspaceFeatures(sessionId, tenantId)
      .then((res) => {
        if (!cancelled) setCatalog(res.catalog)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load features')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [sessionId, tenantId])

  const apply = useCallback(
    async (key: FeatureKey, value: boolean | null) => {
      setSaving(key)
      setError(null)
      try {
        const res = await updateWorkspaceFeatures(sessionId, tenantId, { [key]: value })
        setCatalog(res.catalog)
        await refreshWorkspaces()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update feature'
        setError(message)
        showToast('error', message)
      } finally {
        setSaving(null)
      }
    },
    [sessionId, tenantId, refreshWorkspaces, showToast]
  )

  return (
    <div className="mt-8 pt-6 border-t border-tertiary">
      <h3 className="subheading-md text-primary mb-2">Features</h3>
      <p className="paragraph-sm text-tertiary mb-4">
        Choose what this workspace can see. Turning something off hides it from the sidebar; it
        never deletes anything, and you can turn it back on here at any time.
      </p>

      {error && (
        <div className="mb-3 p-3 bg-error-primary border border-error-subtle rounded-lg">
          <p className="paragraph-sm text-error">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Spinner size="md" variant="dark" />
        </div>
      ) : (
        <div className="space-y-2">
          {catalog.map((entry) => {
            const busy = saving === entry.key
            return (
              <div
                key={entry.key}
                className="flex items-center justify-between gap-4 p-3 bg-secondary rounded-lg"
              >
                <div className="min-w-0">
                  <p className="subheading-md text-primary">{entry.label}</p>
                  <p className="paragraph-sm text-quaternary">{entry.description}</p>
                  {entry.overridden && (
                    <button
                      type="button"
                      onClick={() => apply(entry.key, null)}
                      disabled={busy}
                      className="mt-1 paragraph-xs text-tertiary underline hover:text-secondary disabled:opacity-50"
                    >
                      Reset to default ({entry.default ? 'on' : 'off'})
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={entry.enabled}
                  aria-label={`${entry.label} ${entry.enabled ? 'on' : 'off'}`}
                  disabled={busy}
                  onClick={() => apply(entry.key, !entry.enabled)}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
                    entry.enabled ? 'bg-brand-solid' : 'bg-tertiary'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      entry.enabled ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
