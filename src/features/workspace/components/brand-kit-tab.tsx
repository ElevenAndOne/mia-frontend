import { useEffect, useRef, useState } from 'react'
import { Plus } from '../../../components/icon/plus'
import { Trash01 } from '../../../components/icon/trash-01'
import { Spinner } from '../../../components/spinner'
import { useToast } from '../../../contexts/toast-context'
import { apiFetch } from '../../../utils/api'

interface PaletteColor {
  name?: string
  hex: string
}

interface BrandAssetEntry {
  asset_id: string
  cdn_url: string
  filename?: string | null
}

interface BrandKitData {
  font_family: string | null
  palette: PaletteColor[]
  imagery_style: string | null
  logo: BrandAssetEntry | null
  product_refs: BrandAssetEntry[]
}

// A short well-known list for the datalist — any Google Fonts family typed in works too.
const POPULAR_FONTS = [
  'Inter', 'Poppins', 'Montserrat', 'Roboto', 'Open Sans', 'Lato', 'Raleway',
  'Playfair Display', 'DM Sans', 'Nunito Sans', 'Barlow', 'Jost', 'Arimo', 'Oswald',
]

/**
 * Workspace Settings → Brand Kit: the visual production settings every chat in this
 * workspace uses silently — default headline font (Google Fonts), exact palette,
 * imagery-style note, logo, and product reference photos the image model matches
 * (docs/CHAT_IMAGE_GEN_SCOPE.md D6 + the image-history report).
 */
