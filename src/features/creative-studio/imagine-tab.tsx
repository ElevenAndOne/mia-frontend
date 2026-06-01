import { useState, useRef, useEffect } from 'react'
import { Loader2, Download, Maximize2, Sparkles, Brain, Wand2, ArrowLeft, MessageCircle, Send, History, Edit3, Target, ChevronDown, ChevronUp, Image, X, Layers, CheckCircle, AlertCircle } from 'lucide-react'
import { IMAGE_MODELS, ImageModelSelector, ProgressBar, AspectRatioSelector } from './creative-studio-shared'
import { creativeStudioApi, creativeIntelligenceApi, type IntelligenceStatus } from './creative-studio-api'
import { ReferencePicker } from './reference-picker'

interface Props {
  tenantId: string
  sessionId: string
  variantSeed?: { prompt: string; imageUrl: string } | null
  onClearVariantSeed?: () => void
}

const ALL_RATIOS = ['1:1', '16:9', '9:16', '4:5'] as const
type FormatRatio = typeof ALL_RATIOS[number]

interface FormatVariant {
  ratio: FormatRatio
  jobId: string | null
  url: string | null
  status: 'generating' | 'completed' | 'failed'
}

interface EditHistoryItem {
  image: string
  prompt: string
  timestamp: Date
}

