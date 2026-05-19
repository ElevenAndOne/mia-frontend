import { useEffect, useState } from 'react'
import { useSession } from '../../../contexts/session-context'
import { apiFetch } from '../../../utils/api'

export interface EnabledPlugin {
  plugin_id: string
  name: string
  enabled_version: string
  previous_version: string | null
  capabilities: string[]
  config: Record<string, string>
  enabled_at: string | null
}

interface PluginsCache {
  tenantId: string
  plugins: EnabledPlugin[]
  ts: number
}

// Module-level cache — survives re-renders, busted on workspace switch or explicit invalidate
let _cache: PluginsCache | null = null
const CACHE_TTL = 5 * 60 * 1000

export function usePlugins() {
  const { sessionId, activeWorkspace } = useSession()
  const tenantId = activeWorkspace?.tenant_id
  const [plugins, setPlugins] = useState<EnabledPlugin[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!sessionId || !tenantId) return

    if (_cache && _cache.tenantId === tenantId && Date.now() - _cache.ts < CACHE_TTL) {
      setPlugins(_cache.plugins)
      return
    }

    setLoading(true)
    apiFetch(`/api/tenants/${tenantId}/plugins`, {
      headers: { 'X-Session-ID': sessionId },
    })
      .then((r) => (r.ok ? r.json() : { plugins: [] }))
      .then((data) => {
        const ps: EnabledPlugin[] = data.plugins ?? []
        _cache = { tenantId, plugins: ps, ts: Date.now() }
        setPlugins(ps)
      })
      .catch(() => setPlugins([]))
      .finally(() => setLoading(false))
  }, [tenantId, sessionId])

  const isEnabled = (pluginId: string) => plugins.some((p) => p.plugin_id === pluginId)

  const invalidate = () => {
    _cache = null
  }

  return { plugins, loading, isEnabled, invalidate }
}
