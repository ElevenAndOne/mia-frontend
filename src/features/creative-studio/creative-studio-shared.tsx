import { useRef, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Wand2, Video as VideoIcon, Upload, Loader2,
  Play, Pause, Download, ChevronDown, Camera, Film,
  Zap, Layers, Palette, Sun, Moon, Cloud, Sunrise,
  Grid3x3, Monitor, Clock, Copy,
  RotateCw, Circle, Split, Move,
  Package, Volume2, Coffee, Trash2,
  Sliders, BookOpen, Lightbulb, HelpCircle, Sparkles,
} from 'lucide-react'

const S3 = 'https://mia-creative-assets.s3.amazonaws.com/previews'

// ── Model definitions ──────────────────────────────────────────────────────

export const VIDEO_MODELS = [
  { id: 'veo-3.1',        name: 'Veo 3.1',         icon: '🎬', badge: 'Cinematic', description: "Google's cinematic AI via fal.ai",  maxDuration: 8,  minDuration: 1 },
  { id: 'runway-gen-4.5', name: 'Runway Gen-4.5',   icon: '🎥', badge: 'Fast',      description: 'Creative video via Runway API',    maxDuration: 16, minDuration: 1 },
  { id: 'kling-3.0',      name: 'Kling 3.0 Pro',    icon: '🎞️', badge: 'Creative',  description: 'Kuaishou cinematic via fal.ai',    maxDuration: 10, minDuration: 1 },
]

export const IMAGE_MODELS = [
  { id: 'gpt-image-2',   name: 'GPT Image 2',   icon: '🎨', badge: 'Creative',  description: "OpenAI's creative image model" },
  { id: 'flux-2-pro',    name: 'FLUX.2 Pro',    icon: '📸', badge: 'Quality',   description: 'Black Forest Labs via fal.ai' },
  { id: 'nano-banana-2', name: 'Nano Banana 2', icon: '🍌', badge: 'Editable',  description: 'Continuous editing via Gemini' },
]

// ── Presets ────────────────────────────────────────────────────────────────

export const vfxTemplates = [
  { id: 'earth-zoom-out', name: 'Earth Zoom Out', description: 'Pull back to space',    video: `${S3}/vfx/earth-zoom-out.mp4`, prompt: "dramatic zoom out from ground level to Earth's orbit, pulling back to reveal the planet from space" },
  { id: 'disintegrate',   name: 'Disintegrate',   description: 'Dissolve to particles', video: `${S3}/vfx/disintegrate.mp4`,   prompt: 'object or person dissolving into floating particles that drift away and disappear' },
  { id: 'eyes-in',        name: 'Eyes In',        description: 'Zoom into the eyes',    video: `${S3}/vfx/eyes-in.mp4`,        prompt: "dramatic zoom into the subject's eyes, revealing reflection or transitioning through the pupil" },
  { id: 'face-punch',     name: 'Face Punch',     description: 'Bullet-time impact',    video: `${S3}/vfx/face-punch.mp4`,     prompt: 'slow motion punch impact with ripple effect, bullet-time style with debris and particles' },
  { id: 'lens-crack',     name: 'Lens Crack',     description: 'Glass shatter effect',  video: `${S3}/vfx/lens-crack.mp4`,     prompt: 'camera lens or glass cracking and shattering with light refraction through the cracks' },
  { id: 'paint-splash',   name: 'Paint Splash',   description: 'Liquid color burst',    video: `${S3}/vfx/paint-splash.mp4`,   prompt: 'explosive paint or liquid color splash, vibrant colors bursting and mixing in slow motion' },
]