function IterativeEditingInterface({
  isActive, onBack, currentImage, editHistory, onEdit, isEditing, modelName,
}: {
  isActive: boolean; onBack: () => void; currentImage: string
  editHistory: EditHistoryItem[]; onEdit: (p: string) => void; isEditing: boolean; modelName: string
}) {
  const [editPrompt, setEditPrompt] = useState('')
  if (!isActive) return null

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex">
      <div className="w-1/2 p-6 border-r border-slate-700 flex flex-col">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={onBack} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
          <h2 className="text-xl font-bold text-white">Iterative Editing</h2>
          <div className="flex items-center gap-1 text-yellow-400"><Edit3 className="w-4 h-4" /><span className="text-sm">{modelName}</span></div>
        </div>
        <div className="bg-slate-900/80 border border-slate-700 rounded-xl p-4 mb-4">
          <h3 className="text-sm font-semibold text-white mb-3">Current Image</h3>
          <div className="aspect-square bg-slate-800 rounded-lg overflow-hidden">
            <img src={currentImage} alt="Current" className="w-full h-full object-cover" />
          </div>
        </div>
        <div className="bg-slate-900/80 border border-slate-700 rounded-xl p-4 flex-1 overflow-auto">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><History className="w-4 h-4" /> History ({editHistory.length})</h3>
          <div className="space-y-2">
            {editHistory.slice().reverse().map((item, idx) => (
              <div key={idx} className="flex gap-3 p-2 bg-slate-800/50 rounded-lg">
                <img src={item.image} alt="" className="w-12 h-12 object-cover rounded" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-slate-400">{item.timestamp.toLocaleTimeString()}</div>
                  <div className="text-sm text-white truncate">{item.prompt}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="w-1/2 p-6 flex flex-col">
        <div className="bg-slate-900/80 border border-slate-700 rounded-xl p-4 flex-1 flex flex-col">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><MessageCircle className="w-4 h-4" /> Edit Instructions</h3>
          <div className="flex-1 bg-slate-800/50 rounded-lg p-4 overflow-y-auto mb-4">
            <div className="text-sm text-slate-300 mb-4">Tell me what to change about the image:</div>
            <div className="space-y-2">
              {['remove the hat and add sunglasses', 'change the background to a beach', 'make the lighting more dramatic', 'add snow falling in the scene'].map((ex, i) => (
                <button key={i} onClick={() => setEditPrompt(ex)} className="block w-full text-left text-xs text-slate-400 hover:text-purple-400 hover:bg-slate-700/50 rounded p-2 transition-colors">"{ex}"</button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <textarea
              value={editPrompt}
              onChange={(e) => setEditPrompt(e.target.value)}
              rows={3}
              className="flex-1 bg-slate-800 text-slate-200 border border-slate-700 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-yellow-500 resize-none text-sm"
              placeholder="Describe what you want to change..."
              disabled={isEditing}
            />
            <button
              onClick={() => { if (editPrompt.trim()) { onEdit(editPrompt); setEditPrompt('') } }}
              disabled={!editPrompt.trim() || isEditing}
              className={`px-4 rounded-lg font-medium flex items-center gap-2 ${editPrompt.trim() && !isEditing ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}
            >
              {isEditing ? <><Loader2 className="w-4 h-4 animate-spin" /> Editing...</> : <><Send className="w-4 h-4" /> Edit</>}
            </button>
          </div>
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mt-4">
          <div className="text-sm font-medium text-yellow-400 mb-1">Pro Tips</div>
          <div className="text-xs text-yellow-300/80 space-y-1">
            <div>• Be specific: "change the red car to blue" vs "change color"</div>
            <div>• Use "remove X and add Y" for replacements</div>
            <div>• Each edit builds on the previous result</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ImagineTab({ tenantId, sessionId, variantSeed, onClearVariantSeed }: Props) {
  const [imageModel, setImageModel] = useState('imagen-4')
  const [imagePrompt, setImagePrompt] = useState('')

  const [campaigns, setCampaigns] = useState<{ campaign_id: string; campaign_name: string; client_name: string; phases: { phase_id: string; phase_name: string }[] }[]>([])
  const [selectedCampaignId, setSelectedCampaignId] = useState('')
  const [selectedPhaseId, setSelectedPhaseId] = useState('')

  const [intelligence, setIntelligence] = useState<IntelligenceStatus | null>(null)
  const [intelligenceLoading, setIntelligenceLoading] = useState(false)
  const [showIntelligenceDetails, setShowIntelligenceDetails] = useState(false)

  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [jobId, setJobId] = useState<string | null>(null)
  const [generatedImages, setGeneratedImages] = useState<{ url: string }[]>([])
  const [optimizedPrompt, setOptimizedPrompt] = useState<string | null>(null)
  const [showOptimizedPrompt, setShowOptimizedPrompt] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [aspectRatio, setAspectRatio] = useState('1:1')
  const [referenceImages, setReferenceImages] = useState<string[]>([])
  const [formatVariants, setFormatVariants] = useState<FormatVariant[] | null>(null)
  const formatVariantsRef = useRef<FormatVariant[] | null>(null)
  formatVariantsRef.current = formatVariants
  const [isEditingMode, setIsEditingMode] = useState(false)
  const [currentEditImage, setCurrentEditImage] = useState('')
  const [editHistory, setEditHistory] = useState<EditHistoryItem[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [editJobId, setEditJobId] = useState<string | null>(null)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    creativeStudioApi.listCampaigns(tenantId, sessionId)
      .then(r => setCampaigns(r.campaigns ?? []))
      .catch(() => {})
  }, [tenantId, sessionId])

  useEffect(() => {
    setIntelligence(null)
    creativeIntelligenceApi.getStatus(sessionId, tenantId, selectedCampaignId || undefined)
      .then(setIntelligence)
      .catch(() => {})
  }, [tenantId, sessionId, selectedCampaignId])

  useEffect(() => {
    if (intelligence?.status !== 'analyzing') return
    const interval = setInterval(async () => {
      const updated = await creativeIntelligenceApi
        .getStatus(sessionId, tenantId, selectedCampaignId || undefined)
        .catch(() => null)
      if (updated) {
        setIntelligence(updated)
        if (updated.status !== 'analyzing') clearInterval(interval)
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [intelligence?.status, tenantId, sessionId, selectedCampaignId])

  const handleRefreshIntelligence = async () => {
    setIntelligenceLoading(true)
    try {
      await creativeIntelligenceApi.refresh(sessionId, tenantId, selectedCampaignId || undefined)
      setIntelligence(prev => ({ ...(prev ?? {}), status: 'analyzing' } as IntelligenceStatus))
    } catch {
      // status polling will surface any error
    } finally {
      setIntelligenceLoading(false)
    }
  }

  useEffect(() => {
    if (!jobId) return
    let cancelled = false
    let ticks = 0

    pollRef.current = setInterval(async () => {
      ticks++
      setProgress(Math.min(90, ticks * 8))
      try {
        const job = await creativeStudioApi.getJob(tenantId, sessionId, jobId)
        if (cancelled) return
        if (job.status === 'completed') {
          clearInterval(pollRef.current!)
          setProgress(100)
          const rawUrls = (job.output_urls ?? (job.output_url ? [job.output_url] : []))
          const urls: { url: string }[] = rawUrls.filter((u): u is string => !!u).map(u => ({ url: u }))
          setGeneratedImages(urls.length ? urls : job.output_url ? [{ url: job.output_url }] : [])
          if (job.optimized_prompt) { setOptimizedPrompt(job.optimized_prompt); setShowOptimizedPrompt(false) }
          setIsGenerating(false)
          setJobId(null)
        } else if (job.status === 'failed') {
          clearInterval(pollRef.current!)
          setError(job.error_message || 'Generation failed')
          setIsGenerating(false)
          setJobId(null)
        }
      } catch {
        if (!cancelled) { setError('Error checking job status'); clearInterval(pollRef.current!); setIsGenerating(false); setJobId(null) }
      }
    }, 4000)

    return () => { cancelled = true; if (pollRef.current) clearInterval(pollRef.current) }
  }, [jobId, tenantId, sessionId])

  useEffect(() => {
    if (!editJobId) return
    let cancelled = false

    const poll = setInterval(async () => {
      try {
        const job = await creativeStudioApi.getJob(tenantId, sessionId, editJobId)
        if (cancelled) return
        if (job.status === 'completed') {
          clearInterval(poll)
          const newUrl = job.output_urls?.[0] ?? job.output_url ?? ''
          setEditHistory(prev => [...prev, { image: newUrl, prompt: 'Edit applied', timestamp: new Date() }])
          setCurrentEditImage(newUrl)
          setIsEditing(false)
          setEditJobId(null)
        } else if (job.status === 'failed') {
          clearInterval(poll)
          setIsEditing(false)
          setEditJobId(null)
        }
      } catch { clearInterval(poll); setIsEditing(false); setEditJobId(null) }
    }, 4000)

    return () => { cancelled = true; clearInterval(poll) }
  }, [editJobId, tenantId, sessionId])

  // Apply variant seed from Library "Create Variant"
  useEffect(() => {
    if (!variantSeed) return
    setImagePrompt(variantSeed.prompt)
    setReferenceImages([variantSeed.imageUrl])
    setGeneratedImages([])
    setOptimizedPrompt(null)
    setFormatVariants(null)
    setError(null)
  }, [variantSeed])

  // Poll all active format variant jobs
  const hasGeneratingFormats = formatVariants?.some(v => v.status === 'generating') ?? false
  useEffect(() => {
    if (!hasGeneratingFormats) return
    let cancelled = false

    const poll = async () => {
      if (cancelled) return
      const variants = formatVariantsRef.current
      if (!variants) return
      const pending = variants.filter(v => v.status === 'generating' && v.jobId)
      if (!pending.length) return

      const updates: Array<{ ratio: string; url: string | null; status: FormatVariant['status'] }> = []
      await Promise.all(pending.map(async v => {
        try {
          const job = await creativeStudioApi.getJob(tenantId, sessionId, v.jobId!)
          if (job.status === 'completed') {
            updates.push({ ratio: v.ratio, url: job.output_urls?.[0] ?? job.output_url ?? null, status: 'completed' })
          } else if (job.status === 'failed') {
            updates.push({ ratio: v.ratio, url: null, status: 'failed' })
          }
        } catch { /* keep polling */ }
      }))

      if (!cancelled && updates.length > 0) {
        setFormatVariants(prev => prev?.map(v => {
          const u = updates.find(u => u.ratio === v.ratio)
          return u ? { ...v, url: u.url, status: u.status } : v
        }) ?? null)
      }
      if (!cancelled) setTimeout(poll, 4000)
    }

    setTimeout(poll, 4000)
    return () => { cancelled = true }
  }, [hasGeneratingFormats, tenantId, sessionId])

  const handleGenerateAllFormats = async () => {
    const baseUrl = generatedImages[0]?.url
    if (!baseUrl) return

    const sourcePrompt = optimizedPrompt || imagePrompt

    // Seed the grid: current ratio is already done, others are queued
    const initial: FormatVariant[] = ALL_RATIOS.map(r => ({
      ratio: r,
      jobId: null,
      url: r === aspectRatio ? baseUrl : null,
      status: r === aspectRatio ? 'completed' : 'generating',
    }))
    setFormatVariants(initial)

    // Fire parallel jobs for the other 3 ratios
    await Promise.all(
      ALL_RATIOS.filter(r => r !== aspectRatio).map(async (ratio) => {
        try {
          const res = await creativeStudioApi.generate(tenantId, sessionId, {
            type: 'image',
            model: imageModel,
            prompt: sourcePrompt,
            num_images: 1,
            quality: 'standard',
            aspect_ratio: ratio,
            campaign_id: selectedCampaignId || undefined,
            phase_id: selectedPhaseId || undefined,
          })
          if (res.job_id) {
            setFormatVariants(prev => prev?.map(v => v.ratio === ratio ? { ...v, jobId: res.job_id } : v) ?? null)
          } else {
            setFormatVariants(prev => prev?.map(v => v.ratio === ratio ? { ...v, status: 'failed' } : v) ?? null)
          }
        } catch {
          setFormatVariants(prev => prev?.map(v => v.ratio === ratio ? { ...v, status: 'failed' } : v) ?? null)
        }
      })
    )
  }

  const handleDownloadAll = () => {
    formatVariants?.filter(v => v.url).forEach((v, i) => {
      setTimeout(() => {
        const a = document.createElement('a')
        a.href = v.url!
        a.download = `creative_${v.ratio.replace(':', 'x')}.png`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }, i * 250)
    })
  }

  const handleGenerate = async () => {
    if (!imagePrompt.trim()) return
    setIsGenerating(true)
    setError(null)
    setProgress(0)
    setGeneratedImages([])
    setOptimizedPrompt(null)
    setShowOptimizedPrompt(false)
    setFormatVariants(null)

    try {
      const res = await creativeStudioApi.generate(tenantId, sessionId, {
        type: 'image',
        model: imageModel,
        prompt: imagePrompt,
        num_images: 1,
        quality: 'standard',
        aspect_ratio: aspectRatio,
        reference_images: referenceImages,
        campaign_id: selectedCampaignId || undefined,
        phase_id: selectedPhaseId || undefined,
      })

      if (res.job_id) {
        setJobId(res.job_id)
      } else {
        setError('No job ID returned')
        setIsGenerating(false)
      }
    } catch (e: any) {
      setError(e?.message || 'Generation error')
      setIsGenerating(false)
    }
  }

  const handleStartEditing = (imageUrl: string) => {
    setCurrentEditImage(imageUrl)
    setIsEditingMode(true)
    setEditHistory([{ image: imageUrl, prompt: 'Original image', timestamp: new Date() }])
  }

  const handleIterativeEdit = async (editPromptText: string) => {
    if (!currentEditImage || !editPromptText.trim()) return
    setIsEditing(true)
    try {
      // FLUX and GPT Image 2 have native edit endpoints; use them directly.
      // Nano Banana models don't support reference images so fall back to Imagen 4.
      const editModel = (imageModel === 'nano-banana-2' || imageModel === 'nano-banana-pro')
        ? 'imagen-4'
        : imageModel
      const res = await creativeStudioApi.generate(tenantId, sessionId, {
        type: 'image',
        model: editModel,
        prompt: editPromptText,
        reference_images: [currentEditImage],
        iterative_edit: true,
        base_image: currentEditImage,
      })
      if (res.job_id) setEditJobId(res.job_id)
      else { setIsEditing(false) }
    } catch { setIsEditing(false) }
  }

  const canGenerate = imagePrompt.trim().length > 0 && !isGenerating
  const supportsEditing = IMAGE_MODELS.find(m => m.id === imageModel)?.supportsEditing ?? false
  const selectedCampaign = campaigns.find(c => c.campaign_id === selectedCampaignId)
  const isCampaignScoped = !!selectedCampaignId
  const isCampaignScopedResult = isCampaignScoped && intelligence?.campaign_id === selectedCampaignId
  const scopeLabel = isCampaignScoped ? selectedCampaign?.campaign_name ?? 'Campaign' : 'All Meta Ads'

  return (
    <>
      <IterativeEditingInterface
        isActive={isEditingMode} onBack={() => { setIsEditingMode(false); setCurrentEditImage(''); setEditHistory([]) }}
        currentImage={currentEditImage} editHistory={editHistory} onEdit={handleIterativeEdit} isEditing={isEditing}
        modelName={IMAGE_MODELS.find(m => m.id === imageModel)?.name ?? imageModel}
      />

      <div className="grid grid-cols-12 gap-6 items-stretch">

        {/* Left — Model + References + Campaign Context */}
        <div className="col-span-3 flex flex-col gap-4">
          <div className="shrink-0 relative z-20">
            <ImageModelSelector value={imageModel} onChange={setImageModel} />
          </div>

          {/* References — flex-1 mirrors Camera Movement on Create */}
          <div className="flex-1 relative z-10 bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Image className="w-4 h-4 text-slate-400" /> Reference Images
            </h3>
            <ReferencePicker
              tenantId={tenantId}
              sessionId={sessionId}
              value={referenceImages}
              onChange={setReferenceImages}
              disabled={!(IMAGE_MODELS.find(m => m.id === imageModel)?.supportsReferences)}
              disabledReason={`${IMAGE_MODELS.find(m => m.id === imageModel)?.name ?? 'This model'} does not support reference images`}
            /></div>

          {/* Campaign Context — shrink-0, compact */}
          {campaigns.length > 0 && (
            <div className="shrink-0 bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Target className="w-4 h-4 text-purple-400" /> Campaign Context
              </h3>
              <div className="space-y-2">
                <select
                  value={selectedCampaignId}
                  onChange={e => { setSelectedCampaignId(e.target.value); setSelectedPhaseId('') }}
                  className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500"
                >
                  <option value="">No campaign (brand only)</option>
                  {campaigns.map(c => (
                    <option key={c.campaign_id} value={c.campaign_id}>
                      {c.client_name} — {c.campaign_name}
                    </option>
                  ))}
                </select>
                {selectedCampaignId && (() => {
                  const c = campaigns.find(x => x.campaign_id === selectedCampaignId)
                  return c?.phases.length ? (
                    <select
                      value={selectedPhaseId}
                      onChange={e => setSelectedPhaseId(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500"
                    >
                      <option value="">All phases</option>
                      {c.phases.map(p => (
                        <option key={p.phase_id} value={p.phase_id}>{p.phase_name}</option>
                      ))}
                    </select>
                  ) : null
                })()}
                {selectedCampaignId && (
                  <p className="text-xs text-purple-400 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Campaign objectives will guide prompt optimization
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Centre — Preview + Prompt */}
        <div className="col-span-6 flex flex-col gap-4">

          {/* Variant mode banner */}
          {variantSeed && (
            <div className="shrink-0 flex items-center gap-3 px-4 py-2.5 bg-purple-500/10 border border-purple-500/30 rounded-xl">
              <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-semibold text-purple-300">Variant mode</span>
                <span className="text-xs text-slate-400 ml-2 truncate">sourced from: "{variantSeed.prompt.slice(0, 60)}{variantSeed.prompt.length > 60 ? '…' : ''}"</span>
              </div>
              <button onClick={onClearVariantSeed} className="p-1 hover:bg-slate-700 rounded text-slate-500 hover:text-white transition-colors shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="flex-1 bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-xl p-4 min-h-[280px] flex items-center justify-center">
            {/* Format grid view */}
            {formatVariants ? (
              <div className="w-full">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <Layers className="w-4 h-4 text-purple-400" /> All Formats
                  </div>
                  <button onClick={() => setFormatVariants(null)} className="text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1">
                    <X className="w-3 h-3" /> Back to single
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  {formatVariants.map(v => (
                    <div key={v.ratio} className="relative bg-slate-800 rounded-lg overflow-hidden aspect-video flex items-center justify-center group">
                      {v.status === 'completed' && v.url ? (
                        <>
                          <img src={v.url} alt={v.ratio} className="w-full h-full object-contain" />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <a href={v.url} download={`creative_${v.ratio.replace(':', 'x')}.png`} className="p-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600">
                              <Download className="w-4 h-4" />
                            </a>
                          </div>
                          <CheckCircle className="absolute bottom-2 right-2 w-4 h-4 text-green-400 drop-shadow" />
                        </>
                      ) : v.status === 'generating' ? (
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                          <span className="text-xs text-slate-400">Generating…</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <AlertCircle className="w-5 h-5 text-red-400" />
                          <span className="text-xs text-red-400">Failed</span>
                        </div>
                      )}
                      <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-slate-900/80 text-slate-300 text-[10px] font-semibold rounded">
                        {v.ratio}
                      </div>
                    </div>
                  ))}
                </div>
                {!hasGeneratingFormats && (
                  <button
                    onClick={handleDownloadAll}
                    className="w-full py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium rounded-lg hover:shadow-lg hover:shadow-purple-500/25 transition-all flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" /> Download All Formats
                  </button>
                )}
              </div>
            ) : generatedImages.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 w-full">
                {generatedImages.map((img, idx) => (
                  <div key={idx} className="relative group">
                    <img src={img.url} alt={`Generated ${idx + 1}`} className="w-full rounded-lg" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                      <a href={img.url} download className="p-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"><Download className="w-4 h-4" /></a>
                      <button className="p-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"><Maximize2 className="w-4 h-4" /></button>
                      {supportsEditing && (
                        <button onClick={() => handleStartEditing(img.url)} className="p-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg" title="Edit iteratively">
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {/* Generate All Formats */}
                <button
                  onClick={handleGenerateAllFormats}
                  className="w-full py-2 text-sm text-purple-400 hover:text-white border border-purple-500/30 hover:border-purple-500 hover:bg-purple-500/10 rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  <Layers className="w-3.5 h-3.5" />
                  Generate All Formats — 1:1 · 16:9 · 9:16 · 4:5
                </button>
              </div>
            ) : (
              <div className="text-center">
                {isGenerating ? (
                  <>
                    <Loader2 className="w-10 h-10 text-purple-500 animate-spin mx-auto mb-3" />
                    <p className="text-white mb-1">Generating image… {progress}%</p>
                    {progress > 0 && <ProgressBar progress={progress} />}
                  </>
                ) : error ? (
                  <><div className="text-red-400 mb-2">Generation failed</div><p className="text-slate-500 text-sm">{error}</p></>
                ) : (
                  <>
                    <div className="w-10 h-10 text-slate-600 mx-auto mb-3 flex items-center justify-center"><Sparkles className="w-10 h-10" /></div>
                    <p className="text-slate-400">Your image will appear here</p>
                    <p className="text-xs text-slate-500 mt-1">Model: {IMAGE_MODELS.find(m => m.id === imageModel)?.name}</p>
                  </>
                )}
              </div>
            )}
          </div>

          {optimizedPrompt && (
            <div className="shrink-0 bg-slate-900/80 backdrop-blur-sm border border-purple-500/30 rounded-xl overflow-hidden">
              <button
                onClick={() => setShowOptimizedPrompt(p => !p)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-800/50 transition-colors"
              >
                <span className="text-sm font-medium text-purple-300 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5" /> Optimized prompt (Claude)
                </span>
                {showOptimizedPrompt ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>
              {showOptimizedPrompt && (
                <div className="px-4 pb-4 text-sm text-slate-300 leading-relaxed border-t border-slate-700/50 pt-3 whitespace-pre-wrap">
                  {optimizedPrompt}
                </div>
              )}
            </div>
          )}

          <div className="shrink-0 bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-xl p-3">
            <h3 className="text-sm font-semibold text-white mb-2">Image Prompt</h3>
            <textarea
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              rows={3}
              className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none text-sm"
              placeholder="Describe your image..."
              maxLength={1000}
            />
            <div className="flex justify-between items-center mt-2 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xs text-slate-500 shrink-0">{imagePrompt.length}/1000</span>
                <AspectRatioSelector value={aspectRatio} onChange={setAspectRatio} mode="image" />
              </div>
              <button
                onClick={handleGenerate}
                disabled={!canGenerate}
                className={`shrink-0 px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1 ${canGenerate ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg hover:shadow-purple-500/25' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}
              >
                {isGenerating ? <><Loader2 className="w-3 h-3 animate-spin" /> Generating...</> : <><Wand2 className="w-3 h-3" /> Generate</>}
              </button>
            </div>
          </div>
        </div>

        {/* Right — Ad Intelligence + Generation Info */}
        <div className="col-span-3 flex flex-col gap-4">

          {/* Ad Intelligence — grows to fill like VFX on Create */}
          <div className="flex-1 flex flex-col bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Brain className="w-4 h-4 text-blue-400" /> Ad Intelligence
              </h3>
              {intelligence?.status === 'completed' && (
                <button onClick={() => setShowIntelligenceDetails(v => !v)} className="text-slate-400 hover:text-white transition-colors">
                  {showIntelligenceDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              )}
            </div>

            {isCampaignScoped && (
              <p className="text-xs text-purple-400 mb-2">
                Scope: {scopeLabel}
                {intelligence?.status === 'completed' && !isCampaignScopedResult && (
                  <span className="text-slate-500"> (account-wide fallback)</span>
                )}
              </p>
            )}

            {!intelligence ? (
              <div className="flex items-center gap-2 text-slate-500 text-xs"><Loader2 className="w-3 h-3 animate-spin" /> Loading...</div>
            ) : intelligence.status === 'analyzing' ? (
              <div className="flex items-center gap-2 text-blue-400 text-xs"><Loader2 className="w-3 h-3 animate-spin" /> Analyzing{isCampaignScoped ? ` ${scopeLabel}` : ' your top Meta ads'}...</div>
            ) : intelligence.status === 'completed' ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full inline-block" />
                  <span className="text-xs text-slate-400">
                    {intelligence.top_ad_count} ads analyzed
                    {intelligence.performance_summary?.avg_ctr ? ` · avg CTR ${intelligence.performance_summary.avg_ctr.toFixed(1)}%` : ''}
                  </span>
                </div>
                {intelligence.visual_patterns?.winning_patterns_summary && (
                  <p className="text-xs text-slate-300 leading-relaxed">{intelligence.visual_patterns.winning_patterns_summary}</p>
                )}
                {showIntelligenceDetails && intelligence.visual_patterns && (
                  <div className="mt-2 space-y-1 border-t border-slate-700 pt-2">
                    {[
                      ['Composition', intelligence.visual_patterns.composition],
                      ['Colors', intelligence.visual_patterns.color_palette],
                      ['Lighting', intelligence.visual_patterns.lighting],
                      ['Subject', intelligence.visual_patterns.subject_matter],
                      ['Tone', intelligence.visual_patterns.emotional_tone],
                      ['Text', intelligence.visual_patterns.text_overlay],
                    ].filter(([, v]) => v).map(([label, value]) => (
                      <div key={label as string} className="text-xs">
                        <span className="text-slate-500">{label}: </span>
                        <span className="text-slate-300">{value}</span>
                      </div>
                    ))}
                  </div>
                )}
                <button onClick={handleRefreshIntelligence} disabled={intelligenceLoading} className="text-xs text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50">
                  {isCampaignScoped && !isCampaignScopedResult ? `Analyze ${scopeLabel}` : 'Re-analyze'}
                </button>
              </div>
            ) : intelligence.status === 'failed' ? (
              <div className="space-y-2">
                <p className="text-xs text-red-400">{intelligence.error_message || 'Analysis failed'}</p>
                <button onClick={handleRefreshIntelligence} disabled={intelligenceLoading} className="text-xs text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50">
                  {intelligenceLoading ? 'Starting...' : 'Try again'}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-slate-400">
                  {isCampaignScoped
                    ? `Analyze ${scopeLabel} Meta ads to extract winning visual patterns for this campaign.`
                    : 'Analyze your top Meta ads to extract winning visual patterns for smarter prompt generation.'}
                </p>
                <button
                  onClick={handleRefreshIntelligence}
                  disabled={intelligenceLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-medium py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {intelligenceLoading ? <><Loader2 className="w-3 h-3 animate-spin" /> Starting...</> : <><Brain className="w-3 h-3" /> {isCampaignScoped ? `Analyze ${scopeLabel}` : 'Analyze Ad Performance'}</>}
                </button>
              </div>
            )}
          </div>

          {/* Generation Info — anchored to bottom like on Create */}
          <div className="shrink-0 bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-white mb-3">Generation Info</h3>
            <div className="space-y-2 text-sm">
              {([
                ['Model', IMAGE_MODELS.find(m => m.id === imageModel)?.name],
                ['Aspect', aspectRatio],
                ['References', referenceImages.length > 0 ? `${referenceImages.length} image${referenceImages.length > 1 ? 's' : ''}` : 'None'],
                selectedCampaign ? ['Campaign', selectedCampaign.campaign_name] : null,
              ] as ([string, string] | null)[])
                .filter((row): row is [string, string] => row !== null && row[1] !== undefined)
                .map(([label, val]) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-slate-400">{label}</span>
                    <span className="text-white capitalize">{val}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
