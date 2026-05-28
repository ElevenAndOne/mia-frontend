import { useState, useEffect, useRef } from 'react'
import { X, Image, Upload, CheckCircle, Loader2, Info } from 'lucide-react'
import { creativeStudioApi, figmaApi, type CreativeAsset } from './creative-studio-api'

interface Props {
  tenantId: string
  sessionId: string
  value: string[]        // CDN URLs of selected reference images
  onChange: (urls: string[]) => void
  disabled?: boolean
  disabledReason?: string
}

function LibraryModal({ tenantId, sessionId, selected, onToggle, onUpload, onClose, uploading }: {
  tenantId: string; sessionId: string
  selected: string[]; onToggle: (url: string) => void
  onUpload: (file: File) => void; onClose: () => void; uploading: boolean
}) {
  const [assets, setAssets] = useState<CreativeAsset[]>([])
  const [loading, setLoading] = useState(true)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    creativeStudioApi.listAssets(tenantId, sessionId, { asset_type: 'reference', limit: 50 })
      .then(r => setAssets(r.assets ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [tenantId, sessionId])

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md max-h-[70vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <h3 className="text-white font-semibold text-sm">Pick reference images</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-24">
              <Loader2 className="w-5 h-5 text-purple-500 animate-spin" />
            </div>
          ) : assets.length === 0 ? (
            <div className="text-center py-8">
              <Image className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No reference assets yet</p>
              <p className="text-slate-500 text-xs mt-1">Import from Figma or upload in Library → Assets</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {assets.map(asset => {
                const isSelected = selected.includes(asset.cdn_url)
                return (
                  <button
                    key={asset.asset_id}
                    onClick={() => onToggle(asset.cdn_url)}
                    className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                      isSelected ? 'border-purple-500 ring-2 ring-purple-500/30' : 'border-transparent hover:border-slate-600'
                    }`}
                  >
                    <img src={asset.cdn_url} alt={asset.filename} className="w-full h-full object-cover bg-slate-800" />
                    {isSelected && (
                      <div className="absolute inset-0 bg-purple-500/20 flex items-center justify-center">
                        <CheckCircle className="w-6 h-6 text-purple-400 drop-shadow" />
                      </div>
                    )}
                    {asset.source === 'figma' && (
                      <div className="absolute top-1.5 right-1.5 text-xs px-1.5 py-0.5 bg-slate-900/80 text-purple-300 rounded-full font-medium leading-none">F</div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-slate-700 flex items-center justify-between">
          <label className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded-lg cursor-pointer transition-colors">
            {uploading
              ? <><Loader2 className="w-3 h-3 animate-spin" /> Uploading...</>
              : <><Upload className="w-3 h-3" /> Upload new</>
            }
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept="image/*"
              disabled={uploading}
              onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f) }}
            />
          </label>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Done{selected.length > 0 ? ` · ${selected.length}` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}

export function ReferencePicker({ tenantId, sessionId, value, onChange, disabled, disabledReason }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [uploading, setUploading] = useState(false)

  if (disabled) {
    return (
      <div className="flex items-start gap-2.5 px-3 py-3 bg-slate-800/50 rounded-xl border border-dashed border-slate-700">
        <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
        <p className="text-slate-500 text-xs leading-relaxed">
          {disabledReason ?? 'This model does not support reference images'}
        </p>
      </div>
    )
  }

  const toggle = (url: string) =>
    onChange(value.includes(url) ? value.filter(u => u !== url) : [...value, url])

  const handleUpload = async (file: File) => {
    setUploading(true)
    try {
      const asset = await figmaApi.uploadFile(sessionId, tenantId, file)
      onChange([...value, asset.cdn_url])
    } catch { /* noop */ }
    setUploading(false)
  }

  return (
    <>
      {showModal && (
        <LibraryModal
          tenantId={tenantId} sessionId={sessionId}
          selected={value} onToggle={toggle}
          onUpload={handleUpload} onClose={() => setShowModal(false)}
          uploading={uploading}
        />
      )}

      <div className="space-y-3">
        {value.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {value.map((url, i) => (
              <div key={i} className="relative group aspect-square rounded-lg overflow-hidden bg-slate-800">
                <img src={url} alt={`ref ${i + 1}`} className="w-full h-full object-cover" />
                <button
                  onClick={() => onChange(value.filter(u => u !== url))}
                  className="absolute top-1 right-1 p-0.5 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}
        <button
          onClick={() => setShowModal(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-800 hover:bg-slate-700 border border-dashed border-slate-600 rounded-xl text-slate-400 hover:text-white text-xs font-medium transition-colors"
        >
          <Image className="w-3.5 h-3.5" />
          {value.length === 0 ? 'Add from Library' : 'Edit references'}
        </button>
      </div>
    </>
  )
}
