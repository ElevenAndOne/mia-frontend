import { useEffect, useRef, useState } from 'react'
import { Modal } from '../../overlay'
import { Check } from '../../../components/icon/check'
import { ArrowRight } from '../../../components/icon/arrow-right'
import { Upload01 } from '../../../components/icon/upload-01'
import { Spinner } from '../../../components/spinner'
import { apiFetch } from '../../../utils/api'

interface Colour {
  hex: string
  name?: string
}

interface Found {
  main_colour: string | null
  colours: Colour[]
  headline_font: string | null
  headline_weight: string | null
  body_font: string | null
  body_weight: string | null
  print_fonts: string[]
  online_fonts?: { headline: string | null; body: string | null }
  headline_drawn_as?: string | null
  body_drawn_as?: string | null
  strapline: string | null
  logo_rules: string[]
  service_colours: { service: string; hex: string }[]
  voice: string[]
  pages: number
}

interface ReadResult {
  found: Found
  offered: string[]
  file: { name: string; pages?: number }
  now: { palette: Colour[]; font_family: string | null }
}

const READING = [
  'Reading your pages',
  'Picking out your colours',
  'Finding your fonts',
  'Noting your logo rules',
  'Checking it against what Mia uses now',
]

const ROW_TITLE: Record<string, string> = {
  main_colour: 'Main colour',
  colours: 'Other colours',
  fonts: 'Fonts',
  strapline: 'Strapline',
  logo_rules: 'Logo rules',
  service_colours: 'Colour per service',
  voice: 'How you sound',
}

const Swatch = ({ hex, size = 22 }: { hex: string; size?: number }) => (
  <span
    className="inline-block rounded-md border border-black/10 shrink-0"
    style={{ background: hex, width: size, height: size }}
    title={hex}
  />
)

/**
 * Settings → Brand → "Got a brand guide?": add the PDF, Mia reads it (about 20 seconds),
 * they tick what to use, and the Brand Kit takes it. Nothing changes until "Use these".
 * `file` opens straight on the reading step (a file dropped on the Brand tab).
 */
