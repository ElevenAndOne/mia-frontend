import { useEffect, useRef, useState, type InputHTMLAttributes } from 'react'

// One input for every editable value on the campaign page (live test 21 Oct: some boxes saved on Enter, some only
// on leaving, and each read numbers its own way). It saves on Enter or on leaving the box, only when the text changed,
// and sends exactly what was typed: the server reads amounts ("60k", "R124", "5%") with one shared reader and says
// plainly when it can't.
export function Field({
  value,
  onCommit,
  ...rest
}: { value: string | number | null | undefined; onCommit: (typed: string) => void } & Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'onBlur' | 'onKeyDown'
>) {
  const shown = value == null ? '' : String(value)
  const [v, setV] = useState(shown)
  // A refresh never overwrites a box the PM is typing in, and typing in a box that disappears (a plan run starting)
  // is saved, not dropped (review 26 Oct)
  const focused = useRef(false)
  const latest = useRef({ v, shown, onCommit })
  latest.current = { v, shown, onCommit }
  useEffect(() => {
    if (!focused.current) setV(shown)
  }, [shown])
  useEffect(
    () => () => {
      const { v: typed, shown: was, onCommit: save } = latest.current
      if (focused.current && typed.trim() !== was.trim()) save(typed.trim())
    },
    [],
  )
  const commit = () => {
    focused.current = false
    if (v.trim() !== shown.trim()) onCommit(v.trim())
  }
  return (
    <input
      {...rest}
      value={v}
      onFocus={() => {
        focused.current = true
      }}
      onChange={(e) => setV(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          e.currentTarget.blur() // saves through onBlur, once
        } else if (e.key === 'Escape') {
          setV(shown)
        }
      }}
    />
  )
}
