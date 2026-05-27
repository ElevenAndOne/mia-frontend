import { useState, useRef, useEffect } from 'react'
import { Loader2, Film, Download, Play, Pause, RotateCw, Wand2, Camera, Layers, ChevronDown, ChevronUp } from 'lucide-react'
import {
  VIDEO_MODELS, vfxTemplates, cameraMovements,
  VideoModelSelector, EnhancedTimeline, ProgressBar,
} from './creative-studio-shared'
import { creativeStudioApi } from './creative-studio-api'

interface Props {
  tenantId: string
  sessionId: string
}

export default function CreateTab({ tenantId, sessionId }: Props) {
  const [videoModel, setVideoModel] = useState('veo-3.1')
  const [videoPrompt, setVideoPrompt] = useState('')
  const [vfxTemplate, setVfxTemplate] = useState<string | null>(null)
  const [cameraMovement, setCameraMovement] = useState<string | null>(null)
  const [duration, setDuration] = useState(5)
  const [cameraOpen, setCameraOpen] = useState(true)
  const [vfxOpen, setVfxOpen] = useState(true)

  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [jobId, setJobId] = useState<string | null>(null)
  const [generatedVideo, setGeneratedVideo] = useState<{ url: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const currentModel = VIDEO_MODELS.find(m => m.id === videoModel)
  const maxDuration = currentModel?.maxDuration ?? 8
  const minDuration = currentModel?.minDuration ?? 1

  useEffect(() => {
    if (duration > maxDuration) setDuration(maxDuration)
    if (duration < minDuration) setDuration(minDuration)
  }, [videoModel, maxDuration, minDuration])

  useEffect(() => {
    if (!jobId) return
    let cancelled = false
    let ticks = 0

    pollRef.current = setInterval(async () => {
      ticks++
      setProgress(Math.min(90, ticks * 5))
      try {
        const job = await creativeStudioApi.getJob(tenantId, sessionId, jobId)
        if (cancelled) return
        if (job.status === 'completed') {
          clearInterval(pollRef.current!)
          setProgress(100)
          const url: string = job.output_urls?.[0] ?? job.output_url ?? ''
          setGeneratedVideo({ url })
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

    return () => {
      cancelled = true
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [jobId, tenantId, sessionId])

  const handleVfxSelect = (id: string) => {
    setVfxTemplate(vfxTemplate === id ? null : id)
    setCameraMovement(null)
  }

  const handleCameraSelect = (id: string) => {
    setCameraMovement(cameraMovement === id ? null : id)
    setVfxTemplate(null)
  }

  const handleGenerate = async () => {
    if (!videoPrompt.trim()) return
    setIsGenerating(true)
    setError(null)
    setProgress(0)
    setGeneratedVideo(null)

    const vfxInfo = vfxTemplates.find(v => v.id === vfxTemplate)
    const fullPrompt = vfxInfo ? `${videoPrompt}. ${vfxInfo.prompt}` : videoPrompt
    const camInfo = cameraMovements.find(c => c.id === cameraMovement)
    const promptWithCam = camInfo ? `${fullPrompt}. Camera: ${camInfo.description}` : fullPrompt

    try {
      const res = await creativeStudioApi.generate(tenantId, sessionId, {
        type: 'video',
        model: videoModel,
        prompt: promptWithCam,
        duration,
        aspect_ratio: '16:9',
        quality: 'standard',
        reference_images: [],
        camera_movement: cameraMovement,
        vfx_template: vfxTemplate,
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

  const handlePlayPause = () => {
    const v = videoRef.current
    if (!v) return
    if (isPlaying) v.pause(); else v.play()
    setIsPlaying(!isPlaying)
  }

  const handleRestart = () => {
    const v = videoRef.current
    if (!v) return
    v.currentTime = 0
    if (!isPlaying) { v.play(); setIsPlaying(true) }
  }

  const canGenerate = videoPrompt.trim().length > 0 && !isGenerating
  const selectedCamera = cameraMovements.find(c => c.id === cameraMovement)
  const selectedVfx = vfxTemplates.find(v => v.id === vfxTemplate)

  return (
    <div className="grid grid-cols-12 gap-6 items-stretch">

      {/* Left — Model + Camera Movement */}
      <div className="col-span-3 flex flex-col gap-4">
        <div className="shrink-0 z-10">
          <VideoModelSelector value={videoModel} onChange={setVideoModel} />
        </div>

        {/* Camera Movement — flex-1 to fill remaining height */}
        <div className={`flex-1 flex flex-col bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-xl overflow-hidden ${vfxTemplate ? 'opacity-50' : ''}`}>
          <button
            onClick={() => !vfxTemplate && setCameraOpen(o => !o)}
            disabled={!!vfxTemplate}
            className="shrink-0 w-full flex items-center justify-between p-4 text-left hover:bg-slate-800/50 transition-colors"
          >
            <span className="text-sm font-semibold text-white flex items-center gap-2">
              <Camera className="w-4 h-4" />
              Camera Movement
              {selectedCamera && !cameraOpen && (
                <span className="text-xs text-purple-400 font-normal">· {selectedCamera.name}</span>
              )}
              {vfxTemplate && <span className="text-xs text-yellow-400 font-normal">(VFX active)</span>}
            </span>
            {cameraOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {cameraOpen && (
            <div className="flex-1 px-4 pb-4 grid grid-cols-2 gap-3 content-start">
              {cameraMovements.map(m => (
                <button
                  key={m.id}
                  onClick={() => handleCameraSelect(m.id)}
                  className={`relative overflow-hidden rounded-lg text-left transition-all h-28 ${
                    cameraMovement === m.id ? 'ring-2 ring-purple-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <video src={m.video} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover opacity-25" />
                  <div className="relative z-10 p-3">
                    <div className="text-sm font-medium">{m.name}</div>
                    <div className="text-xs opacity-75">{m.description}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Centre — Preview, Prompt, Timeline */}
      <div className="col-span-6 flex flex-col gap-4">
        {/* Video preview — grows to fill */}
        <div className="flex-1 bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-xl p-4 min-h-[220px] flex items-center justify-center">
          {generatedVideo ? (
            <div className="relative w-full">
              <video
                ref={videoRef}
                src={generatedVideo.url}
                className="w-full rounded-lg"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
                controls={false}
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent rounded-b-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button onClick={handlePlayPause} className="p-1.5 bg-slate-800/80 rounded-lg hover:bg-slate-700/80 transition-colors">
                      {isPlaying ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white" />}
                    </button>
                    <button onClick={handleRestart} className="p-1.5 bg-slate-800/80 rounded-lg hover:bg-slate-700/80 transition-colors">
                      <RotateCw className="w-4 h-4 text-white" />
                    </button>
                  </div>
                  <a href={generatedVideo.url} download className="p-1.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors">
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center">
              {isGenerating ? (
                <>
                  <Loader2 className="w-10 h-10 text-purple-500 animate-spin mx-auto mb-3" />
                  <p className="text-white mb-1">Generating video... {progress}%</p>
                  <p className="text-slate-400 text-xs">This usually takes 1–3 minutes</p>
                  {progress > 0 && <ProgressBar progress={progress} />}
                </>
              ) : error ? (
                <>
                  <div className="text-red-400 mb-2">Generation failed</div>
                  <p className="text-slate-500 text-sm">{error}</p>
                </>
              ) : (
                <>
                  <Film className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">Your video will appear here</p>
                  <p className="text-xs text-slate-500 mt-1">Model: {VIDEO_MODELS.find(m => m.id === videoModel)?.name}</p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Prompt */}
        <div className="shrink-0 bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-xl p-3">
          <h3 className="text-sm font-semibold text-white mb-2">Video Prompt</h3>
          <textarea
            value={videoPrompt}
            onChange={(e) => setVideoPrompt(e.target.value)}
            rows={3}
            className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none text-sm"
            placeholder="Describe your video scene..."
            maxLength={1000}
          />
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-slate-500">{videoPrompt.length}/1000</span>
            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1 ${canGenerate ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg hover:shadow-purple-500/25' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}
            >
              {isGenerating ? <><Loader2 className="w-3 h-3 animate-spin" /> Generating...</> : <><Wand2 className="w-3 h-3" /> Generate Video</>}
            </button>
          </div>
        </div>

        <div className="shrink-0">
          <EnhancedTimeline
            videoRef={videoRef} duration={duration} minDuration={minDuration} maxDuration={maxDuration}
            isPlaying={isPlaying} onPlayPause={handlePlayPause} onRestart={handleRestart} onChangeDuration={setDuration}
          />
        </div>
      </div>

      {/* Right — VFX Templates + Generation Info */}
      <div className="col-span-3 flex flex-col gap-4">

        {/* VFX Templates — flex-1 to fill */}
        <div className={`flex-1 flex flex-col bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-xl overflow-hidden ${cameraMovement ? 'opacity-50' : ''}`}>
          <button
            onClick={() => !cameraMovement && setVfxOpen(o => !o)}
            disabled={!!cameraMovement}
            className="shrink-0 w-full flex items-center justify-between p-4 text-left hover:bg-slate-800/50 transition-colors"
          >
            <span className="text-sm font-semibold text-white flex items-center gap-2">
              <Layers className="w-4 h-4" />
              VFX Templates
              {selectedVfx && !vfxOpen && (
                <span className="text-xs text-purple-400 font-normal">· {selectedVfx.name}</span>
              )}
              {cameraMovement && <span className="text-xs text-yellow-400 font-normal">(Camera active)</span>}
            </span>
            {vfxOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {vfxOpen && (
            <div className="flex-1 px-4 pb-4 flex flex-col gap-2">
              {vfxTemplates.map(vfx => (
                <button
                  key={vfx.id}
                  onClick={() => handleVfxSelect(vfx.id)}
                  className={`relative overflow-hidden flex-1 min-h-[60px] w-full rounded-lg text-left transition-all flex items-center gap-3 px-3 ${
                    vfxTemplate === vfx.id ? 'ring-2 ring-purple-500 bg-slate-700' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <video src={vfx.video} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover opacity-20" />
                  <div className="relative z-10">
                    <div className="text-sm font-medium text-white">{vfx.name}</div>
                    <div className="text-xs text-slate-400">{vfx.description}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Generation Info */}
        <div className="shrink-0 bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3">Generation Info</h3>
          <div className="space-y-2 text-sm">
            {([
              ['Model', VIDEO_MODELS.find(m => m.id === videoModel)?.name],
              ['Duration', `${duration}s`],
              ['References', 'None'],
              selectedVfx ? ['VFX', selectedVfx.name] : null,
              selectedCamera ? ['Camera', selectedCamera.name] : null,
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
  )
}
