import { useState, useEffect, useRef } from 'react'
import { useSession } from '../../contexts/session-context'
import { creativeStudioApi, type CreativeAsset, type GenerateJob } from './creative-studio-api'

// ── Model definitions ──────────────────────────────────────────────────────

const VIDEO_MODELS = [
  { id: 'veo-3.1', name: 'Veo 3.1', provider: 'Google · fal.ai', badge: 'Cinematic' },
  { id: 'runway-gen-4.5', name: 'Runway Gen-4.5', provider: 'Runway', badge: 'Fast' },
  { id: 'kling-3.0', name: 'Kling 3.0 Pro', provider: 'Kuaishou · fal.ai', badge: 'Creative' },
]

const IMAGE_MODELS = [
  { id: 'flux-2-pro', name: 'FLUX.2 Pro', provider: 'Black Forest · fal.ai', badge: 'Quality' },
  { id: 'gpt-image-2', name: 'GPT Image 2', provider: 'OpenAI · fal.ai', badge: 'Creative' },
  { id: 'nano-banana-2', name: 'Nano Banana 2', provider: 'Google Gemini', badge: 'Realistic' },
]

const ASPECT_RATIOS = ['16:9', '9:16', '1:1', '4:3']

// ── Poll helper ────────────────────────────────────────────────────────────

function usePollJob(
  tenantId: string | undefined,
  sessionId: string | undefined,
  jobId: string | null,
  onDone: (job: GenerateJob) => void,
  onError: (msg: string) => void,
) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!jobId || !tenantId || !sessionId) return
    let cancelled = false

    const poll = async () => {
      try {
        const job = await creativeStudioApi.getJob(tenantId, sessionId, jobId)
        if (cancelled) return
        if (job.status === 'completed') {
          if (intervalRef.current) clearInterval(intervalRef.current)
          onDone(job)
        } else if (job.status === 'failed') {
          if (intervalRef.current) clearInterval(intervalRef.current)
          onError(job.error_message || 'Generation failed')
        }
      } catch {
        if (!cancelled) onError('Error checking job status')
        if (intervalRef.current) clearInterval(intervalRef.current)
      }
    }

    poll()
    intervalRef.current = setInterval(poll, 4000)
    return () => {
      cancelled = true
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [jobId, tenantId, sessionId]) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}

// ── Library Tab ────────────────────────────────────────────────────────────

