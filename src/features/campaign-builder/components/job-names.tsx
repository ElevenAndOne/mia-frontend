import type { JobNames as Names } from '../types'
import { CopyButton } from './copy-button'

// A job's Job ID and, for a campaign named under the agreed scheme, every name it carries and the tags its link gets
// (naming + tracking step 1, 20 Nov 2026). One quiet line; the names open on tap.

export function JobId({ id }: { id?: string | null }) {
  if (!id) return null
  return (
    <span className="ml-1.5 rounded bg-tertiary px-1 py-0.5 paragraph-xs text-secondary tabular-nums" title="Job ID: on every name, file and link for this job">
      {id}
    </span>
  )
}

export function JobNames({ names }: { names?: Names | null }) {
  if (!names) return null
  const rows: [string, string][] = [
    ['Ad', names.ad],
    ['Ad set', names.ad_set],
    ['Campaign', names.campaign],
    ...names.files.map((f): [string, string] => ['File', f]),
    ['Link tags', `?${names.tags}`],
  ]
  return (
    <details className="paragraph-xs text-tertiary">
      <summary className="cursor-pointer select-none hover:text-secondary">Names and link tags</summary>
      <dl className="mt-1 grid grid-cols-[auto_1fr_auto] items-center gap-x-2 gap-y-1">
        {rows.map(([k, v], i) => (
          <div key={i} className="contents">
            <dt className="text-tertiary">{k}</dt>
            <dd className="min-w-0 font-mono text-secondary [overflow-wrap:anywhere]">{v}</dd>
            <CopyButton value={v} />
          </div>
        ))}
      </dl>
    </details>
  )
}