export const cameraMovements = [
  { id: 'bullet-time', name: 'Bullet Time', description: 'Slow motion with rotation', video: `${S3}/cam/bullet-time.mp4` },
  { id: 'crane-down',  name: 'Crane Down',  description: 'Descend toward subject',    video: `${S3}/cam/crane-down.mp4` },
  { id: 'crane-up',    name: 'Crane Up',    description: 'Rise above subject',        video: `${S3}/cam/crane-up.mp4` },
  { id: 'dolly-in',    name: 'Dolly In',    description: 'Move toward subject',       video: `${S3}/cam/dolly-in.mp4` },
  { id: 'dolly-out',   name: 'Dolly Out',   description: 'Move away from subject',    video: `${S3}/cam/dolly-out.mp4` },
  { id: 'focus-shift', name: 'Focus Shift', description: 'Change focus point',        video: `${S3}/cam/focus-shift.mp4` },
  { id: 'fpv-drone',   name: 'FPV Drone',   description: 'First-person drone view',   video: `${S3}/cam/fpv-drone.mp4` },
  { id: 'lazy-susan',  name: 'Lazy Susan',  description: 'Smooth circular rotation',  video: `${S3}/cam/lazy-susan.mp4` },
]

export const PROMPT_TEMPLATES: Record<string, { category: string; template: string; icon: any }[]> = {
  'veo-3.1': [
    { category: 'Cinematic',  template: 'Cinematic shot: [subject], dramatic lighting, 4K quality, smooth camera movement', icon: Film },
    { category: 'Product',    template: '[Product] rotating slowly, professional studio lighting, pristine white background', icon: Package },
    { category: 'Audio Cue',  template: 'Audio: [sound effect description]. Visual: [scene description]', icon: Volume2 },
    { category: 'Nature',     template: 'Time-lapse of [natural phenomenon], golden hour lighting, wide angle lens', icon: Sunrise },
  ],
  'runway-gen-4.5': [
    { category: 'Dynamic',  template: '[Subject] with dynamic motion, energetic movement, cinematic quality', icon: Zap },
    { category: 'Stylized', template: 'Stylized [scene], artistic interpretation, bold colors and composition', icon: Palette },
  ],
  'kling-3.0': [
    { category: 'Cinematic', template: 'Cinematic [scene], smooth motion, professional quality', icon: Film },
    { category: 'Creative',  template: 'Creative interpretation of [subject], bold and expressive', icon: Palette },
  ],
  'gpt-image-2': [
    { category: 'Professional', template: 'A professional photograph of [subject], high-quality, detailed, sharp focus', icon: Camera },
    { category: 'Artistic',     template: 'An artistic rendering of [subject] in the style of [art movement]', icon: Palette },
    { category: 'Marketing',    template: 'A modern marketing banner featuring [product], minimalist design, brand colors', icon: Monitor },
  ],
  'flux-2-pro': [
    { category: 'Photorealistic', template: 'Photorealistic image of [subject], commercial photography, perfect lighting', icon: Camera },
    { category: 'Product Shot',   template: 'Premium [product] photography, elegant packaging, lifestyle setting', icon: Package },
    { category: 'Food',           template: 'Appetizing [food item], professional food photography, natural lighting', icon: Coffee },
  ],
  'nano-banana-2': [
    { category: 'Editable',    template: '[Subject] in a clean, well-lit scene, easy to edit', icon: Wand2 },
    { category: 'Background',  template: '[Subject] on [background], styled for easy isolation', icon: Layers },
  ],
}

export const PROMPT_TIPS: Record<string, string[]> = {
  'veo-3.1': [
    "Use cinematic language: 'dolly shot', 'rack focus', 'crane shot'",
    "Include audio cues for better results: 'Audio: wings flapping'",
    "Keep prompts under 1000 characters for optimal processing",
    "Specify frame rate and quality: '24fps, cinematic quality'",
  ],
  'runway-gen-4.5': [
    'Keep prompts concise and action-focused',
    'Maximum 500 characters for best results',
    'Focus on motion and dynamics',
    'Good for stylized and creative content',
  ],
  'kling-3.0': [
    'Great for smooth, flowing camera movements',
    'Describe motion clearly: direction, speed, subject',
    'Works well with camera movement modifiers',
  ],
  'gpt-image-2': [
    "Start with an article: 'A', 'An', 'The' for better comprehension",
    'Handles text in images well — specify if needed',
    'Be specific about artistic style and mood',
    "Include composition details: 'centered', 'rule of thirds'",
  ],
  'flux-2-pro': [
    'Best for photorealistic results — emphasize realism',
    'Include professional photography terms',
    "Specify lighting: 'studio lighting', 'golden hour', 'soft box'",
    'Great for product photography — mention surface and texture',
  ],
  'nano-banana-2': [
    'Designed for continuous iterative editing',
    'Start with a clear base image description',
    'Use the Edit button to refine iteratively',
    'Be specific about what to change in edit prompts',
  ],
}

