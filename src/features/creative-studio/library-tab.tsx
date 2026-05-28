import { useState, useEffect, useRef, type ReactElement } from 'react'
import {
  Download, Trash2, Search, Play, Eye, CheckCircle, Clock, XCircle,
  MoreVertical, RefreshCw, Sparkles, Video, Image, X, Frame, ChevronLeft,
  FileImage, Upload,
} from 'lucide-react'
import { creativeStudioApi, figmaApi, type CreativeAsset, type FigmaFile, type FigmaFrame } from './creative-studio-api'
import { apiFetch, createSessionHeaders } from '../../utils/api'

interface Props {
  tenantId: string
  sessionId: string
}

type SubTab = 'library' | 'assets'
type MediaFilter = 'all' | 'image' | 'video'
type StatusFilter = 'all' | 'completed' | 'processing' | 'failed'
type ViewMode = 'grid' | 'list'

// ── Shared helpers ─────────────────────────────────────────────────────────────

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

// ── Lightbox ───────────────────────────────────────────────────────────────────

function LightboxModal({ asset, tenantId, sessionId, onClose }: {
  asset: CreativeAsset; tenantId: string; sessionId: string; onClose: () => void
}) {
  const isVideo = asset.media_type === 'video'
  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <button className="absolute top-4 right-4 p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white transition-colors" onClick={onClose}>
        <X className="w-5 h-5" />
      </button>
      <div className="max-w-5xl max-h-[90vh] w-full flex flex-col items-center gap-4" onClick={e => e.stopPropagation()}>
        {isVideo ? (
          <video src={asset.cdn_url} controls autoPlay className="max-h-[80vh] max-w-full rounded-xl" />
        ) : (
          <img src={asset.cdn_url} alt={asset.prompt} className="max-h-[80vh] max-w-full object-contain rounded-xl" />
        )}
        <div className="flex items-center gap-3">
          <button
            onClick={() => downloadAsset(tenantId, sessionId, asset.asset_id, asset.filename || `${asset.media_type}_${asset.asset_id}`, asset.cdn_url)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm transition-colors"
          >
            <Download className="w-4 h-4" /> Download
          </button>
          {asset.prompt && <p className="text-slate-400 text-sm max-w-lg truncate">{asset.prompt}</p>}
        </div>
      </div>
    </div>
  )
}

// ── Generated asset card ───────────────────────────────────────────────────────

