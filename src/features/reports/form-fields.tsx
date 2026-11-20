import { forwardRef, useRef, type ReactNode, type SelectHTMLAttributes } from 'react'
import { Calendar } from '../../components/icon/calendar'
import { ChevronDown } from '../../components/icon/chevron-down'

/**
 * The New report form's fields in the app's own look (fresh-eyes pass, 20 Nov 2026): the
 * browser's plain dropdowns and its date boxes (which showed 11/01/2026 on a US browser)
 * sat oddly beside the rest of Mia.
 */

const BOX =
  'w-full h-11 rounded-lg border border-secondary bg-primary text-primary paragraph-sm transition-colors hover:border-primary focus-within:border-brand-solid focus-within:ring-2 focus-within:ring-brand-solid/20'

/** A dropdown with the app's border, padding and chevron; still a real <select> underneath. */
export const SelectBox = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }>(
  ({ className = '', children, ...rest }, ref) => (
    <div className={`relative ${BOX} ${className}`}>
      <select
        ref={ref}
        {...rest}
        className="appearance-none w-full h-full bg-transparent pl-3 pr-9 rounded-lg focus:outline-none cursor-pointer"
      >
        {children}
      </select>
      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-quaternary"
      />
    </div>
  )
)
SelectBox.displayName = 'SelectBox'

const shown = (iso: string) => {
  if (!iso) return 'Pick a date'
  const d = new Date(`${iso}T00:00:00`)
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** A date written the way the rest of Mia writes it (1 Nov 2026); a click opens the
 *  browser's own calendar, which sits invisibly over the box. */
export const DateBox = ({
  value,
  onChange,
  min,
  max,
  label,
}: {
  value: string
  onChange: (iso: string) => void
  min?: string
  max?: string
  label: string
}) => {
  const input = useRef<HTMLInputElement>(null)
  return (
    <div className={`relative flex items-center gap-2 px-3 ${BOX}`}>
      <Calendar size={16} className="text-quaternary shrink-0" />
      <span className={value ? 'text-primary' : 'text-quaternary'}>{shown(value)}</span>
      <input
        ref={input}
        type="date"
        aria-label={label}
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        onClick={() => {
          try {
            input.current?.showPicker?.()
          } catch {
            /* older browsers open it on their own */
          }
        }}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
    </div>
  )
}
