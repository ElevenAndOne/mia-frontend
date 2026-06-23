import { useEffect, useRef, useState } from 'react'

interface EditableTextareaProps {
  value: string
  onSave: (value: string) => void
  className?: string
  placeholder?: string
  rows?: number
}

// Click-to-edit multi-line text that auto-grows to fit content. Commits on blur
// (only when changed), cancels on Escape. Generic — styling via className.
export const EditableTextarea = ({
  value,
  onSave,
  className = '',
  placeholder = 'Click to add text',
  rows = 3,
}: EditableTextareaProps) => {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const ref = useRef<HTMLTextAreaElement>(null)

  const autosize = () => {
    const el = ref.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight}px`
    }
  }

  useEffect(() => {
    if (editing) {
      setDraft(value)
      setTimeout(() => {
        ref.current?.focus()
        autosize()
      }, 0)
    }
  }, [editing]) // eslint-disable-line react-hooks/exhaustive-deps

  const commit = () => {
    setEditing(false)
    if (draft !== value) onSave(draft)
  }

  if (editing) {
    return (
      <textarea
        ref={ref}
        value={draft}
        rows={rows}
        onChange={(e) => {
          setDraft(e.target.value)
          autosize()
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setEditing(false)
            setDraft(value)
          }
        }}
        className={`w-full border border-utility-brand-300 rounded-lg outline-none bg-primary px-2 py-1.5 resize-none overflow-hidden ${className}`}
      />
    )
  }
  return (
    <div
      onClick={() => setEditing(true)}
      className={`cursor-pointer hover:opacity-70 whitespace-pre-wrap ${!value ? 'text-quaternary italic' : ''} ${className}`}
    >
      {value || placeholder}
    </div>
  )
}
