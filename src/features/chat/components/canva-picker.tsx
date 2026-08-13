/**
 * "From Canva" design picker — thumbnail browser over the workspace's
 * connected Canva account (mock: the approved 3-frame flow artifact).
 *
 * Self-contained (reads session/workspace itself, CsvDatasetsCard pattern) so
 * both hosts stay thin: the chat canvas maps imported assets to `Media:` lines,
 * the Mia Create library prepends them to its asset grid.
 *
 * Import is capped at 3 designs per call server-side (Canva exports are
 * 20/min per user); multi-page designs land one image per page (carousel).
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useSession } from '../../../contexts/session-context'
import { canvaApi, type CanvaDesign, type CanvaImportedAsset } from '../services/canva-api'

const MAX_SELECT = 3

interface CanvaPickerProps {
  onClose: () => void
  onImported: (assets: CanvaImportedAsset[]) => void
}

const relTime = (updated?: number | string) => {
  if (!updated) return ''
  const ts = typeof updated === 'number' ? updated * 1000 : Date.parse(updated)
  if (Number.isNaN(ts)) return ''
  const days = Math.floor((Date.now() - ts) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return '1d ago'
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  return weeks === 1 ? '1w ago' : `${weeks}w ago`
}

export const CanvaPicker = ({ onClose, onImported }: CanvaPickerProps) => {
  const { sessionId, activeWorkspace } = useSession()
  const tenantId = activeWorkspace?.tenant_id ?? ''
  const sid = sessionId ?? ''

  const [designs, setDesigns] = useState<CanvaDesign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [importing, setImporting] = useState(false)
  const searchRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const fetchDesigns = useCallback(
    async (q: string) => {
      if (!sid || !tenantId) return
      setLoading(true)
      setError(null)
      try {
        const { designs: items } = await canvaApi.listDesigns(sid, tenantId, q || undefined)
        setDesigns(items)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load Canva designs')
      } finally {
        setLoading(false)
      }
    },
    [sid, tenantId]
  )

  useEffect(() => {
    fetchDesigns('')
  }, [fetchDesigns])

  const onSearch = (q: string) => {
    setQuery(q)
    if (searchRef.current) clearTimeout(searchRef.current)
    searchRef.current = setTimeout(() => fetchDesigns(q), 400)
  }

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else if (next.size < MAX_SELECT) next.add(id)
      return next
    })
  }

  const doImport = async () => {
    if (selected.size === 0 || importing) return
    setImporting(true)
    setError(null)
    try {
      const picked = designs.filter((d) => selected.has(d.design_id))
      const { assets } = await canvaApi.importDesigns(
        sid,
        tenantId,
        picked.map((d) => ({ design_id: d.design_id, title: d.title }))
      )
      onImported(assets)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed')
      setImporting(false)
    }
  }

  const singleSelected =
    selected.size === 1 ? designs.find((d) => selected.has(d.design_id)) : null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-4"
      onClick={onClose}
    >
      <div
        className="bg-primary border border-tertiary rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-tertiary">
          <div
            aria-hidden="true"
            className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-white font-bold font-serif"
            style={{ background: 'linear-gradient(135deg,#00C4CC,#7D2AE8)' }}
          >
            C
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="subheading-md text-primary">Import from Canva</h3>
            <p className="paragraph-xs text-quaternary truncate">
              Multi-page designs import one image per page (carousel)
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-quaternary hover:text-secondary hover:bg-tertiary"
          >
            ✕
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pt-3">
          <input
            type="text"
            value={query}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search your designs…"
            className="w-full px-3 py-2 border border-tertiary rounded-lg paragraph-sm bg-primary text-primary outline-none focus:border-utility-brand-400"
          />
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <p className="paragraph-sm text-quaternary text-center py-8">Loading designs…</p>
          ) : error ? (
            <p className="paragraph-sm text-utility-error-600 text-center py-8">{error}</p>
          ) : designs.length === 0 ? (
            <p className="paragraph-sm text-quaternary text-center py-8">
              {query ? `No designs matching “${query}”` : 'No designs in this Canva account yet'}
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {designs.map((d) => {
                const isSel = selected.has(d.design_id)
                return (
                  <button
                    key={d.design_id}
                    type="button"
                    onClick={() => toggle(d.design_id)}
                    className={`relative text-left rounded-xl overflow-hidden border-2 transition-all ${
                      isSel
                        ? 'border-utility-brand-400 ring-2 ring-utility-brand-400/30'
                        : 'border-tertiary hover:border-utility-brand-400/50'
                    }`}
                  >
                    <div className="aspect-[4/3] bg-tertiary flex items-center justify-center overflow-hidden">
                      {d.thumbnail_url ? (
                        <img
                          src={d.thumbnail_url}
                          alt={d.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <span className="paragraph-xs text-quaternary px-2 text-center">
                          {d.title}
                        </span>
                      )}
                    </div>
                    {isSel && (
                      <span className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-brand-solid text-primary-onbrand text-[11px] font-bold flex items-center justify-center">
                        ✓
                      </span>
                    )}
                    {(d.page_count ?? 1) > 1 && (
                      <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full bg-black/55 text-white label-xs">
                        {d.page_count} pages
                      </span>
                    )}
                    <div className="px-2 py-1.5 flex items-center justify-between gap-1.5 bg-primary">
                      <span className="paragraph-xs text-primary font-medium truncate">
                        {d.title}
                      </span>
                      <span className="paragraph-xs text-quaternary shrink-0">
                        {relTime(d.updated_at)}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-4 py-3 border-t border-tertiary">
          <span className="paragraph-xs text-quaternary mr-auto">
            {selected.size > 0
              ? `${selected.size} of ${MAX_SELECT} selected`
              : `Select up to ${MAX_SELECT} designs`}
          </span>
          {singleSelected?.edit_url && (
            <a
              href={singleSelected.edit_url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg border border-tertiary paragraph-sm text-secondary hover:bg-tertiary"
            >
              Edit in Canva ↗
            </a>
          )}
          <button
            type="button"
            disabled={selected.size === 0 || importing}
            onClick={doImport}
            className="px-4 py-1.5 rounded-lg bg-brand-solid text-primary-onbrand paragraph-sm font-medium disabled:opacity-40"
          >
            {importing
              ? 'Importing…'
              : `Import ${selected.size || ''} design${selected.size === 1 ? '' : 's'}`.replace(
                  '  ',
                  ' '
                )}
          </button>
        </div>
      </div>
    </div>
  )
}
