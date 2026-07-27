import { useCallback, useEffect, useState } from 'react'
import { useCampaignWorkspace } from '../../contexts/campaign-context'
import { browseDriveFolder } from '../../services/campaign-api'
import type { DriveFile, DriveFolderListing } from '../../types'

interface Props {
  folderUrl: string // Drive folder link (or bare ID) to open first
  maxSelect: number // 1 for static/video assets, 10 for carousels
  onSave: (files: DriveFile[]) => void
  onClose: () => void
}

// Browse a link-shared Drive delivery folder and pick the approved creative(s).
// Files arrive natural-sorted (Fr01, Fr02, … Fr10), selection order = carousel
// card order — badges show it, the strip below drag-reorders it.
export const DrivePickerModal = ({ folderUrl, maxSelect, onSave, onClose }: Props) => {
  const { tenantId, sessionId } = useCampaignWorkspace()
  const [listing, setListing] = useState<DriveFolderListing | null>(null)
  const [crumbs, setCrumbs] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<DriveFile[]>([])
  const [dragFrom, setDragFrom] = useState<number | null>(null)

  // crumbTo: 'reset' = fresh root, 'push' = descend, number = jump back to that crumb
  const load = useCallback(
    (target: string, crumbTo: 'reset' | 'push' | number) => {
      setLoading(true)
      setError('')
      browseDriveFolder(sessionId, tenantId, target)
        .then((l) => {
          setListing(l)
          const crumb = { id: l.folder_id, name: l.folder_name || 'Folder' }
          setCrumbs((prev) =>
            crumbTo === 'reset' ? [crumb] : crumbTo === 'push' ? [...prev, crumb] : prev.slice(0, crumbTo + 1),
          )
        })
        .catch((e: Error) => setError(e.message))
        .finally(() => setLoading(false))
    },
    [sessionId, tenantId],
  )

  useEffect(() => {
    load(folderUrl, 'reset')
  }, [folderUrl, load])

  const files: DriveFile[] = listing ? [...listing.images, ...listing.videos] : []

  const toggle = (f: DriveFile) =>
    setSelected((prev) => {
      if (prev.some((p) => p.id === f.id)) return prev.filter((p) => p.id !== f.id)
      if (maxSelect === 1) return [f]
      return prev.length >= maxSelect ? prev : [...prev, f]
    })

  const reorder = (to: number) => {
    if (dragFrom == null || dragFrom === to) return
    setSelected((prev) => {
      const next = [...prev]
      const [moved] = next.splice(dragFrom, 1)
      next.splice(to, 0, moved)
      return next
    })
    setDragFrom(to)
  }

  return (
    <div className="campaign-workspace fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className="bg-secondary rounded-2xl border border-secondary p-6 max-w-2xl w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-utility-brand-100 shrink-0">
            <svg className="w-5 h-5 text-utility-brand-600" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
            </svg>
          </div>
          <h2 className="title-h6 text-primary">Choose creatives from Drive</h2>
        </div>
        <p className="paragraph-sm text-tertiary mb-3">
          {maxSelect > 1
            ? `Pick up to ${maxSelect} in the order the carousel cards should run — drag below to rearrange.`
            : 'Pick the approved creative for this ad.'}
        </p>

        {crumbs.length > 0 && (
          <div className="flex items-center gap-1 mb-3 flex-wrap">
            {crumbs.map((c, i) => (
              <span key={c.id} className="flex items-center gap-1">
                {i > 0 && <span className="text-quaternary paragraph-xs">/</span>}
                <button
                  onClick={() => i < crumbs.length - 1 && load(c.id, i)}
                  className={`label-xs font-semibold ${i === crumbs.length - 1 ? 'text-primary' : 'text-utility-brand-600 hover:underline'}`}
                >
                  {c.name}
                </button>
              </span>
            ))}
          </div>
        )}

        {error && <p className="mb-3 paragraph-xs text-utility-error-700">{error}</p>}
        {loading && <p className="mb-3 paragraph-sm text-tertiary">Loading folder…</p>}

        {!loading && !error && listing && (
          <div className="max-h-96 overflow-y-auto mb-4 space-y-3">
            {listing.folders.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {listing.folders.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => load(f.id, 'push')}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-secondary rounded-lg bg-primary label-xs font-semibold text-secondary hover:border-utility-brand-400"
                  >
                    <svg className="w-3.5 h-3.5 text-quaternary" fill="currentColor" viewBox="0 0 24 24"><path d="M10 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2h-8l-2-2z" /></svg>
                    {f.name}
                  </button>
                ))}
              </div>
            )}

            {files.length > 0 ? (
              <div className="grid grid-cols-4 gap-2">
                {files.map((f) => {
                  const order = selected.findIndex((p) => p.id === f.id)
                  return (
                    <button
                      key={f.id}
                      onClick={() => toggle(f)}
                      title={f.name}
                      className={`relative rounded-lg overflow-hidden border-2 text-left ${
                        order >= 0 ? 'border-utility-brand-500' : 'border-transparent hover:border-tertiary'
                      }`}
                    >
                      <img src={f.thumbnail_url} alt={f.name} loading="lazy" className="w-full h-28 object-cover bg-tertiary" />
                      {f.mime_type.startsWith('video/') && (
                        <span className="absolute bottom-6 right-1.5 label-xs font-semibold text-white bg-black/60 rounded px-1">▶</span>
                      )}
                      {order >= 0 && (
                        <span className="absolute top-1.5 right-1.5 w-5 h-5 flex items-center justify-center rounded-full bg-utility-brand-500 text-white label-xs font-bold">
                          {order + 1}
                        </span>
                      )}
                      <span className="block px-1.5 py-1 paragraph-xs text-tertiary truncate bg-primary">{f.name}</span>
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="paragraph-sm text-tertiary text-center py-6">
                No images or videos in this folder{listing.folders.length > 0 ? ' — try a subfolder above.' : '.'}
              </p>
            )}
          </div>
        )}

        {selected.length > 1 && (
          <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1" onDragOver={(e) => e.preventDefault()}>
            {selected.map((f, i) => (
              <div
                key={f.id}
                draggable
                onDragStart={() => setDragFrom(i)}
                onDragEnter={() => reorder(i)}
                onDragEnd={() => setDragFrom(null)}
                title={`${i + 1}. ${f.name} — drag to reorder`}
                className={`relative shrink-0 w-14 h-14 rounded-md overflow-hidden border cursor-grab ${dragFrom === i ? 'opacity-50' : ''} border-secondary`}
              >
                <img src={f.thumbnail_url} alt={f.name} className="w-full h-full object-cover" />
                <span className="absolute top-0.5 left-0.5 w-4 h-4 flex items-center justify-center rounded-full bg-black/70 text-white label-xs font-bold">
                  {i + 1}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-3 border border-secondary rounded-lg subheading-md text-secondary hover:bg-tertiary">
            Cancel
          </button>
          {maxSelect > 1 && files.length > 1 && selected.length === 0 && (
            <button
              onClick={() => setSelected(files.slice(0, maxSelect))}
              className="flex-1 px-4 py-3 border border-utility-brand-400 rounded-lg subheading-md text-utility-brand-600 hover:bg-utility-brand-50"
            >
              Select all ({Math.min(files.length, maxSelect)})
            </button>
          )}
          <button
            onClick={() => onSave(selected)}
            disabled={selected.length === 0}
            className="flex-1 px-4 py-3 bg-utility-brand-600 text-white rounded-lg subheading-md hover:bg-utility-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Use {selected.length || ''} creative{selected.length === 1 ? '' : 's'}
          </button>
        </div>
      </div>
    </div>
  )
}
