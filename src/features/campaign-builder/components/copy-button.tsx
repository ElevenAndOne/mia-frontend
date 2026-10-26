import { useState } from 'react'

// Copies a value (a tracked link, the campaign's tag) so a PM never retypes it into an ad (26 Oct).
export function CopyButton({ value, label = 'Copy' }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      className="paragraph-xs underline text-secondary hover:text-primary shrink-0"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        } catch {
          // no clipboard access: the value is on screen to select
        }
      }}
    >
      {copied ? 'Copied' : label}
    </button>
  )
}
