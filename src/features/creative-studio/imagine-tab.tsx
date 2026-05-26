import { useState, useRef, useEffect } from 'react'
import { Loader2, Download, Maximize2, Sparkles, Brain, Wand2, ArrowLeft, MessageCircle, Send, History, Edit3, Target, ChevronDown, ChevronUp } from 'lucide-react'
import {
  IMAGE_MODELS, stylePresets, lightingPresets, compositionRules,
  ImageModelSelector, ReferenceUpload, PromptTemplatesPanel, ProgressBar,
  buildEnhancedPrompt,
} from './creative-studio-shared'
import { creativeStudioApi, creativeIntelligenceApi, type IntelligenceStatus } from './creative-studio-api'

interface Props {
  tenantId: string
  sessionId: string
}

interface EditHistoryItem {
  image: string
  prompt: string
  timestamp: Date
}

function IterativeEditingInterface({
  isActive, onBack, currentImage, editHistory, onEdit, isEditing,
}: {
  isActive: boolean; onBack: () => void; currentImage: string
  editHistory: EditHistoryItem[]; onEdit: (p: string) => void; isEditing: boolean
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
          <div className="flex items-center gap-1 text-yellow-400"><Edit3 className="w-4 h-4" /><span className="text-sm">imagen-4</span></div>
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

export default function ImagineTab({ tenantId, sessionId }: Props) {
  const [imageModel, setImageModel] = useState('imagen-4')
  const [imagePrompt, setImagePrompt] = useState('')
  const [numImages, setNumImages] = useState(1)
  const [imageQuality, setImageQuality] = useState<'standard' | 'high'>('standard')
  const [aspectRatio, setAspectRatio] = useState('1:1')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [selectedStyle, setSelectedStyle] = useState('')
  const [selectedLighting, setSelectedLighting] = useState('')
  const [selectedComposition, setSelectedComposition] = useState('')

  // Campaign context
  const [campaigns, setCampaigns] = useState<{ campaign_id: string; campaign_name: string; client_name: string; phases: { phase_id: string; phase_name: string }[] }[]>([])
  const [selectedCampaignId, setSelectedCampaignId] = useState('')
  const [selectedPhaseId, setSelectedPhaseId] = useState('')

  // Performance intelligence
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

  // Iterative editing (Imagen 4)
  const [isEditingMode, setIsEditingMode] = useState(false)
  const [currentEditImage, setCurrentEditImage] = useState('')
  const [editHistory, setEditHistory] = useState<EditHistoryItem[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [editJobId, setEditJobId] = useState<string | null>(null)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Load campaign list on mount
  useEffect(() => {
    creativeStudioApi.listCampaigns(tenantId, sessionId)
      .then(r => setCampaigns(r.campaigns ?? []))
      .catch(() => {})
  }, [tenantId, sessionId])

  // Load intelligence status on mount
  useEffect(() => {
    creativeIntelligenceApi.getStatus(sessionId, tenantId)
      .then(setIntelligence)
      .catch(() => {})
  }, [tenantId, sessionId])

  // Poll while analyzing
  useEffect(() => {
    if (intelligence?.status !== 'analyzing') return
    const interval = setInterval(async () => {
      const updated = await creativeIntelligenceApi.getStatus(sessionId, tenantId).catch(() => null)
      if (updated) {
        setIntelligence(updated)
        if (updated.status !== 'analyzing') clearInterval(interval)
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [intelligence?.status, tenantId, sessionId])

  const handleRefreshIntelligence = async () => {
    setIntelligenceLoading(true)
    try {
      await creativeIntelligenceApi.refresh(sessionId, tenantId)
      setIntelligence(prev => ({ ...(prev ?? {}), status: 'analyzing' } as IntelligenceStatus))
    } catch {
      // show inline error via status polling
    } finally {
      setIntelligenceLoading(false)
    }
  }

  // Poll for generation job
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

  // Poll for iterative edit job
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

  const handleEnhancePrompt = () => {
    if (!imagePrompt.trim()) return
    const enhanced = buildEnhancedPrompt(imagePrompt, { model: imageModel, style: selectedStyle, lighting: selectedLighting })
    setImagePrompt(enhanced)
  }

  const handleGenerate = async () => {
    if (!imagePrompt.trim()) return
    setIsGenerating(true)
    setError(null)
    setProgress(0)
    setGeneratedImages([])
    setOptimizedPrompt(null)
    setShowOptimizedPrompt(false)

    try {
      const referenceImages = await Promise.all(
        selectedFiles.map(f => new Promise<string>((resolve) => {
          const r = new FileReader()
          r.onloadend = () => resolve(r.result as string)
          r.readAsDataURL(f)
        }))
      )

      const res = await creativeStudioApi.generate(tenantId, sessionId, {
        type: 'image',
        model: imageModel,
        prompt: imagePrompt,
        num_images: numImages,
        quality: imageQuality,
        aspect_ratio: aspectRatio,
        reference_images: referenceImages,
        style_presets: { style: selectedStyle, lighting: selectedLighting, composition: selectedComposition },
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
      const res = await creativeStudioApi.generate(tenantId, sessionId, {
        type: 'image',
        model: 'imagen-4',
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
  const supportsEditing = imageModel === 'imagen-4'

  return (
    <>
      <IterativeEditingInterface
        isActive={isEditingMode} onBack={() => { setIsEditingMode(false); setCurrentEditImage(''); setEditHistory([]) }}
        currentImage={currentEditImage} editHistory={editHistory} onEdit={handleIterativeEdit} isEditing={isEditing}
      />

      <div className="grid grid-cols-12 gap-6">
        {/* Left */}
        <div className="col-span-3 space-y-6">
          <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><Sparkles className="w-4 h-4" /> Style Presets</h3>
            <div className="space-y-2">
              {stylePresets.map(p => {
                const Icon = p.icon
                return (
                  <button key={p.id} onClick={() => setSelectedStyle(selectedStyle === p.id ? '' : p.id)} className={`w-full p-3 rounded-lg border transition-all ${selectedStyle === p.id ? 'border-purple-500 bg-purple-500/10' : 'border-slate-700 bg-slate-800/50 hover:border-purple-500/50'}`}>
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4 text-purple-400" />
                      <div className="text-left">
                        <p className="text-sm font-medium text-white">{p.name}</p>
                        <p className="text-xs text-slate-400">{p.description}</p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-white mb-3">Lighting</h3>
            <div className="grid grid-cols-2 gap-2">
              {lightingPresets.map(p => {
                const Icon = p.icon
                return (
                  <button key={p.id} onClick={() => setSelectedLighting(selectedLighting === p.id ? '' : p.id)} className={`p-2 rounded-lg text-xs font-medium transition-colors flex flex-col items-center gap-1 ${selectedLighting === p.id ? 'bg-purple-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                    <Icon className="w-4 h-4" /> {p.name}
                  </button>
                )
              })}
            </div>
          </div>

          <ImageModelSelector value={imageModel} onChange={setImageModel} />

          {/* Campaign context picker */}
          {campaigns.length > 0 && (
            <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-xl p-4">
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

          {/* Performance Intelligence panel */}
          <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Brain className="w-4 h-4 text-blue-400" /> Ad Intelligence
              </h3>
              {intelligence?.status === 'completed' && (
                <button
                  onClick={() => setShowIntelligenceDetails(v => !v)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  {showIntelligenceDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              )}
            </div>

            {intelligence?.status === 'analyzing' ? (
              <div className="flex items-center gap-2 text-blue-400 text-xs">
                <Loader2 className="w-3 h-3 animate-spin" /> Analyzing your top Meta ads...
              </div>
            ) : intelligence?.status === 'completed' ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full inline-block" />
                  <span className="text-xs text-slate-400">
                    {intelligence.top_ad_count} ads analyzed
                    {intelligence.performance_summary?.avg_ctr
                      ? ` · avg CTR ${intelligence.performance_summary.avg_ctr.toFixed(1)}%`
                      : ''}
                  </span>
                </div>
                {intelligence.visual_patterns?.winning_patterns_summary && (
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {intelligence.visual_patterns.winning_patterns_summary}
                  </p>
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
                <button
                  onClick={handleRefreshIntelligence}
                  disabled={intelligenceLoading}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50"
                >
                  Re-analyze
                </button>
              </div>
            ) : intelligence?.status === 'failed' ? (
              <div className="space-y-2">
                <p className="text-xs text-red-400">{intelligence.error_message || 'Analysis failed'}</p>
                <button
                  onClick={handleRefreshIntelligence}
                  disabled={intelligenceLoading}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50"
                >
                  {intelligenceLoading ? 'Starting...' : 'Try again'}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-slate-400">
                  Analyze your top Meta ads to extract winning visual patterns for smarter prompt generation.
                </p>
                <button
                  onClick={handleRefreshIntelligence}
                  disabled={intelligenceLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-medium py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {intelligenceLoading ? (
                    <><Loader2 className="w-3 h-3 animate-spin" /> Starting...</>
                  ) : (
                    <><Brain className="w-3 h-3" /> Analyze Ad Performance</>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Centre */}
        <div className="col-span-6 space-y-6">
          <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-xl p-6 min-h-[400px] flex items-center justify-center">
            {generatedImages.length > 0 ? (
              <div className={`grid gap-4 w-full ${numImages === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
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
              </div>
            ) : (
              <div className="text-center">
                {isGenerating ? (
                  <>
                    <Loader2 className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
                    <p className="text-white mb-2">Generating images... {progress}%</p>
                    {progress > 0 && <ProgressBar progress={progress} />}
                  </>
                ) : error ? (
                  <><div className="text-red-400 mb-2">Generation failed</div><p className="text-slate-500 text-sm">{error}</p></>
                ) : (
                  <>
                    <div className="w-12 h-12 text-slate-600 mx-auto mb-4 flex items-center justify-center"><Sparkles className="w-12 h-12" /></div>
                    <p className="text-slate-400">Your images will appear here</p>
                    <p className="text-xs text-slate-500 mt-2">Model: {IMAGE_MODELS.find(m => m.id === imageModel)?.name}</p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Optimized prompt reveal */}
          {optimizedPrompt && (
            <div className="bg-slate-900/80 backdrop-blur-sm border border-purple-500/30 rounded-xl overflow-hidden">
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

          {/* Prompt */}
          <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3"><Sparkles className="w-4 h-4 text-purple-400" /><h3 className="text-sm font-semibold text-white">Image Prompt</h3></div>
            <textarea
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              rows={4}
              className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              placeholder="Describe your image..."
              maxLength={1000}
            />
            <div className="flex justify-between items-center mt-3">
              <span className="text-xs text-slate-500">{imagePrompt.length}/1000</span>
              <div className="flex gap-2">
                <button onClick={handleEnhancePrompt} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1">
                  <Brain className="w-3 h-3" /> Enhance
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={!canGenerate}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1 ${canGenerate ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg hover:shadow-purple-500/25' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}
                >
                  {isGenerating ? <><Loader2 className="w-3 h-3 animate-spin" /> Generating...</> : <><Wand2 className="w-3 h-3" /> Generate Images</>}
                </button>
              </div>
            </div>
          </div>

          {/* Composition */}
          <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-white mb-3">Composition</h3>
            <div className="flex gap-2 flex-wrap">
              {compositionRules.map(rule => {
                const Icon = rule.icon
                return (
                  <button key={rule.id} onClick={() => setSelectedComposition(selectedComposition === rule.id ? '' : rule.id)} className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${selectedComposition === rule.id ? 'bg-purple-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                    <Icon className="w-3 h-3" /> {rule.name}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="col-span-3 space-y-6">
          <ReferenceUpload files={selectedFiles} onChange={setSelectedFiles} label="Reference Images" />

          <PromptTemplatesPanel model={imageModel} onSelectTemplate={setImagePrompt} onEnhancePrompt={handleEnhancePrompt} />

          <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-white mb-3">Generation Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 mb-2 block">Number of Images</label>
                <div className="flex items-center gap-2">
                  <input type="range" min="1" max="4" value={numImages} onChange={(e) => setNumImages(parseInt(e.target.value))} className="flex-1 accent-purple-500" />
                  <span className="text-white text-sm font-medium w-6 text-center">{numImages}</span>
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-2 block">Quality</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['standard', 'high'] as const).map(q => (
                    <button key={q} onClick={() => setImageQuality(q)} className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors capitalize ${imageQuality === q ? 'bg-purple-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>{q === 'high' ? 'High' : 'Standard'}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-2 block">Aspect Ratio</label>
                <div className="grid grid-cols-2 gap-2">
                  {['1:1', '16:9', '9:16', '4:3'].map(r => (
                    <button key={r} onClick={() => setAspectRatio(r)} className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${aspectRatio === r ? 'bg-purple-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>{r}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-white mb-3">Generation Info</h3>
            <div className="space-y-2 text-sm">
              {[
                ['Model', IMAGE_MODELS.find(m => m.id === imageModel)?.name],
                ['Images', numImages],
                ['Quality', imageQuality],
                ['Aspect', aspectRatio],
                ['Style', selectedStyle || 'None'],
                ['References', selectedFiles.length],
              ].map(([label, val]) => (
                <div key={label as string} className="flex justify-between">
                  <span className="text-slate-400">{label}</span>
                  <span className="text-white capitalize">{String(val)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