export const BrandKitTab = ({
  sessionId,
  tenantId,
  canManage,
}: {
  sessionId: string | null
  tenantId: string
  canManage: boolean
}) => {
  const { showToast } = useToast()
  const [kit, setKit] = useState<BrandKitData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [fontFamily, setFontFamily] = useState('')
  const [imageryStyle, setImageryStyle] = useState('')
  const [palette, setPalette] = useState<PaletteColor[]>([])
  const [uploadingKind, setUploadingKind] = useState<'logo' | 'product' | null>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const productInputRef = useRef<HTMLInputElement>(null)

  const headers = { 'X-Session-ID': sessionId ?? '' }
  const base = `/api/tenants/${tenantId}/brand-kit`

  const applyKit = (data: BrandKitData) => {
    setKit(data)
    setFontFamily(data.font_family ?? '')
    setImageryStyle(data.imagery_style ?? '')
    setPalette(data.palette ?? [])
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await apiFetch(base, { headers })
        if (!res.ok) throw new Error(`Failed to load Brand Kit (${res.status})`)
        const data = (await res.json()) as BrandKitData
        if (!cancelled) applyKit(data)
      } catch {
        if (!cancelled) showToast('error', "Couldn't load the Brand Kit.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId])

  const saveSettings = async () => {
    setSaving(true)
    try {
      const res = await apiFetch(base, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          font_family: fontFamily.trim() || null,
          imagery_style: imageryStyle.trim() || null,
          palette: palette.filter((c) => c.hex?.trim()),
        }),
      })
      if (!res.ok) throw new Error(String(res.status))
      applyKit((await res.json()) as BrandKitData)
      showToast('success', 'Brand Kit saved')
    } catch {
      showToast('error', "Couldn't save the Brand Kit.")
    } finally {
      setSaving(false)
    }
  }

  const uploadAsset = async (kind: 'logo' | 'product', file: File) => {
    setUploadingKind(kind)
    try {
      const form = new FormData()
      form.append('kind', kind)
      form.append('file', file)
      const res = await apiFetch(`${base}/assets`, { method: 'POST', headers, body: form })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Upload failed' }))
        throw new Error(err.detail || 'Upload failed')
      }
      applyKit((await res.json()) as BrandKitData)
      showToast('success', kind === 'logo' ? 'Logo uploaded' : 'Reference added')
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploadingKind(null)
    }
  }

  const deleteAsset = async (assetId: string) => {
    try {
      const res = await apiFetch(`${base}/assets/${assetId}`, { method: 'DELETE', headers })
      if (!res.ok) throw new Error(String(res.status))
      applyKit((await res.json()) as BrandKitData)
    } catch {
      showToast('error', "Couldn't remove that image.")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="md" variant="dark" />
      </div>
    )
  }
  if (!kit) return null

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h2 className="heading-sm text-primary">Brand Kit</h2>
        <p className="paragraph-sm text-secondary mt-1">
          Set once — every image Mia makes in this workspace uses these automatically.
        </p>
      </div>

      {/* Font */}
      <div className="p-4 bg-secondary rounded-xl border border-tertiary space-y-2">
        <label className="paragraph-sm font-medium text-primary">Headline font</label>
        <p className="paragraph-xs text-quaternary">
          Any Google Fonts family — used for every headline and placement set. Paid fonts
          (e.g. Helvetica) are matched to their closest free equivalent.
        </p>
        <input
          list="brand-kit-fonts"
          value={fontFamily}
          onChange={(e) => setFontFamily(e.target.value)}
          disabled={!canManage}
          placeholder="e.g. Poppins"
          className="w-full max-w-sm bg-primary text-primary paragraph-sm rounded-lg px-3 py-2 border border-tertiary focus:border-brand-primary outline-none disabled:opacity-60"
        />
        <datalist id="brand-kit-fonts">
          {POPULAR_FONTS.map((f) => (
            <option key={f} value={f} />
          ))}
        </datalist>
      </div>

      {/* Palette */}
      <div className="p-4 bg-secondary rounded-xl border border-tertiary space-y-3">
        <label className="paragraph-sm font-medium text-primary">Brand colours</label>
        <p className="paragraph-xs text-quaternary">
          Exact hexes Mia uses for text and steers imagery toward.
        </p>
        <div className="space-y-2">
          {palette.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="color"
                value={/^#[0-9a-fA-F]{6}$/.test(c.hex) ? c.hex : '#FFFFFF'}
                onChange={(e) =>
                  setPalette((p) => p.map((x, j) => (j === i ? { ...x, hex: e.target.value } : x)))
                }
                disabled={!canManage}
                className="w-9 h-9 rounded border border-tertiary bg-transparent cursor-pointer disabled:cursor-default"
              />
              <input
                value={c.hex}
                onChange={(e) =>
                  setPalette((p) => p.map((x, j) => (j === i ? { ...x, hex: e.target.value } : x)))
                }
                disabled={!canManage}
                placeholder="#EE741E"
                className="w-28 bg-primary text-primary paragraph-sm rounded-lg px-2 py-1.5 border border-tertiary outline-none disabled:opacity-60"
              />
              <input
                value={c.name ?? ''}
                onChange={(e) =>
                  setPalette((p) => p.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
                }
                disabled={!canManage}
                placeholder="Name (optional)"
                className="flex-1 max-w-[200px] bg-primary text-primary paragraph-sm rounded-lg px-2 py-1.5 border border-tertiary outline-none disabled:opacity-60"
              />
              {canManage && (
                <button
                  onClick={() => setPalette((p) => p.filter((_, j) => j !== i))}
                  className="p-1.5 rounded-lg text-quaternary hover:text-error hover:bg-tertiary"
                  aria-label="Remove colour"
                >
                  <Trash01 size={15} />
                </button>
              )}
            </div>
          ))}
        </div>
        {canManage && palette.length < 16 && (
          <button
            onClick={() => setPalette((p) => [...p, { name: '', hex: '#' }])}
            className="flex items-center gap-1.5 paragraph-sm text-brand-solid hover:underline"
          >
            <Plus size={15} /> Add colour
          </button>
        )}
      </div>

      {/* Imagery style */}
      <div className="p-4 bg-secondary rounded-xl border border-tertiary space-y-2">
        <label className="paragraph-sm font-medium text-primary">Imagery style</label>
        <p className="paragraph-xs text-quaternary">
          One or two sentences describing how this brand's photos should look. Applied to
          every generation unless the request says otherwise.
        </p>
        <textarea
          value={imageryStyle}
          onChange={(e) => setImageryStyle(e.target.value)}
          disabled={!canManage}
          rows={2}
          maxLength={600}
          placeholder="e.g. Bright warm natural daylight, luminous creams, tactile produce — never glossy or over-saturated."
          className="w-full bg-primary text-primary paragraph-sm rounded-lg px-3 py-2 border border-tertiary focus:border-brand-primary outline-none resize-y disabled:opacity-60"
        />
      </div>

      {canManage && (
        <button
          onClick={saveSettings}
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-brand-solid text-primary-onbrand paragraph-sm font-medium disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Brand Kit'}
        </button>
      )}

      {/* Logo */}
      <div className="p-4 bg-secondary rounded-xl border border-tertiary space-y-3">
        <label className="paragraph-sm font-medium text-primary">Logo</label>
        <p className="paragraph-xs text-quaternary">
          Transparent PNG works best — "add our logo" in chat uses this file.
        </p>
        <div className="flex items-center gap-3">
          {kit.logo ? (
            <div className="relative group">
              <img
                src={kit.logo.cdn_url}
                alt="Workspace logo"
                className="h-16 w-auto max-w-[160px] object-contain rounded-lg border border-tertiary bg-primary p-2"
              />
              {canManage && (
                <button
                  onClick={() => deleteAsset(kit.logo!.asset_id)}
                  className="absolute -top-2 -right-2 p-1 rounded-full bg-error-solid text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Remove logo"
                >
                  <Trash01 size={12} />
                </button>
              )}
            </div>
          ) : (
            <span className="paragraph-sm text-quaternary">No logo uploaded</span>
          )}
          {canManage && (
            <>
              <button
                onClick={() => logoInputRef.current?.click()}
                disabled={uploadingKind !== null}
                className="px-3 py-1.5 rounded-lg border border-tertiary paragraph-sm text-secondary hover:bg-tertiary disabled:opacity-50"
              >
                {uploadingKind === 'logo' ? 'Uploading…' : kit.logo ? 'Replace' : 'Upload logo'}
              </button>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) uploadAsset('logo', f)
                  e.target.value = ''
                }}
              />
            </>
          )}
        </div>
      </div>

      {/* Product references */}
      <div className="p-4 bg-secondary rounded-xl border border-tertiary space-y-3">
        <label className="paragraph-sm font-medium text-primary">Product reference photos</label>
        <p className="paragraph-xs text-quaternary">
          Real photos of the actual products (fruit, packaging, equipment). Mia shows these
          to the image model so generated products match reality, not a generic lookalike.
        </p>
        <div className="flex flex-wrap gap-3">
          {kit.product_refs.map((a) => (
            <div key={a.asset_id} className="relative group">
              <img
                src={a.cdn_url}
                alt={a.filename ?? 'Product reference'}
                className="h-24 w-24 object-cover rounded-lg border border-tertiary"
              />
              {canManage && (
                <button
                  onClick={() => deleteAsset(a.asset_id)}
                  className="absolute -top-2 -right-2 p-1 rounded-full bg-error-solid text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Remove reference"
                >
                  <Trash01 size={12} />
                </button>
              )}
            </div>
          ))}
          {canManage && (
            <>
              <button
                onClick={() => productInputRef.current?.click()}
                disabled={uploadingKind !== null}
                className="h-24 w-24 rounded-lg border border-dashed border-tertiary flex flex-col items-center justify-center gap-1 text-quaternary hover:text-secondary hover:border-secondary disabled:opacity-50"
              >
                {uploadingKind === 'product' ? (
                  <Spinner size="sm" variant="dark" />
                ) : (
                  <>
                    <Plus size={18} />
                    <span className="paragraph-xs">Add</span>
                  </>
                )}
              </button>
              <input
                ref={productInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) uploadAsset('product', f)
                  e.target.value = ''
                }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