function AssetCard({ asset, tenantId, sessionId, onDelete, onView }: {
  asset: CreativeAsset; tenantId: string; sessionId: string
  onDelete: (id: string) => void; onView: (asset: CreativeAsset) => void
}) {
  const [showMenu, setShowMenu] = useState(false)
  const isVideo = asset.media_type === 'video'
  const dlFilename = asset.filename || `${asset.media_type}_${asset.asset_id}`

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden hover:border-purple-500/50 transition-all group">
      <div className="relative aspect-video bg-slate-800">
        {asset.cdn_url ? (
          isVideo
            ? <video src={asset.cdn_url} className="w-full h-full object-cover" muted />
            : <img src={asset.cdn_url} alt={asset.prompt} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {isVideo ? <Video className="w-12 h-12 text-slate-600" /> : <Image className="w-12 h-12 text-slate-600" />}
          </div>
        )}
        {asset.cdn_url && (
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <button onClick={() => onView(asset)} className="p-3 bg-purple-500 rounded-lg hover:bg-purple-600 transition-colors">
              {isVideo ? <Play className="w-5 h-5 text-white" /> : <Eye className="w-5 h-5 text-white" />}
            </button>
            <button onClick={() => downloadAsset(tenantId, sessionId, asset.asset_id, dlFilename, asset.cdn_url)} className="p-3 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors">
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
                <button onClick={() => { setShowMenu(false); onDelete(asset.asset_id) }} className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-slate-700 flex items-center gap-2">
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

// ── Reference asset card ───────────────────────────────────────────────────────

function ReferenceAssetCard({ asset, onDelete }: {
  asset: CreativeAsset; onDelete: (id: string) => void
}) {
  const isFigma = asset.source === 'figma'
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden hover:border-purple-500/50 transition-all group">
      <div className="relative aspect-square bg-slate-800">
        {asset.cdn_url
          ? <img src={asset.cdn_url} alt={asset.filename} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center"><FileImage className="w-12 h-12 text-slate-600" /></div>
        }
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <button onClick={() => onDelete(asset.asset_id)} className="p-3 bg-red-500 hover:bg-red-600 rounded-lg transition-colors">
            <Trash2 className="w-5 h-5 text-white" />
          </button>
        </div>
        <div className="absolute top-2 right-2">
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${isFigma ? 'bg-purple-500/80 text-white' : 'bg-slate-700/90 text-slate-300'}`}>
            {isFigma ? 'Figma' : 'Upload'}
          </span>
        </div>
      </div>
      <div className="px-3 py-2">
        <p className="text-slate-300 text-xs truncate">{asset.filename || 'Reference image'}</p>
        <p className="text-slate-500 text-xs mt-0.5">{new Date(asset.created_at).toLocaleDateString()}</p>
      </div>
    </div>
  )
}

// ── Figma import modal ─────────────────────────────────────────────────────────

function FigmaImportModal({ tenantId, sessionId, onImported, onClose }: {
  tenantId: string; sessionId: string
  onImported: (assets: CreativeAsset[]) => void; onClose: () => void
}) {
  const [step, setStep] = useState<'files' | 'frames'>('files')
  const [query, setQuery] = useState('')
  const [files, setFiles] = useState<FigmaFile[]>([])
  const [filesLoading, setFilesLoading] = useState(true)
  const [filesError, setFilesError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<FigmaFile | null>(null)
  const [frames, setFrames] = useState<FigmaFrame[]>([])
  const [framesLoading, setFramesLoading] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { fetchFiles() }, [])

  const fetchFiles = async (q?: string) => {
    setFilesLoading(true)
    setFilesError(null)
    try {
      const res = await figmaApi.listFiles(sessionId, tenantId, q)
      setFiles(res.files ?? [])
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load Figma files'
      setFilesError(msg.includes('not connected') ? 'Figma is not connected. Go to Settings → Integrations to connect.' : msg)
    } finally {
      setFilesLoading(false)
    }
  }

  const handleQueryChange = (q: string) => {
    setQuery(q)
    if (searchRef.current) clearTimeout(searchRef.current)
    searchRef.current = setTimeout(() => fetchFiles(q), 400)
  }

  const selectFile = async (file: FigmaFile) => {
    setSelectedFile(file)
    setStep('frames')
    setFrames([])
    setSelected(new Set())
    setFramesLoading(true)
    try {
      const res = await figmaApi.listFrames(sessionId, tenantId, file.file_key)
      setFrames(res.frames ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((res as any).unsupported) {
        setImportError('Could not read this file. Try reconnecting your Figma account in Settings → Integrations.')
      }
    } catch {
      setFrames([])
    } finally {
      setFramesLoading(false)
    }
  }

  const toggleFrame = (nodeId: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(nodeId)) next.delete(nodeId); else next.add(nodeId)
      return next
    })
  }

  const importSelected = async () => {
    if (!selectedFile || selected.size === 0) return
    setImporting(true)
    setImportError(null)
    try {
      const toImport = frames.filter(f => selected.has(f.node_id))
      const res = await figmaApi.importFrames(sessionId, tenantId, selectedFile.file_key, toImport)
      onImported(res.assets ?? [])
      onClose()
    } catch {
      setImportError('Import failed. Please try again.')
    } finally {
      setImporting(false)
    }
  }

  // Group frames by page
  const framesByPage = frames.reduce<Record<string, FigmaFrame[]>>((acc, f) => {
    if (!acc[f.page_name]) acc[f.page_name] = []
    acc[f.page_name].push(f)
    return acc
  }, {})

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            {step === 'frames' && (
              <button onClick={() => setStep('files')} className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white">
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <h3 className="text-white font-semibold text-sm">Import from Figma</h3>
              {step === 'frames' && selectedFile && (
                <p className="text-slate-400 text-xs mt-0.5 truncate max-w-[280px]">{selectedFile.name}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step 1: File list */}
        {step === 'files' && (
          <>
            <div className="px-5 py-3 border-b border-slate-800">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search files..."
                  value={query}
                  onChange={e => handleQueryChange(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {filesLoading ? (
                <div className="flex flex-col items-center justify-center h-32 gap-2">
                  <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-slate-500 text-xs">Loading all projects — may take a few seconds...</p>
                </div>
              ) : filesError ? (
                <div className="px-5 py-8 text-center">
                  <p className="text-red-400 text-sm">{filesError}</p>
                </div>
              ) : files.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <Frame className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">{query ? 'No files match your search' : 'No Figma files found'}</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-800">
                  {files.map(file => (
                    <button
                      key={file.file_key}
                      onClick={() => selectFile(file)}
                      className="w-full flex items-center gap-3 px-5 py-3 hover:bg-slate-800/60 transition-colors text-left"
                    >
                      {file.thumbnail_url ? (
                        <img src={file.thumbnail_url} alt={file.name} className="w-10 h-10 rounded-md object-cover flex-shrink-0 bg-slate-700" />
                      ) : (
                        <div className="w-10 h-10 rounded-md bg-slate-700 flex items-center justify-center flex-shrink-0">
                          <Frame className="w-5 h-5 text-slate-400" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium truncate">{file.name}</p>
                        <p className="text-slate-400 text-xs truncate">{file.project_name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Step 2: Frame selection */}
        {step === 'frames' && (
          <>
            <div className="flex-1 overflow-y-auto">
              {framesLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : frames.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <p className="text-slate-400 text-sm">No top-level frames found in this file</p>
                </div>
              ) : (
                <div className="px-5 py-3 space-y-4">
                  {Object.entries(framesByPage).map(([pageName, pageFrames]) => (
                    <div key={pageName}>
                      <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-2">{pageName}</p>
                      <div className="space-y-1">
                        {pageFrames.map(frame => (
                          <label
                            key={frame.node_id}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800/60 cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={selected.has(frame.node_id)}
                              onChange={() => toggleFrame(frame.node_id)}
                              className="w-4 h-4 rounded accent-purple-500 flex-shrink-0"
                            />
                            <span className="text-white text-sm">{frame.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {importError && (
              <div className="px-5 py-2 text-red-400 text-xs">{importError}</div>
            )}

            <div className="px-5 py-4 border-t border-slate-700 flex items-center justify-between">
              <p className="text-slate-400 text-sm">{selected.size} frame{selected.size !== 1 ? 's' : ''} selected</p>
              <button
                onClick={importSelected}
                disabled={selected.size === 0 || importing}
                className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
              >
                {importing ? (
                  <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Importing...</>
                ) : (
                  <>Import {selected.size > 0 ? selected.size : ''} frame{selected.size !== 1 ? 's' : ''}</>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function LibraryTab({ tenantId, sessionId }: Props) {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('library')
  const [generatedAssets, setGeneratedAssets] = useState<CreativeAsset[]>([])
  const [referenceAssets, setReferenceAssets] = useState<CreativeAsset[]>([])
  const [generatedLoading, setGeneratedLoading] = useState(true)
  const [referenceLoading, setReferenceLoading] = useState(false)
  const [referenceLoaded, setReferenceLoaded] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [lightboxAsset, setLightboxAsset] = useState<CreativeAsset | null>(null)
  const [showFigmaModal, setShowFigmaModal] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const asset = await figmaApi.uploadFile(sessionId, tenantId, file)
      setReferenceAssets(prev => [asset, ...prev])
    } catch { /* noop */ } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const loadGenerated = async () => {
    setGeneratedLoading(true)
    try {
      const res = await creativeStudioApi.listAssets(tenantId, sessionId, { asset_type: 'generated', limit: 100 })
      setGeneratedAssets(res.assets ?? [])
    } catch {
      setGeneratedAssets([])
    } finally {
      setGeneratedLoading(false)
    }
  }

  const loadReference = async () => {
    setReferenceLoading(true)
    try {
      const res = await creativeStudioApi.listAssets(tenantId, sessionId, { asset_type: 'reference', limit: 100 })
      setReferenceAssets(res.assets ?? [])
    } catch {
      setReferenceAssets([])
    } finally {
      setReferenceLoading(false)
      setReferenceLoaded(true)
    }
  }

  useEffect(() => { loadGenerated() }, [tenantId, sessionId])

  const handleSubTabChange = (tab: SubTab) => {
    setActiveSubTab(tab)
    if (tab === 'assets' && !referenceLoaded) loadReference()
  }

  const handleDeleteGenerated = async (assetId: string) => {
    try {
      await creativeStudioApi.deleteAsset(tenantId, sessionId, assetId)
      setGeneratedAssets(prev => prev.filter(a => a.asset_id !== assetId))
    } catch { /* noop */ }
  }

  const handleDeleteReference = async (assetId: string) => {
    try {
      await creativeStudioApi.deleteAsset(tenantId, sessionId, assetId)
      setReferenceAssets(prev => prev.filter(a => a.asset_id !== assetId))
    } catch { /* noop */ }
  }

  const filteredGenerated = generatedAssets.filter(a => {
    if (mediaFilter !== 'all' && a.media_type !== mediaFilter) return false
    if (statusFilter !== 'all' && a.status !== statusFilter) return false
    if (searchTerm && !a.prompt?.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  return (
    <div>
      {showFigmaModal && (
        <FigmaImportModal
          tenantId={tenantId}
          sessionId={sessionId}
          onImported={newAssets => setReferenceAssets(prev => [...newAssets, ...prev])}
          onClose={() => setShowFigmaModal(false)}
        />
      )}

      {lightboxAsset && (
        <LightboxModal asset={lightboxAsset} tenantId={tenantId} sessionId={sessionId} onClose={() => setLightboxAsset(null)} />
      )}

      {/* Sub-tab row — replaces the old "Asset Library" heading */}
      <div className="flex flex-wrap gap-3 items-center mb-5">
        {/* Assets / Library tabs */}
        <div className="flex gap-1 bg-slate-800 rounded-lg p-1">
          {(['assets', 'library'] as SubTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => handleSubTabChange(tab)}
              className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-colors ${
                activeSubTab === tab ? 'bg-purple-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab === 'assets' ? 'Assets' : 'Library'}
            </button>
          ))}
        </div>

        {/* Library tab: search + filters inline */}
        {activeSubTab === 'library' && (
          <>
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by prompt..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
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
              onChange={e => setStatusFilter(e.target.value as StatusFilter)}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="processing">Processing</option>
              <option value="failed">Failed</option>
            </select>
            <button onClick={loadGenerated} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Assets tab: Upload + Figma + refresh */}
        {activeSubTab === 'assets' && (
          <div className="flex gap-2 ml-auto">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {uploading
                ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Uploading...</>
                : <><Upload className="w-4 h-4" /> Upload File</>
              }
            </button>
            <button
              onClick={() => setShowFigmaModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Frame className="w-4 h-4" />
              Import from Figma
            </button>
            <button onClick={loadReference} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Count row + view toggle */}
      <div className="flex items-center justify-between mb-4">
        {activeSubTab === 'library' ? (
          <p className="text-slate-400 text-sm">Showing {filteredGenerated.length} of {generatedAssets.length} assets</p>
        ) : (
          <p className="text-slate-400 text-sm">{referenceAssets.length} reference {referenceAssets.length === 1 ? 'asset' : 'assets'}</p>
        )}
        {activeSubTab === 'library' && (
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
        )}
      </div>

      {/* Library tab content */}
      {activeSubTab === 'library' && (
        generatedLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-400">Loading library...</p>
            </div>
          </div>
        ) : filteredGenerated.length === 0 ? (
          <div className="text-center py-16">
            <Video className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 mb-2">{generatedAssets.length === 0 ? 'No assets yet' : 'No assets match your filters'}</p>
            <p className="text-slate-500 text-sm">{generatedAssets.length === 0 ? 'Generate your first image or video in the Create or Imagine tabs' : 'Try adjusting your filters'}</p>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'space-y-4'}>
            {filteredGenerated.map(asset => (
              <AssetCard key={asset.asset_id} asset={asset} tenantId={tenantId} sessionId={sessionId} onDelete={handleDeleteGenerated} onView={setLightboxAsset} />
            ))}
          </div>
        )
      )}

      {/* Assets tab content */}
      {activeSubTab === 'assets' && (
        referenceLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-400">Loading assets...</p>
            </div>
          </div>
        ) : referenceAssets.length === 0 ? (
          <div className="text-center py-16">
            <Frame className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 mb-2">No reference assets yet</p>
            <p className="text-slate-500 text-sm">Import frames from Figma to use as references in your generations</p>
            <button
              onClick={() => setShowFigmaModal(true)}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-medium transition-colors mx-auto"
            >
              <Frame className="w-4 h-4" />
              Import from Figma
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {referenceAssets.map(asset => (
              <ReferenceAssetCard key={asset.asset_id} asset={asset} onDelete={handleDeleteReference} />
            ))}
          </div>
        )
      )}
    </div>
  )
}