export const stylePresets = [
  { id: 'product',   name: 'Product Photography', icon: Camera,  description: 'Clean, professional product shots' },
  { id: 'lifestyle', name: 'Lifestyle Shot',       icon: Sun,     description: 'Natural, everyday scenes' },
  { id: 'marketing', name: 'Marketing Banner',     icon: Monitor, description: 'Eye-catching promotional' },
  { id: 'social',    name: 'Social Media Post',    icon: Grid3x3, description: 'Optimized for social' },
]

export const compositionRules = [
  { id: 'thirds',      name: 'Rule of Thirds', icon: Grid3x3 },
  { id: 'golden',      name: 'Golden Ratio',   icon: Circle },
  { id: 'center',      name: 'Center Focus',   icon: Circle },
  { id: 'leading',     name: 'Leading Lines',  icon: Move },
  { id: 'symmetrical', name: 'Symmetrical',    icon: Split },
]

export const lightingPresets = [
  { id: 'studio',   name: 'Studio',      icon: Sun },
  { id: 'natural',  name: 'Natural',     icon: Cloud },
  { id: 'golden',   name: 'Golden Hour', icon: Sunrise },
  { id: 'dramatic', name: 'Dramatic',    icon: Moon },
]

export const depthOfFieldPresets = [
  { id: 'shallow',  name: 'Shallow' },
  { id: 'moderate', name: 'Moderate' },
  { id: 'deep',     name: 'Deep' },
]

export const tonePresets = [
  { id: 'neutral', name: 'Neutral' },
  { id: 'warm',    name: 'Warm' },
  { id: 'cool',    name: 'Cool' },
]

// ── Prompt builder ─────────────────────────────────────────────────────────

export function buildEnhancedPrompt(basePrompt: string, settings: Record<string, any>) {
  let enhanced = basePrompt

  const styleModifiers: Record<string, string> = {
    product:   ', professional product photography, clean background, commercial quality',
    lifestyle: ', natural lifestyle setting, warm and inviting, everyday scene',
    marketing: ', eye-catching marketing visual, bold and modern, promotional style',
    social:    ', optimized for social media, engaging and shareable, trendy aesthetic',
  }
  const lightingModifiers: Record<string, string> = {
    studio:   ', professional studio lighting, soft shadows, even illumination',
    natural:  ', natural lighting, outdoor ambiance, soft and organic',
    golden:   ', golden hour lighting, warm tones, dramatic shadows',
    dramatic: ', dramatic lighting, high contrast, moody atmosphere',
  }

  if (settings.style && styleModifiers[settings.style])     enhanced += styleModifiers[settings.style]
  if (settings.lighting && lightingModifiers[settings.lighting]) enhanced += lightingModifiers[settings.lighting]

  if (settings.model === 'gpt-image-2' && !enhanced.toLowerCase().match(/^(a |an |the )/))
    enhanced = 'A ' + enhanced
  if (settings.model === 'flux-2-pro')
    enhanced += ', photorealistic, high detail, professional photography'

  return enhanced
}

// ── Shared components ──────────────────────────────────────────────────────

