import { useRef, useState } from 'react'
import { Modal } from '../../overlay'
import { Trash01 } from '../../../components/icon/trash-01'
import { Type01 } from '../../../components/icon/type-01'
import { Upload01 } from '../../../components/icon/upload-01'
import { apiFetch } from '../../../utils/api'
import {
  FONT_WEIGHT_NAMES as WEIGHT,
  fontList as list,
  paidFontsLine,
  type FontStatus,
  type OwnFont,
} from './brand-fonts'

/**
 * Settings → Brand → Fonts: their own font files (services/brand_fonts). Kept for this workspace
 * only, never shared or shown to anyone else; they tick that they may use them for their posts.
 */
export const BrandFontsRow = ({
  sessionId,
  tenantId,
  canManage,
  ownFonts,
  status,
  onChanged,
}: {
  sessionId: string
  tenantId: string
  canManage: boolean
  ownFonts: OwnFont[]
  status: FontStatus[]
  onChanged: (kit: unknown) => void
}) => {
  const [open, setOpen] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [rights, setRights] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const base = `/api/tenants/${tenantId}/brand-kit/fonts`
  const headers = { 'X-Session-ID': sessionId }

  const families = [...new Set(ownFonts.map((f) => f.family))]
  const paid = paidFontsLine(status)
  const sub = families.length
    ? `${list(families)}: your own files, used on your posts.`
    : (paid ?? 'Got paid brand fonts? Upload the files and your posts use them.')

  const close = () => {
    setOpen(false)
    setFiles([])
    setRights(false)
    setError(null)
  }

  const upload = async () => {
    setBusy(true)
    setError(null)
    try {
      const form = new FormData()
      files.forEach((f) => form.append('files', f))
      form.append('rights', 'true')
      const res = await apiFetch(base, { method: 'POST', headers, body: form })
      const got = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(got.detail || "Mia couldn't add those fonts.")
      const added = (got.fonts_added ?? []) as { family: string; weight: number }[]
      const skipped = (got.fonts_skipped ?? []) as string[]
      setNote(
        added.length
          ? `Added ${list([...new Set(added.map((a) => a.family))])}.${skipped.length ? ` ${skipped[0]}` : ''}`
          : skipped[0] || 'Those fonts were already here.'
      )
      onChanged(got)
      close()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Mia couldn't add those fonts.")
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id: string) => {
    const res = await apiFetch(`${base}/${id}`, { method: 'DELETE', headers }).catch(() => null)
    if (res?.ok) {
      setNote(null)
      onChanged(await res.json())
    } else {
      const got = res ? await res.json().catch(() => ({})) : {}
      setNote(got.detail || "Mia couldn't remove that font. Try again.")
    }
  }

  return (
    <div className="px-4 py-3.5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-tertiary text-secondary flex items-center justify-center shrink-0">
          <Type01 size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="subheading-md text-primary">Your fonts</p>
          <p
            className={`paragraph-xs ${paid && !families.length ? 'text-secondary' : 'text-quaternary'}`}
          >
            {sub}
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={
              paid && !families.length
                ? 'px-3.5 py-1.5 rounded-full bg-brand-solid text-primary-onbrand paragraph-xs font-medium'
                : 'px-3 py-1.5 border border-primary rounded-full paragraph-xs text-secondary hover:bg-tertiary transition-colors'
            }
          >
            Upload
          </button>
        )}
      </div>

      {families.length > 0 && (
        <ul className="mt-3 ml-12 flex flex-col gap-1.5">
          {ownFonts.map((f) => (
            <li key={f.id} className="flex items-center gap-2 paragraph-xs text-secondary">
              <span className="min-w-0 flex-1 truncate">
                {f.family} {WEIGHT[f.weight] ?? f.weight}
                {f.italic ? ' Italic' : ''}
              </span>
              {canManage && (
                <button
                  type="button"
                  onClick={() => void remove(f.id)}
                  className="p-1 rounded text-quaternary hover:text-error hover:bg-tertiary"
                  aria-label={`Remove ${f.family} ${WEIGHT[f.weight] ?? f.weight}`}
                >
                  <Trash01 size={14} />
                </button>
              )}
            </li>
          ))}
          {paid && <li className="paragraph-xs text-quaternary">{paid}</li>}
        </ul>
      )}
      {note && <p className="mt-2 ml-12 paragraph-xs text-quaternary">{note}</p>}

      <Modal isOpen={open} onClose={close} size="sm" panelClassName="p-6">
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="heading-xs text-primary">Upload your fonts</h2>
            <p className="paragraph-sm text-tertiary mt-1">
              The font files you bought, or the .zip they came in. Add the bold weight for headlines
              and the regular one for other words. Only this workspace uses them.
            </p>
          </div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="rounded-xl border-[1.5px] border-dashed border-primary px-4 py-6 flex flex-col items-center gap-2 text-secondary hover:bg-secondary transition-colors"
          >
            <Upload01 size={24} />
            <span className="paragraph-sm">
              {files.length ? list(files.map((f) => f.name)) : 'Choose files'}
            </span>
            <span className="paragraph-xs text-quaternary">
              .ttf, .otf, .woff or .zip, up to 5 MB a font
            </span>
          </button>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".ttf,.otf,.woff,.zip,font/ttf,font/otf,font/woff,application/zip"
            className="hidden"
            onChange={(e) => {
              setFiles(Array.from(e.target.files ?? []))
              e.target.value = ''
            }}
          />
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={rights}
              onChange={(e) => setRights(e.target.checked)}
              className="mt-0.5 w-4 h-4 shrink-0"
            />
            <span className="paragraph-sm text-secondary">
              I have the right to use these fonts for my business's social posts.
            </span>
          </label>
          {error && <p className="paragraph-sm text-error">{error}</p>}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void upload()}
              disabled={busy || !rights || files.length === 0}
              className="px-4 py-2 rounded-full bg-brand-solid text-primary-onbrand paragraph-sm font-medium disabled:opacity-50"
            >
              {busy ? 'Uploading…' : 'Upload'}
            </button>
            <button
              type="button"
              onClick={close}
              className="px-4 py-2 rounded-full border border-primary paragraph-sm text-secondary hover:bg-tertiary"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
