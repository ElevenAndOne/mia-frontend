interface Props {
  /** Pre-formatted "as of" date, or null when the store has no watermark yet. */
  asOf: string | null
  notes: string[]
}

// Muted provenance line under the panel: how fresh the store is and anything
// that makes the figures incomplete (missing platforms, revenue caveats).
export const CompletenessNote = ({ asOf, notes }: Props) => {
  if (!asOf && notes.length === 0) return null

  return (
    <div className="space-y-0.5">
      {asOf && <p className="paragraph-xs text-quaternary">Data complete through {asOf}</p>}
      {notes.map((note, i) => (
        <p key={i} className="paragraph-xs text-quaternary">
          {note}
        </p>
      ))}
    </div>
  )
}