function LibraryTab({ tenantId, sessionId }: { tenantId: string; sessionId: string }) {
  const [assets, setAssets] = useState<CreativeAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'image' | 'video'>('all')
  const [deleting, setDeleting] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await creativeStudioApi.listAssets(tenantId, sessionId, {
        media_type: filter === 'all' ? undefined : filter,
        limit: 100,
      })
      setAssets(res.assets)
    } catch {
      setAssets([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [filter]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async (assetId: string) => {
    if (!confirm('Delete this asset?')) return
    setDeleting(assetId)
    try {
      await creativeStudioApi.deleteAsset(tenantId, sessionId, assetId)
      setAssets((prev) => prev.filter((a) => a.asset_id !== assetId))
    } catch {
      alert('Failed to delete asset')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-primary font-semibold text-lg">Asset Library</h2>
        <div className="flex gap-2">
          {(['all', 'image', 'video'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                filter === f
                  ? 'bg-purple-500 text-white'
                  : 'bg-secondary text-secondary hover:bg-tertiary'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : assets.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-secondary">
          <p className="text-sm">No assets yet. Generate something!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {assets.map((asset) => (
            <div
              key={asset.asset_id}
              className="group relative bg-secondary rounded-xl overflow-hidden border border-tertiary"
            >
              {asset.media_type === 'video' ? (
                <video
                  src={asset.cdn_url}
                  className="w-full aspect-video object-cover"
                  muted
                  loop
                  onMouseEnter={(e) => (e.currentTarget as HTMLVideoElement).play()}
                  onMouseLeave={(e) => (e.currentTarget as HTMLVideoElement).pause()}
                />
              ) : (
                <img
                  src={asset.cdn_url}
                  alt={asset.filename ?? 'asset'}
                  className="w-full aspect-square object-cover"
                  loading="lazy"
                />
              )}
              <div className="p-2">
                <p className="text-xs text-secondary truncate">{asset.filename ?? asset.asset_id.slice(0, 8)}</p>
                <p className="text-xs text-tertiary">
                  {new Date(asset.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <a
                  href={asset.cdn_url}
                  download
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 bg-black/60 rounded-lg text-white hover:bg-black/80"
                  title="Download"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </a>
                <button
                  onClick={() => handleDelete(asset.asset_id)}
                  disabled={deleting === asset.asset_id}
                  className="p-1.5 bg-red-500/80 rounded-lg text-white hover:bg-red-500"
                  title="Delete"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Generate Tab (video or image) ──────────────────────────────────────────

interface GenerateTabProps {
  type: 'video' | 'image'
  tenantId: string
  sessionId: string
  clientName?: string
}

function GenerateTab({ type, tenantId, sessionId, clientName }: GenerateTabProps) {
  const models = type === 'video' ? VIDEO_MODELS : IMAGE_MODELS
  const [model, setModel] = useState(models[0].id)
  const [prompt, setPrompt] = useState('')
  const [aspectRatio, setAspectRatio] = useState('16:9')
  const [numImages, setNumImages] = useState(1)
  const [optimize, setOptimize] = useState(true)
  const [jobId, setJobId] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'generating' | 'done' | 'failed'>('idle')
  const [outputUrls, setOutputUrls] = useState<string[]>([])
  const [errorMsg, setErrorMsg] = useState('')
  const [optimizedPrompt, setOptimizedPrompt] = useState('')

  usePollJob(
    tenantId,
    sessionId,
    jobId,
    (job) => {
      setOutputUrls(job.output_urls ?? [])
      setOptimizedPrompt(job.optimized_prompt ?? '')
      setStatus('done')
    },
    (msg) => {
      setErrorMsg(msg)
      setStatus('failed')
    },
  )

  const handleGenerate = async () => {
    if (!prompt.trim()) return
    setStatus('generating')
    setOutputUrls([])
    setErrorMsg('')
    setOptimizedPrompt('')
    setJobId(null)
    try {
      const job = await creativeStudioApi.generate(tenantId, sessionId, {
        type,
        model,
        prompt,
        client_name: clientName,
        optimize,
        params: {
          aspect_ratio: aspectRatio,
          ...(type === 'image' ? { num_images: numImages } : {}),
        },
      })
      setJobId(job.job_id)
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Failed to start generation')
      setStatus('failed')
    }
  }

  const reset = () => {
    setStatus('idle')
    setJobId(null)
    setOutputUrls([])
    setErrorMsg('')
    setOptimizedPrompt('')
  }

  const selectedModel = models.find((m) => m.id === model) ?? models[0]

  return (
    <div className="p-6 grid grid-cols-12 gap-6 h-full">
      {/* Left panel — controls */}
      <div className="col-span-4 space-y-5">
        {/* Model picker */}
        <div>
          <label className="block text-sm font-medium text-secondary mb-2">Model</label>
          <div className="space-y-2">
            {models.map((m) => (
              <button
                key={m.id}
                onClick={() => setModel(m.id)}
                className={`w-full p-3 rounded-xl border text-left transition-all ${
                  model === m.id
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-tertiary bg-secondary hover:border-purple-400/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-primary text-sm font-medium">{m.name}</p>
                    <p className="text-tertiary text-xs">{m.provider}</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">
                    {m.badge}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Aspect ratio */}
        <div>
          <label className="block text-sm font-medium text-secondary mb-2">Aspect Ratio</label>
          <div className="grid grid-cols-4 gap-2">
            {ASPECT_RATIOS.map((ar) => (
              <button
                key={ar}
                onClick={() => setAspectRatio(ar)}
                className={`py-1.5 rounded-lg text-xs transition-colors ${
                  aspectRatio === ar
                    ? 'bg-purple-500 text-white'
                    : 'bg-secondary text-secondary hover:bg-tertiary'
                }`}
              >
                {ar}
              </button>
            ))}
          </div>
        </div>

        {/* Image count (images only) */}
        {type === 'image' && (
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">
              Images: {numImages}
            </label>
            <input
              type="range"
              min={1}
              max={4}
              value={numImages}
              onChange={(e) => setNumImages(Number(e.target.value))}
              className="w-full accent-purple-500"
            />
          </div>
        )}

        {/* Optimize toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-primary">Prompt Optimizer</p>
            <p className="text-xs text-tertiary">Claude rewrites for {selectedModel.name}</p>
          </div>
          <button
            onClick={() => setOptimize(!optimize)}
            className={`relative w-10 h-5 rounded-full transition-colors ${
              optimize ? 'bg-purple-500' : 'bg-tertiary'
            }`}
          >
            <div
              className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                optimize ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Center — preview + prompt */}
      <div className="col-span-8 flex flex-col gap-4">
        {/* Preview area */}
        <div className="flex-1 min-h-0 bg-secondary rounded-2xl border border-tertiary overflow-hidden flex items-center justify-center relative">
          {status === 'idle' && (
            <div className="text-center text-tertiary">
              <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-3">
                <svg className="w-8 h-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  {type === 'video' ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                  )}
                </svg>
              </div>
              <p className="text-sm">Enter a prompt to generate {type === 'video' ? 'a video' : 'images'}</p>
              <p className="text-xs mt-1 opacity-60">{selectedModel.name} · {aspectRatio}</p>
            </div>
          )}

          {status === 'generating' && (
            <div className="text-center">
              <div className="w-12 h-12 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-primary font-medium text-sm">Generating with {selectedModel.name}…</p>
              <p className="text-xs text-tertiary mt-1">
                {type === 'video' ? 'This can take 2–20 minutes' : 'Usually under 30 seconds'}
              </p>
            </div>
          )}

          {status === 'failed' && (
            <div className="text-center max-w-sm px-4">
              <p className="text-red-400 text-sm font-medium mb-1">Generation failed</p>
              <p className="text-tertiary text-xs mb-4">{errorMsg}</p>
              <button
                onClick={reset}
                className="px-4 py-2 bg-secondary hover:bg-tertiary text-primary text-sm rounded-lg transition-colors"
              >
                Try again
              </button>
            </div>
          )}

          {status === 'done' && outputUrls.length > 0 && (
            <div className={`w-full h-full ${type === 'image' ? 'grid gap-2 p-2' : ''}`}
              style={
                type === 'image'
                  ? { gridTemplateColumns: `repeat(${Math.min(outputUrls.length, 2)}, 1fr)` }
                  : {}
              }
            >
              {type === 'video' ? (
                <video src={outputUrls[0]} controls className="w-full h-full object-contain" />
              ) : (
                outputUrls.map((url, i) => (
                  <div key={i} className="relative group overflow-hidden rounded-lg">
                    <img src={url} alt={`output ${i + 1}`} className="w-full h-full object-cover" />
                    <a
                      href={url}
                      download
                      target="_blank"
                      rel="noreferrer"
                      className="absolute bottom-2 right-2 p-1.5 bg-black/60 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </a>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Optimized prompt indicator */}
        {optimizedPrompt && (
          <div className="px-3 py-2 bg-purple-500/10 border border-purple-500/30 rounded-lg text-xs text-purple-400">
            <span className="font-medium">Optimized: </span>{optimizedPrompt}
          </div>
        )}

        {/* Prompt input + generate button */}
        <div className="flex flex-col gap-3">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGenerate()
            }}
            placeholder={
              type === 'video'
                ? 'Describe your video scene… (⌘↵ to generate)'
                : 'Describe your image… (⌘↵ to generate)'
            }
            rows={3}
            disabled={status === 'generating'}
            className="w-full px-3 py-2.5 bg-secondary border border-tertiary rounded-xl text-primary text-sm placeholder-tertiary resize-none focus:outline-none focus:border-purple-500 disabled:opacity-50 transition-colors"
          />
          <div className="flex gap-3">
            {status === 'done' && (
              <button
                onClick={reset}
                className="px-4 py-2.5 bg-secondary hover:bg-tertiary text-primary text-sm rounded-xl border border-tertiary transition-colors"
              >
                New
              </button>
            )}
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || status === 'generating'}
              className="flex-1 py-2.5 bg-purple-500 hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {status === 'generating' ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                  </svg>
                  Generate {type === 'video' ? 'Video' : 'Images'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main View ──────────────────────────────────────────────────────────────

type Tab = 'video' | 'image' | 'library'

interface CreativeStudioViewProps {
  onBack?: () => void
}

export function CreativeStudioView({ onBack }: CreativeStudioViewProps) {
  const { sessionId, activeWorkspace } = useSession()
  const tenantId = activeWorkspace?.tenant_id
  const clientName = activeWorkspace?.name

  const [tab, setTab] = useState<Tab>('video')

  if (!tenantId || !sessionId) {
    return (
      <div className="flex items-center justify-center h-full text-secondary text-sm">
        No workspace selected.
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-primary">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-tertiary flex-shrink-0">
        {onBack && (
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg hover:bg-secondary text-secondary transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
          </button>
        )}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
            </svg>
          </div>
          <div>
            <h1 className="text-primary font-semibold text-base leading-tight">Creative Studio</h1>
            {clientName && <p className="text-tertiary text-xs">{clientName}</p>}
          </div>
        </div>

        {/* Tab switcher */}
        <div className="ml-auto flex gap-1 bg-secondary rounded-xl p-1">
          {(
            [
              { id: 'video', label: 'Create Video' },
              { id: 'image', label: 'Imagine Images' },
              { id: 'library', label: 'Library' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                tab === t.id
                  ? 'bg-primary text-primary shadow-sm'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 overflow-auto">
        {tab === 'video' && (
          <GenerateTab type="video" tenantId={tenantId} sessionId={sessionId} clientName={clientName} />
        )}
        {tab === 'image' && (
          <GenerateTab type="image" tenantId={tenantId} sessionId={sessionId} clientName={clientName} />
        )}
        {tab === 'library' && (
          <LibraryTab tenantId={tenantId} sessionId={sessionId} />
        )}
      </div>
    </div>
  )
}
