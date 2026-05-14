import { useEffect, useRef } from 'react'

const BAR_COUNT = 22
const CENTER = (BAR_COUNT - 1) / 2 // 10.5
const SIGMA = 4.2
const MAX_H = 28
const MIN_H = 3
const IDLE_H = 3
const HISTORY_SIZE = 20

// Gaussian bell curve heights — edge bars stay tiny, centre reaches max
const GAUSSIAN_HEIGHTS = Array.from({ length: BAR_COUNT }, (_, i) => {
  const g = Math.exp(-0.5 * Math.pow((i - CENTER) / SIGMA, 2))
  return Math.max(MIN_H, Math.round(MIN_H + (MAX_H - MIN_H) * g))
})
// ≈ [3,3,4,5,8,12,16,20,24,27,28,28,27,24,20,16,12,8,5,4,3,3]

// How many history frames back each bar reads — centre=0, edges trail further
// At 60fps: 1.5 frames/step → edge bars (~10.5 steps away) lag ~260ms behind centre
const FRAME_DELAYS = Array.from({ length: BAR_COUNT }, (_, i) =>
  Math.min(HISTORY_SIZE - 1, Math.round(Math.abs(i - CENTER) * 1.5))
)
// ≈ [16,14,13,11,10,8,7,5,4,2,1,1,2,4,5,7,8,10,11,13,14,16]

// Idle stagger (CSS): centre leads, edges trail
const IDLE_DELAYS_MS = Array.from({ length: BAR_COUNT }, (_, i) =>
  Math.round(Math.abs(i - CENTER) * 60)
)

interface VoiceWaveformProps {
  stream: MediaStream | null
}

export function VoiceWaveform({ stream }: VoiceWaveformProps) {
  const barsRef = useRef<(HTMLDivElement | null)[]>([])
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (!stream) {
      cancelAnimationFrame(rafRef.current!)
      barsRef.current.forEach((bar) => {
        if (bar) bar.style.height = `${IDLE_H}px`
      })
      return
    }

    const audioCtx = new AudioContext()
    const source = audioCtx.createMediaStreamSource(stream)
    const analyser = audioCtx.createAnalyser()
    analyser.fftSize = 256
    analyser.smoothingTimeConstant = 0.8
    source.connect(analyser)

    const data = new Uint8Array(analyser.frequencyBinCount)

    // Ring buffer — stores recent amplitude samples to drive the outward ripple
    const history = new Float32Array(HISTORY_SIZE).fill(0)
    let head = 0

    const tick = () => {
      analyser.getByteFrequencyData(data)

      // Single overall voice amplitude across voice frequency bins
      let sum = 0
      for (let b = 2; b <= 22; b++) sum += data[b]
      const amplitude = sum / (21 * 255)

      // Write current amplitude into ring buffer
      history[head] = amplitude
      head = (head + 1) % HISTORY_SIZE

      barsRef.current.forEach((bar, i) => {
        if (!bar) return
        // Each bar reads from a slightly older slot — centre reacts first,
        // ripple propagates outward left and right as amplitude changes
        const delayed = history[(head - FRAME_DELAYS[i] + HISTORY_SIZE) % HISTORY_SIZE]
        const scale = 0.15 + delayed * 0.85
        bar.style.height = `${Math.max(IDLE_H, Math.round(GAUSSIAN_HEIGHTS[i] * scale))}px`
      })

      rafRef.current = requestAnimationFrame(tick)
    }
    tick()

    return () => {
      cancelAnimationFrame(rafRef.current!)
      audioCtx.close()
    }
  }, [stream])

  return (
    <div className="flex items-end justify-between w-full px-1">
      {Array.from({ length: BAR_COUNT }).map((_, i) => (
        <div
          key={i}
          ref={(el) => { barsRef.current[i] = el }}
          className={!stream ? 'rounded-full animate-voice-bar-idle' : 'rounded-full'}
          style={{
            width: '3px',
            height: `${IDLE_H}px`,
            backgroundColor: 'var(--color-text-tertiary)',
            animationDelay: !stream ? `${IDLE_DELAYS_MS[i]}ms` : undefined,
          }}
        />
      ))}
    </div>
  )
}
