import { Fragment } from 'react'

interface InlineMdProps {
  text: string
  /** Exact strings (e.g. campaign names) rendered as highlighted chips. */
  chips?: string[]
  className?: string
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Lightweight renderer for report body strings. The structuring pass only
 * emits `code` and **bold** inside strings (enforced by its prompt), so a
 * full markdown pipeline per row is overkill. Optional `chips` get pulled out
 * first — including any quotes/bold markers wrapping them — and rendered as
 * campaign chips like the Figma design (purple tint, 40% purple border).
 */
export const InlineMd = ({ text, chips, className }: InlineMdProps) => {
  const chipAlternation = (chips ?? [])
    .filter((c) => c.trim().length > 1)
    .sort((a, b) => b.length - a.length)
    .map((c) => `\\*{0,2}["“]?${escapeRegExp(c)}["”]?\\*{0,2}`)
    .join('|')

  const pattern = new RegExp(
    `(${chipAlternation ? `${chipAlternation}|` : ''}\`[^\`]+\`|\\*\\*[^*]+\\*\\*)`,
    'g',
  )

  const stripChip = (s: string) => s.replace(/^\*{0,2}["“]?/, '').replace(/["”]?\*{0,2}$/, '')

  return (
    <span className={className}>
      {text.split(pattern).map((part, i) => {
        if (!part) return null
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code key={i} className="gr-inner gr-code break-words">
              {part.slice(1, -1)}
            </code>
          )
        }
        if (chips?.some((c) => stripChip(part) === c)) {
          return (
            <span
              key={i}
              className="inline-block align-baseline rounded-md px-2 font-semibold whitespace-nowrap max-w-full overflow-hidden text-ellipsis"
              style={{
                color: 'var(--gr-purple-text)',
                backgroundColor: 'var(--gr-purple-tint)',
                border: '1px solid var(--gr-purple-border)',
              }}
            >
              {stripChip(part)}
            </span>
          )
        }
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={i} className="font-semibold" style={{ color: 'var(--gr-heading)' }}>
              {part.slice(2, -2)}
            </strong>
          )
        }
        return <Fragment key={i}>{part}</Fragment>
      })}
    </span>
  )
}
