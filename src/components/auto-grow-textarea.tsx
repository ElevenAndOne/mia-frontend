import { useEffect, useRef, type TextareaHTMLAttributes } from 'react'

type Props = TextareaHTMLAttributes<HTMLTextAreaElement>

// Controlled textarea that grows to fit its content (no inner scrollbar).
// Use for always-editable inline fields that may hold long, wrapping text.
export const AutoGrowTextarea = ({ value, className = '', ...rest }: Props) => {
  const ref = useRef<HTMLTextAreaElement>(null)

  const resize = () => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }

  // Re-fit on every value change (and on mount).
  useEffect(resize, [value])

  return (
    <textarea
      ref={ref}
      value={value}
      rows={1}
      onInput={resize}
      className={`resize-none overflow-hidden ${className}`}
      {...rest}
    />
  )
}
