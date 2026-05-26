import { useState, useEffect, type ReactElement } from 'react'
import { Download, Trash2, Search, Play, Eye, CheckCircle, Clock, XCircle, MoreVertical, RefreshCw, Sparkles, Video, Image, X } from 'lucide-react'
import { creativeStudioApi, type CreativeAsset } from './creative-studio-api'
import { apiFetch, createSessionHeaders } from '../../utils/api'

interface Props {
  tenantId: string
  sessionId: string
}

type MediaFilter = 'all' | 'image' | 'video'
type StatusFilter = 'all' | 'completed' | 'processing' | 'failed'
type ViewMode = 'grid' | 'list'

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    completed: 'bg-green-500/20 text-green-400 border-green-500/30',
    processing: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    failed:     'bg-red-500/20 text-red-400 border-red-500/30',
  }
  const icons: Record<string, ReactElement> = {
    completed: <CheckCircle className="w-3 h-3" />,
    processing: <Clock className="w-3 h-3 animate-spin" />,
    failed:    <XCircle className="w-3 h-3" />,
  }
  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-xs ${styles[status] ?? styles.failed}`}>
      {icons[status]}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </div>
  )
}

async function downloadAsset(tenantId: string, sessionId: string, assetId: string, filename: string, cdnUrl: string) {
  try {
    const resp = await apiFetch(
      `/api/tenants/${tenantId}/plugins/mia-creative-studio/assets/${assetId}/download`,
      { headers: createSessionHeaders(sessionId) },
    )
    if (!resp.ok) throw new Error('Download failed')
    const blob = await resp.blob()
    const objUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objUrl
    a.download = filename || 'asset'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(objUrl)
  } catch {
    window.open(cdnUrl, '_blank')
  }
}

function LightboxModal({ asset, tenantId, sessionId, onClose }: { asset: CreativeAsset; tenantId: string; sessionId: string; onClose: () => void }) {
  const isVideo = asset.media_type === 'video'
  return (
    <div
      className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white transition-colors"
        onClick={onClose}
      >
        <X className="w-5 h-5" />
      </button>
      <div className="max-w-5xl max-h-[90vh] w-full flex flex-col items-center gap-4" onClick={e => e.stopPropagation()}>
        {isVideo ? (
          <video
            src={asset.cdn_url}
            controls
            autoPlay
            className="max-h-[80vh] max-w-full rounded-xl"
          />
        ) : (
          <img
            src={asset.cdn_url}
            alt={asset.prompt}
            className="max-h-[80vh] max-w-full object-contain rounded-xl"
          />
        )}
        <div className="flex items-center gap-3">
          <button
            onClick={() => downloadAsset(tenantId, sessionId, asset.asset_id, asset.filename || `${asset.media_type}_${asset.asset_id}`, asset.cdn_url)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm transition-colors"
          >
            <Download className="w-4 h-4" /> Download
          </button>
          {asset.prompt && (
            <p className="text-slate-400 text-sm max-w-lg truncate">{asset.prompt}</p>
          )}
        </div>
      </div>
    </div>
  )
}

function AssetCard({
  asset,
  tenantId,
  sessionId,
  onDelete,
  onView,
}: {
  asset: CreativeAsset
  tenantId: string
  sessionId: string
  onDelete: (id: string) => void
  onView: (asset: CreativeAsset) => void
}) {
  const [showMenu, setShowMenu] = useState(false)
  const isVideo = asset.media_type === 'video'
  const dlFilename = asset.filename || `${asset.media_type}_${asset.asset_id}`

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden hover:border-purple-500/50 transition-all group">
      <div className="relative aspect-video bg-slate-800">
        {asset.cdn_url ? (
          isVideo ? (
            <video src={asset.cdn_url} className="w-full h-full object-cover" muted />
          ) : (
            <img src={asset.cdn_url} alt={asset.prompt} className="w-full h-full object-cover" />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {isVideo ? <Video className="w-12 h-12 text-slate-600" /> : <Image className="w-12 h-12 text-slate-600" />}
          </div>
        )}

        {asset.cdn_url && (
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <button
              onClick={() => onView(asset)}
              className="p-3 bg-purple-500 rounded-lg hover:bg-purple-600 transition-colors"
            >
              {isVideo ? <Play className="w-5 h-5 text-white" /> : <Eye className="w-5 h-5 text-white" />}
            </button>
            <button
              onClick={() => downloadAsset(tenantId, sessionId, asset.asset_id, dlFilename, asset.cdn_url)}
              className="p-3 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors"
            >
              <Download className="w-5 h-5 text-white" />
            </button>
          </div>
        )}

        <div className="absolute top-3 left-3"><StatusBadge status={asset.status} /></div>
        <div className="absolute top-3 right-3">
          <div className={`text-xs px-2 py-1 rounded-full ${isVideo ? 'bg-purple-500/80 text-white' : 'bg-blue-500/80 text-white'}`}>
            {isVideo ? 'Video' : 'Image'}
          </div>
        </div>
      </div>

      <div className="p-4">
        <h3 className="text-white font-medium mb-2 line-clamp-2 text-sm">{asset.prompt || '—'}</h3>
        <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
          <span>{asset.model}</span>
          <span>{new Date(asset.created_at).toLocaleDateString()}</span>
        </div>

        <div className="flex justify-end">
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
              <MoreVertical className="w-4 h-4" />
            </button>
            {showMenu && (
              <div className="absolute right-0 bottom-full mb-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-2 w-36 z-10">
                <button className="w-full px-3 py-2 text-left text-sm text-white hover:bg-slate-700 flex items-center gap-2">
                  <RefreshCw className="w-3 h-3" /> Regenerate
                </button>
                <button className="w-full px-3 py-2 text-left text-sm text-white hover:bg-slate-700 flex items-center gap-2">
                  <Sparkles className="w-3 h-3" /> Create Variant
                </button>
                <hr className="my-2 border-slate-700" />
                <button
                  onClick={() => { setShowMenu(false); onDelete(asset.asset_id) }}
                  className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-slate-700 flex items-center gap-2"
                >
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LibraryTab({ tenantId, sessionId }: Props) {
  const [assets, setAssets] = useState<CreativeAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [lightboxAsset, setLightboxAsset] = useState<CreativeAsset | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await creativeStudioApi.listAssets(tenantId, sessionId, { limit: 100 })
      setAssets(res.assets ?? [])
    } catch {
      setAssets([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [tenantId, sessionId])

  const handleDelete = async (assetId: string) => {
    try {
      await creativeStudioApi.deleteAsset(tenantId, sessionId, assetId)
      setAssets(prev => prev.filter(a => a.asset_id !== assetId))
    } catch { /* show error toast in future */ }
  }

  const filtered = assets.filter(a => {
    if (mediaFilter !== 'all' && a.media_type !== mediaFilter) return false
    if (statusFilter !== 'all' && a.status !== statusFilter) return false
    if (searchTerm && !a.prompt?.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  return (
    <div>
      {lightboxAsset && (
        <LightboxModal asset={lightboxAsset} tenantId={tenantId} sessionId={sessionId} onClose={() => setLightboxAsset(null)} />
      )}

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-1">Asset Library</h2>
        <p className="text-slate-400">All generated images and videos for this workspace</p>
      </div>

      {/* Filters */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[240px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by prompt..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 text-sm"
            />
          </div>

          <div className="flex gap-1 bg-slate-800 rounded-lg p-1">
            {(['all', 'image', 'video'] as MediaFilter[]).map(f => (
              <button key={f} onClick={() => setMediaFilter(f)} className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${mediaFilter === f ? 'bg-purple-500 text-white' : 'text-slate-400 hover:text-white'}`}>{f}</button>
            ))}
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="processing">Processing</option>
            <option value="failed">Failed</option>
          </select>

          <button onClick={load} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <p className="text-slate-400 text-sm">Showing {filtered.length} of {assets.length} assets</p>
        <div className="flex gap-2">
          {(['grid', 'list'] as ViewMode[]).map(m => (
            <button key={m} onClick={() => setViewMode(m)} className={`p-2 rounded-lg transition-colors ${viewMode === m ? 'bg-purple-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
              {m === 'grid' ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" strokeWidth="2"/><rect x="14" y="3" width="7" height="7" strokeWidth="2"/><rect x="3" y="14" width="7" height="7" strokeWidth="2"/><rect x="14" y="14" width="7" height="7" strokeWidth="2"/></svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6" strokeWidth="2"/><line x1="3" y1="12" x2="21" y2="12" strokeWidth="2"/><line x1="3" y1="18" x2="21" y2="18" strokeWidth="2"/></svg>
              )}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-400">Loading library...</p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Video className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 mb-2">{assets.length === 0 ? 'No assets yet' : 'No assets match your filters'}</p>
          <p className="text-slate-500 text-sm">{assets.length === 0 ? 'Generate your first image or video in the Create or Imagine tabs' : 'Try adjusting your filters'}</p>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'space-y-4'}>
          {filtered.map(asset => (
            <AssetCard key={asset.asset_id} asset={asset} tenantId={tenantId} sessionId={sessionId} onDelete={handleDelete} onView={setLightboxAsset} />
          ))}
        </div>
      )}
    </div>
  )
}