export const BrandGuideModal = ({
  isOpen,
  onClose,
  sessionId,
  tenantId,
  file,
  onApplied,
}: {
  isOpen: boolean
  onClose: () => void
  sessionId: string | null
  tenantId: string
  file: File | null
  onApplied: () => void
}) => {
  const [step, setStep] = useState<'add' | 'reading' | 'review'>('add')
  const [shown, setShown] = useState(0)
  const [result, setResult] = useState<ReadResult | null>(null)
  const [use, setUse] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [applying, setApplying] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const base = `/api/tenants/${tenantId}/brand-kit`
  const headers = { 'X-Session-ID': sessionId ?? '' }

  const read = async (f: File) => {
    setError(null)
    setStep('reading')
    setShown(0)
    try {
      const form = new FormData()
      form.append('file', f)
      const res = await apiFetch(`${base}/guide`, { method: 'POST', headers, body: form })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || "Mia couldn't read that file.")
      }
      const got = (await res.json()) as ReadResult
      setResult(got)
      setUse(got.offered)
      setStep('review')
    } catch (e) {
      setError(e instanceof Error ? e.message : "Mia couldn't read that file.")
      setStep('add')
    }
  }

  // A file dropped on the Brand tab skips the picker.
  useEffect(() => {
    if (isOpen && file) void read(file)
    if (!isOpen) {
      setStep('add')
      setResult(null)
      setError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, file])

  // The reading lines tick on while Mia reads; the last one waits for the answer.
  useEffect(() => {
    if (step !== 'reading') return
    const t = setInterval(() => setShown((n) => Math.min(n + 1, READING.length - 1)), 3500)
    return () => clearInterval(t)
  }, [step])

  const apply = async () => {
    setApplying(true)
    setError(null)
    try {
      const res = await apiFetch(`${base}/guide/apply`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ use }),
      })
      if (!res.ok) throw new Error(String(res.status))
      onApplied()
      onClose()
    } catch {
      setError("Couldn't save that just now. Try again in a moment.")
    } finally {
      setApplying(false)
    }
  }

  const toggle = (key: string) =>
    setUse((u) => (u.includes(key) ? u.filter((k) => k !== key) : [...u, key]))

  const detail = (key: string, f: Found, now: ReadResult['now']) => {
    if (key === 'main_colour' && f.main_colour) {
      const was = now.palette[0]?.hex
      return (
        <span className="flex items-center gap-1.5 mt-1.5 paragraph-xs text-quaternary">
          {was && was.toUpperCase() !== f.main_colour && (
            <>
              <Swatch hex={was} />
              now
              <ArrowRight size={12} />
            </>
          )}
          <Swatch hex={f.main_colour} />
          {f.main_colour}
        </span>
      )
    }
    if (key === 'colours')
      return (
        <span className="flex flex-wrap gap-1 mt-1.5">
          {f.colours.map((c) => (
            <Swatch key={c.hex} hex={c.hex} />
          ))}
        </span>
      )
    if (key === 'fonts') {
      // The print font wins when it can be drawn (Gotham, drawn as Montserrat); the online one
      // is said as what's for their website (brand_guide_reader.choose_fonts).
      const face = (name: string | null, weight: string | null, drawn?: string | null) =>
        name
          ? `${[name, weight].filter(Boolean).join(' ')}${drawn ? ` (drawn as ${drawn}, its free match)` : ''}`
          : ''
      const head = face(f.headline_font, f.headline_weight, f.headline_drawn_as)
      const body = face(f.body_font, f.body_weight, f.body_drawn_as)
      const online = f.online_fonts?.headline
      const web =
        online && online.toLowerCase() !== (f.headline_font ?? '').toLowerCase()
          ? ` ${online} is your website font.`
          : ''
      return (
        <span className="block paragraph-xs text-quaternary mt-0.5">
          {head && `${head} headlines`}
          {head && body ? ', ' : ''}
          {body && `${body} body`}.{web}
          {now.font_family && f.headline_font && now.font_family !== f.headline_font
            ? ` Mia uses ${now.font_family} now.`
            : ''}
        </span>
      )
    }
    if (key === 'strapline')
      return <span className="block paragraph-xs text-quaternary mt-0.5">{f.strapline}</span>
    if (key === 'logo_rules')
      return (
        <span className="block paragraph-xs text-quaternary mt-0.5">{f.logo_rules.join(' ')}</span>
      )
    if (key === 'service_colours')
      return (
        <span className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 paragraph-xs text-quaternary">
          {f.service_colours.map((s) => (
            <span key={s.service} className="inline-flex items-center gap-1.5">
              <Swatch hex={s.hex} size={14} />
              {s.service}
            </span>
          ))}
        </span>
      )
    if (key === 'voice')
      return <span className="block paragraph-xs text-quaternary mt-0.5">{f.voice.join(' ')}</span>
    return null
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" panelClassName="p-6">
      {step === 'add' && (
        <div className="flex flex-col gap-4">
          <div>
            <h2 id="brand-guide-title" className="heading-xs text-primary">
              Add your brand guide
            </h2>
            <p className="paragraph-sm text-tertiary mt-1">
              The PDF your designer gave you, or photos of its pages. Mia reads your colours, fonts
              and logo rules from it.
            </p>
          </div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="rounded-xl border-[1.5px] border-dashed border-primary px-4 py-8 flex flex-col items-center gap-2 text-secondary hover:bg-secondary transition-colors"
          >
            <Upload01 size={28} />
            <span className="paragraph-sm">Choose a file</span>
            <span className="paragraph-xs text-quaternary">PDF or images, up to 20 MB</span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void read(f)
              e.target.value = ''
            }}
          />
          {error && <p className="paragraph-sm text-error">{error}</p>}
        </div>
      )}

      {step === 'reading' && (
        <div className="flex flex-col gap-4">
          <div>
            <h2 id="brand-guide-title" className="heading-xs text-primary">
              Reading your guide
            </h2>
            <p className="paragraph-sm text-tertiary mt-1">About 20 seconds.</p>
          </div>
          <ul className="flex flex-col gap-3">
            {READING.map((line, i) => (
              <li
                key={line}
                className={`flex items-center gap-2.5 paragraph-sm ${i <= shown ? 'text-primary' : 'text-quaternary'}`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                    i < shown ? 'bg-utility-success-100 text-utility-success-700' : 'bg-tertiary'
                  }`}
                >
                  {i < shown ? (
                    <Check size={12} />
                  ) : i === shown ? (
                    <Spinner size="sm" variant="dark" />
                  ) : null}
                </span>
                {line}
              </li>
            ))}
          </ul>
        </div>
      )}

      {step === 'review' && result && (
        <div className="flex flex-col gap-4">
          <div>
            <h2 id="brand-guide-title" className="heading-xs text-primary">
              Here's what I found
            </h2>
            <p className="paragraph-sm text-tertiary mt-1">
              From {result.file.name}
              {result.found.pages ? `, ${result.found.pages} pages` : ''}. Untick anything that's
              out of date.
            </p>
          </div>
          <div className="divide-y divide-tertiary border-y border-tertiary">
            {result.offered.map((key) => (
              <label key={key} className="flex items-start gap-3 py-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={use.includes(key)}
                  onChange={() => toggle(key)}
                  className="mt-0.5 w-4 h-4 shrink-0"
                />
                <span className="min-w-0">
                  <span className="block paragraph-sm font-medium text-primary">
                    {ROW_TITLE[key] ?? key}
                  </span>
                  {detail(key, result.found, result.now)}
                </span>
              </label>
            ))}
          </div>
          {error && <p className="paragraph-sm text-error">{error}</p>}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={apply}
              disabled={applying || use.length === 0}
              className="px-4 py-2 rounded-full bg-brand-solid text-primary-onbrand paragraph-sm font-medium disabled:opacity-50"
            >
              {applying ? 'Saving…' : 'Use these'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full border border-primary paragraph-sm text-secondary hover:bg-tertiary"
            >
              Not now
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
