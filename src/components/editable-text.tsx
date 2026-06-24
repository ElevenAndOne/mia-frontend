import { useEffect, useRef, useState } from 'react'

interface EditableTextProps {
  value: string
  onSave: (value: string) => void
  className?: string
  placeholder?: string
}

// Click-to-edit single-line text. Commits on blur/Enter (only when changed),
// cancels on Escape. Generic — styling is injected via className.
export const EditableText = ({
  value,
  onSave,
  className = '',
  placeholder = 'Click to edit',
}: EditableTextProps) => {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      setDraft(value)
      setTimeout(() => {
        const el = ref.current
        if (el) {
          el.focus()
          // Place the caret at the end rather than selecting/jumping to the start.
          const end = el.value.length
          el.setSelectionRange(end, end)
        }
      }, 0)
    }
  }, [editing]) // eslint-disable-line react-hooks/exhaustive-deps

  const commit = () => {
    setEditing(false)
    if (draft.trim() !== value) onSave(draft.trim())
  }

  if (editing) {
    return (
      <input
        ref={ref}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') setEditing(false)
        }}
        className={`border-b border-utility-brand-400 outline-none bg-transparent w-full ${className}`}
      />
    )
  }
  return (
    <span
      onClick={() => setEditing(true)}
      className={`cursor-pointer hover:opacity-70 ${!value ? 'text-quaternary italic' : ''} ${className}`}
    >
      {value || placeholder}
    </span>
  )
}