export function VideoModelSelector({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const selectedModel = VIDEO_MODELS.find(m => m.id === value)

  return (
    <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-xl p-4">
      <label className="text-sm font-semibold text-white mb-3 block">Select Video Model</label>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full p-4 bg-slate-800 border border-slate-700 rounded-xl hover:border-purple-500/50 transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center text-lg">{selectedModel?.icon}</div>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className="text-white font-medium">{selectedModel?.name}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">{selectedModel?.badge}</span>
              </div>
              <p className="text-xs text-slate-400">{selectedModel?.description}</p>
            </div>
          </div>
          <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-[9999] overflow-hidden min-w-full">
            {VIDEO_MODELS.map((model) => (
              <button
                key={model.id}
                onClick={() => { onChange(model.id); setIsOpen(false) }}
                className={`w-full p-4 transition-all text-left hover:bg-slate-700 border-b border-slate-700 last:border-b-0 ${value === model.id ? 'bg-purple-500/10' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg ${model.id === 'veo-3.1' ? 'bg-purple-500' : model.id === 'runway-gen-4.5' ? 'bg-green-500' : 'bg-orange-500'}`}>
                    {model.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{model.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">{model.badge}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{model.description}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Max: {model.maxDuration}s</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function ImageModelSelector({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const selectedModel = IMAGE_MODELS.find(m => m.id === value)

  const badgeColor = (badge: string) => {
    if (badge === 'Creative') return 'bg-green-500/20 text-green-300'
    if (badge === 'Quality')  return 'bg-blue-500/20 text-blue-300'
    return 'bg-purple-500/20 text-purple-300'
  }

  return (
    <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-xl p-4">
      <label className="text-sm font-semibold text-white mb-3 block">Select Image Model</label>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full p-4 bg-slate-800 border border-slate-700 rounded-xl hover:border-purple-500/50 transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center text-lg">{selectedModel?.icon}</div>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className="text-white font-medium">{selectedModel?.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${badgeColor(selectedModel?.badge ?? '')}`}>{selectedModel?.badge}</span>
              </div>
              <p className="text-xs text-slate-400">{selectedModel?.description}</p>
            </div>
          </div>
          <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-[9999] overflow-hidden min-w-full">
            {IMAGE_MODELS.map((model) => (
              <button
                key={model.id}
                onClick={() => { onChange(model.id); setIsOpen(false) }}
                className={`w-full p-4 transition-all text-left hover:bg-slate-700 border-b border-slate-700 last:border-b-0 ${value === model.id ? 'bg-purple-500/10' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg ${model.id === 'gpt-image-2' ? 'bg-green-500' : model.id === 'flux-2-pro' ? 'bg-blue-500' : 'bg-yellow-500'}`}>
                    {model.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{model.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${badgeColor(model.badge)}`}>{model.badge}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{model.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function ReferenceUpload({ files, onChange, label = 'Reference Assets' }: { files: File[]; onChange: (f: File[]) => void; label?: string }) {
  const inputRef = useRef<HTMLInputElement | null>(null)

  const handleSelect: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const newFiles = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'))
    onChange([...files, ...newFiles].slice(0, 5))
  }

  return (
    <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Layers className="w-4 h-4 text-white" />
        <h3 className="text-sm font-semibold text-white">{label}</h3>
      </div>
      <div
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-slate-600 rounded-xl p-6 text-center cursor-pointer hover:border-purple-500/50 transition-colors bg-slate-800/20"
      >
        <Upload className="w-8 h-8 text-slate-500 mx-auto mb-2" />
        <div className="text-sm text-slate-400 mb-2">{files.length}/5 selected</div>
        <span className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium text-sm">Browse Assets</span>
        <p className="text-xs text-slate-500 mt-2">PNG • JPG • WEBP (max 5)</p>
      </div>
      <input ref={inputRef} type="file" accept="image/*" multiple onChange={handleSelect} className="hidden" />
      {files.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {files.map((f, idx) => (
            <div key={idx} className="relative group">
              <div className="aspect-video bg-slate-800 rounded-lg overflow-hidden">
                <img src={URL.createObjectURL(f)} alt={f.name} className="w-full h-full object-cover" />
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onChange(files.filter((_, i) => i !== idx)) }}
                className="absolute top-1 right-1 p-1 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-3 h-3 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function EnhancedTimeline({
  videoRef, duration, minDuration, maxDuration, isPlaying, onPlayPause, onRestart, onChangeDuration,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>
  duration: number; minDuration: number; maxDuration: number
  isPlaying: boolean; onPlayPause: () => void; onRestart: () => void; onChangeDuration: (v: number) => void
}) {
  const [currentTime, setCurrentTime] = useState(0)
  const [videoDur, setVideoDur] = useState(duration)

  useEffect(() => {
    const v = videoRef.current
    if (!v) { setVideoDur(duration); setCurrentTime(0); return }
    let animId: number
    const updateTime = () => setCurrentTime(v.currentTime)
    const updateDur = () => setVideoDur(v.duration || duration)
    const smoothUpdate = () => { updateTime(); if (!v.paused) animId = requestAnimationFrame(smoothUpdate) }
    v.addEventListener('timeupdate', updateTime)
    v.addEventListener('loadedmetadata', updateDur)
    v.addEventListener('play', smoothUpdate)
    v.addEventListener('pause', () => cancelAnimationFrame(animId))
    if (v.duration) updateDur()
    return () => {
      v.removeEventListener('timeupdate', updateTime)
      v.removeEventListener('loadedmetadata', updateDur)
      v.removeEventListener('play', smoothUpdate)
      v.removeEventListener('pause', () => cancelAnimationFrame(animId))
      cancelAnimationFrame(animId)
    }
  }, [videoRef, duration])

  const progress = videoDur > 0 ? (currentTime / videoDur) * 100 : 0

  return (
    <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Clock className="w-4 h-4" /> Timeline</h3>
        <div className="flex items-center gap-2">
          <button onClick={onPlayPause} className="p-1.5 bg-slate-800 rounded hover:bg-slate-700 transition-colors">
            {isPlaying ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white" />}
          </button>
          <button onClick={onRestart} className="p-1.5 bg-slate-800 rounded hover:bg-slate-700 transition-colors">
            <RotateCw className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-100 ease-out" style={{ width: `${progress}%` }} />
      </div>
      <div className="flex justify-between text-xs text-slate-400 mt-1">
        <span>{currentTime.toFixed(1)}s</span><span>{videoDur.toFixed(1)}s</span>
      </div>
      <div className="border-t border-slate-800 mt-4 pt-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-semibold text-white">Duration</h4>
          <span className="text-xs text-slate-400">Max: {maxDuration}s</span>
        </div>
        <input type="range" min={minDuration} max={maxDuration} step={1} value={duration} onChange={(e) => onChangeDuration(parseInt(e.target.value))} className="w-full accent-purple-500" />
        <div className="flex justify-between text-xs text-slate-400 mt-1">
          <span>{minDuration}s</span><span className="text-white font-medium">{duration}s</span><span>{maxDuration}s</span>
        </div>
      </div>
    </div>
  )
}

export function QualitySettingsPanel({ quality, lighting, depthOfField, tone, noTextOrLogos, onSettingsChange }: {
  quality: 'standard' | 'high'; lighting: string; depthOfField: string; tone: string; noTextOrLogos: boolean
  onSettingsChange: (k: string, v: any) => void
}) {
  return (
    <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><Sliders className="w-4 h-4" /> Quality Settings</h3>
      <div className="space-y-4">
        <div>
          <label className="text-xs text-slate-400 mb-2 block">Quality</label>
          <div className="grid grid-cols-2 gap-2">
            {(['standard', 'high'] as const).map(q => (
              <button key={q} onClick={() => onSettingsChange('quality', q)} className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors capitalize ${quality === q ? 'bg-purple-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>{q === 'high' ? 'High Quality' : 'Standard'}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-2 block">Lighting</label>
          <div className="grid grid-cols-2 gap-2">
            {lightingPresets.map(p => {
              const Icon = p.icon
              return <button key={p.id} onClick={() => onSettingsChange('lighting', lighting === p.id ? '' : p.id)} className={`p-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1 ${lighting === p.id ? 'bg-purple-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}><Icon className="w-3 h-3" /> {p.name}</button>
            })}
          </div>
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-2 block">Depth of Field</label>
          <div className="grid grid-cols-3 gap-2">
            {depthOfFieldPresets.map(p => (
              <button key={p.id} onClick={() => onSettingsChange('depthOfField', depthOfField === p.id ? '' : p.id)} className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${depthOfField === p.id ? 'bg-purple-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>{p.name}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-2 block">Tone</label>
          <div className="grid grid-cols-3 gap-2">
            {tonePresets.map(p => (
              <button key={p.id} onClick={() => onSettingsChange('tone', tone === p.id ? '' : p.id)} className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${tone === p.id ? 'bg-purple-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>{p.name}</button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <label className="text-xs text-slate-400">No Text or Logos</label>
          <button onClick={() => onSettingsChange('noTextOrLogos', !noTextOrLogos)} className={`relative w-10 h-5 rounded-full transition-colors ${noTextOrLogos ? 'bg-purple-500' : 'bg-slate-700'}`}>
            <motion.div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full" animate={{ x: noTextOrLogos ? 20 : 0 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
          </button>
        </div>
      </div>
    </div>
  )
}

export function PromptTemplatesPanel({ model, onSelectTemplate, onEnhancePrompt }: { model: string; onSelectTemplate: (t: string) => void; onEnhancePrompt: () => void }) {
  const [showTips, setShowTips] = useState(false)
  const templates = PROMPT_TEMPLATES[model] || PROMPT_TEMPLATES['veo-3.1']
  const tips = PROMPT_TIPS[model] || PROMPT_TIPS['veo-3.1']

  return (
    <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2"><BookOpen className="w-4 h-4" /> Prompt Helper</h3>
        <button onClick={onEnhancePrompt} className="px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs rounded-lg font-medium hover:shadow-lg hover:shadow-purple-500/25 transition-all flex items-center gap-1">
          <Sparkles className="w-3 h-3" /> Enhance
        </button>
      </div>
      <div className="space-y-2 mb-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400">Quick Templates</p>
          <button onClick={() => setShowTips(!showTips)} className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1">
            <Lightbulb className="w-3 h-3" /> {showTips ? 'Hide' : 'Show'} Tips
          </button>
        </div>
        {templates.map((t, idx) => {
          const Icon = t.icon
          return (
            <button key={idx} onClick={() => onSelectTemplate(t.template)} className="w-full p-2 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg text-left transition-all group">
              <div className="flex items-start gap-2">
                <Icon className="w-4 h-4 text-purple-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-white">{t.category}</p>
                  <p className="text-xs text-slate-400 mt-0.5 group-hover:text-slate-300">{t.template}</p>
                </div>
                <Copy className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
          )
        })}
      </div>
      <AnimatePresence>
        {showTips && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="pt-3 border-t border-slate-700">
              <p className="text-xs font-medium text-white mb-2 flex items-center gap-1"><HelpCircle className="w-3 h-3" /> Model Tips</p>
              <div className="space-y-1">
                {tips.map((tip, idx) => (
                  <div key={idx} className="flex items-start gap-2"><span className="text-purple-400 text-xs">•</span><p className="text-xs text-slate-400">{tip}</p></div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="w-full max-w-xs mx-auto mt-4">
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300 ease-out" style={{ width: `${progress}%` }} />
      </div>
      <div className="flex justify-between text-xs text-slate-400 mt-1">
        <span>0%</span><span className="text-purple-400">{progress}%</span><span>100%</span>
      </div>
    </div>
  )
}

export function AnimatedBackground() {
  return (
    <div className="fixed inset-0 -z-10 pointer-events-none">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950" />
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500 rounded-full filter blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500 rounded-full filter blur-3xl animate-pulse delay-1000" />
      </div>
    </div>
  )
}

