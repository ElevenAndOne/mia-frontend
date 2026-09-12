import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Spinner } from '../../../components/spinner'
import { useSession } from '../../../contexts/session-context'
import { useHomeBrief } from '../hooks/use-home-brief'
import { setHomeCardInFlight } from '../in-flight'
import type { BriefCard, BriefChip } from '../types'
import { AskMiaChips } from './ask-mia-chips'
import { DoThisNext } from './do-this-next'

interface BasicHomeProps {
  userName?: string
  /** Send a prompt into the chat (the view flips to chat mode). */
  onPrompt: (prompt: string, opts?: { opensCanvas?: boolean; displayText?: string }) => void
  disabled?: boolean
  /** Phone only: the "Your best post" peek, rendered above the cards by the caller. */
  peek?: React.ReactNode
}

/**
 * The Basic home column: greeting, "Do this next", "Ask Mia". Everything comes from today's
 * brief. A card's button either navigates, or sends a prompt into chat (remembering which
 * card started it, so when the schedule flow finishes the card can turn over in place).
 */
export const BasicHome = ({ userName, onPrompt, disabled, peek }: BasicHomeProps) => {
  const navigate = useNavigate()
  const { sessionId, activeWorkspace } = useSession()
  const tenantId = activeWorkspace?.tenant_id ?? null
  const { brief, isLoading, error, dismiss } = useHomeBrief(sessionId, tenantId)

  const runCta = useCallback(
    (card: BriefCard) => {
      const cta = card.cta
      if (cta.type === 'route' && cta.route) {
        navigate(cta.route)
        return
      }
      if (cta.type === 'chat_prompt' && cta.prompt) {
        setHomeCardInFlight(card.id)
        // The bubble shows a short line; the full built-in instruction still goes to Mia.
        const displayText =
          card.kind === 'make_another'
            ? `Make another post like my ${brief?.best_post?.weekday ?? 'best'} one`
            : cta.label
        onPrompt(cta.prompt, { opensCanvas: Boolean(cta.opens_canvas), displayText })
      }
    },
    [navigate, onPrompt, brief?.best_post?.weekday]
  )

  // The "post scheduled → card turns over" listener lives in ChatView (useHomeCardTurnover):
  // scheduling happens from the canvas inside a chat, when this component is unmounted.

  const greeting = userName ? `Hello ${userName}.` : 'Hello.'
  const stamp = brief?.generated_at
    ? `as of ${new Date(brief.generated_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} today`
    : ''

  return (
    <div className="mia-sans flex-1 overflow-y-auto min-h-0">
      <div className="mx-auto flex min-h-full w-full max-w-[40rem] flex-col items-stretch justify-center gap-5 px-4 py-6">
        <div className="text-center">
          <h1 className="text-[1.375rem] md:text-[1.5rem] leading-snug text-primary font-normal">
            {greeting}
          </h1>
          <p className="text-[1.375rem] md:text-[1.5rem] leading-snug text-primary font-normal">
            Here’s what’s happening this week.
          </p>
        </div>

        {peek}

        {isLoading && (
          <div className="flex items-center justify-center gap-3 py-6 text-tertiary paragraph-sm">
            <Spinner size="sm" variant="dark" />
            <span>Mia is reading your pages…</span>
          </div>
        )}
        {error && !isLoading && <p className="paragraph-sm text-quaternary text-center">{error}</p>}

        {brief && (
          <>
            <DoThisNext
              cards={brief.cards}
              stamp={stamp}
              onCta={runCta}
              onDismiss={(c) => dismiss(c.id)}
            />
            <AskMiaChips
              chips={brief.chips}
              onPick={(chip: BriefChip) => onPrompt(chip.prompt)}
              disabled={disabled}
            />
          </>
        )}
      </div>
    </div>
  )
}
