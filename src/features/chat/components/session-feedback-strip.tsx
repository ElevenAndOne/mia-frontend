import { useState } from 'react'
import type { SessionFeedbackScore } from '../services/chat-service'

interface SessionFeedbackStripProps {
  /** Fires the moment a button is pressed, so the score lands before any comment. */
  onScore: (score: SessionFeedbackScore) => void
  onComment: (comment: string) => void
  onDismiss: () => void
}

const SCORES: { score: SessionFeedbackScore; label: string }[] = [
  { score: -1, label: 'Bad' },
  { score: 0, label: 'Fine' },
  { score: 1, label: 'Good' },
]

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
)

/** "How is Mia doing in this session?" — one line above the composer.
 *
 *  Sits above the composer rather than over it: it must never block typing, which is why
 *  this is a strip and not a modal. One click is the whole ask; the comment box that follows
 *  is optional and the score is already saved by then.
 *
 *  Per-message thumbs are untouched. They say which reply was wrong, which is how a bug gets
 *  found. This says whether the session was worth it, which is the number that moves week to
 *  week (thumbs managed 5 votes one week and 0 the next). */
export const SessionFeedbackStrip = ({
  onScore,
  onComment,
  onDismiss,
}: SessionFeedbackStripProps) => {
  const [step, setStep] = useState<'asking' | 'commenting' | 'done'>('asking')
  const [comment, setComment] = useState('')

  const pick = (score: SessionFeedbackScore) => {
    onScore(score)
    setStep('commenting')
  }

  const send = () => {
    const trimmed = comment.trim()
    if (trimmed) onComment(trimmed)
    setStep('done')
  }

  if (step === 'done') {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-secondary border border-primary">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-primary shrink-0">
          <path d="M20 6 9 17l-5-5" />
        </svg>
        <span className="paragraph-sm text-secondary">
          Got it, thanks. We won&rsquo;t ask again for a week.
        </span>
      </div>
    )
  }

  if (step === 'commenting') {
    return (
      <div className="flex items-center gap-3 pl-4 pr-2 py-2 rounded-xl bg-brand-primary border border-primary">
        <span className="paragraph-sm font-medium text-brand-primary whitespace-nowrap">
          Thanks. Anything specific?
        </span>
        <input
          type="text"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') send()
          }}
          maxLength={2000}
          placeholder="Optional"
          aria-label="Anything specific about this session?"
          autoFocus
          className="grow min-w-0 h-11 px-3 rounded-lg bg-primary text-primary paragraph-sm outline-none border border-transparent focus:border-brand-primary"
        />
        <button
          type="button"
          onClick={send}
          className="h-11 px-5 rounded-full bg-brand-solid text-white paragraph-sm font-medium hover:opacity-90 transition-opacity"
        >
          Send
        </button>
        <button
          type="button"
          onClick={() => setStep('done')}
          aria-label="Skip the comment"
          className="w-11 h-11 flex items-center justify-center rounded-lg text-quaternary hover:text-secondary transition-colors"
        >
          <CloseIcon />
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 pl-4 pr-2 py-2 rounded-xl bg-primary border border-primary">
      <span className="grow paragraph-sm text-secondary">How is Mia doing in this session?</span>
      <div className="flex gap-2">
        {SCORES.map(({ score, label }) => (
          <button
            key={label}
            type="button"
            onClick={() => pick(score)}
            className="h-11 px-5 rounded-full border border-primary bg-primary text-primary paragraph-sm font-medium hover:bg-secondary transition-colors"
          >
            {label}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss this question"
        className="w-11 h-11 flex items-center justify-center rounded-lg text-quaternary hover:text-secondary transition-colors"
      >
        <CloseIcon />
      </button>
    </div>
  )
}
