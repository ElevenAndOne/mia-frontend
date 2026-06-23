import type { ClickUpUpdateResult } from '../../types'

interface Props {
  result: ClickUpUpdateResult | null
  updating: boolean
  error: string
  onClose: () => void
}

export const ClickUpUpdateModal = ({ result, updating, error, onClose }: Props) => {
  const errorCount = result?.errors?.length ?? 0
  return (
    <div className="campaign-workspace fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-secondary border border-secondary rounded-2xl p-6 max-w-sm w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="subheading-md text-primary mb-4">ClickUp Update</h3>
        {updating && <p className="paragraph-sm text-secondary mb-4">Updating ClickUp tasks…</p>}
        {error && !updating && <p className="paragraph-sm text-utility-error-700 mb-4">{error}</p>}
        {result && !updating && (
          <div className="space-y-2 mb-4">
            <div className={`rounded-lg p-3 flex items-center gap-3 border ${errorCount === 0 ? 'bg-utility-success-100 border-utility-success-300' : 'bg-utility-warning-100 border-utility-warning-300'}`}>
              <span className="paragraph-sm text-primary">
                {result.tasks_updated ?? 0} updated · {result.tasks_created ?? 0} created · {result.tasks_deleted ?? 0} deleted
              </span>
            </div>
            {errorCount > 0 && (
              <div className="text-xs text-utility-error-700 space-y-1 max-h-32 overflow-y-auto">
                {result.errors!.map((e, i) => <p key={i}>{e.type}: {e.error}</p>)}
              </div>
            )}
          </div>
        )}
        <button onClick={onClose} className="w-full px-4 py-3 bg-tertiary text-secondary rounded-lg subheading-sm hover:bg-quaternary">Close</button>
      </div>
    </div>
  )
}
