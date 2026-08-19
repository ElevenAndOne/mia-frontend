import { Spinner } from '../../../components/spinner'
import { TopBar } from '../../../components/top-bar'
import { MemoRecCard } from '../components/memo-rec-card'
import { useMemoPage } from '../hooks/use-memo'
import { heldBackLines, money } from '../utils/memo-format'

interface MemoViewProps {
  onBack?: () => void
}

export const MemoView = ({ onBack }: MemoViewProps) => {
  const { memo, open, handled, isLoading, error, canManage, busyRecId, approve, dismiss } =
    useMemoPage()
  const currency = memo?.memo?.currency ?? 'ZAR'
  const heldBack = heldBackLines(memo?.memo?.disclosure, currency)
  const impact = memo?.memo?.impact_zar ?? null

  return (
    <div className="w-full h-dvh bg-primary flex flex-col overflow-hidden">
      <TopBar title="Weekly Memo" onBack={onBack} className="border-b border-tertiary" />
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-2xl mx-auto px-4 md:px-6 py-10 flex flex-col gap-8">
          {isLoading && (
            <div className="flex justify-center py-16">
              <Spinner size="md" />
            </div>
          )}

          {!isLoading && error && (
            <div className="rounded-2xl border border-secondary bg-primary p-8 text-center">
              <p className="paragraph-sm text-error">{error}</p>
            </div>
          )}

          {!isLoading && !error && !memo && (
            <div className="rounded-2xl border border-secondary bg-primary p-8 text-center flex flex-col items-center gap-2">
              <p className="label-bg text-primary">Nothing to review yet</p>
              <p className="paragraph-sm text-tertiary">
                Mia writes a memo every Monday once your ad accounts have enough recent activity.
              </p>
            </div>
          )}

          {memo && (
            <>
              <div className="flex flex-col gap-3">
                <p className="paragraph-xs text-quaternary uppercase tracking-wide">
                  Week of {memo.week_of}
                </p>
                <h1 className="label-lg text-primary">
                  {open.length > 0
                    ? `${open.length} thing${open.length === 1 ? '' : 's'} worth doing this week`
                    : 'Nothing needs your attention this week'}
                </h1>
                {memo.memo?.narrative && (
                  <p className="paragraph-md text-secondary">
                    {memo.memo.narrative.replaceAll('**', '')}
                  </p>
                )}
                {impact !== null && open.length > 0 && (
                  <p className="paragraph-sm text-success">
                    Worth about {money(impact, currency)} a month if you approve them all.
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-3">
                {open.map((rec) => (
                  <MemoRecCard
                    key={rec.id}
                    rec={rec}
                    canManage={canManage}
                    busy={busyRecId === rec.id}
                    currency={currency}
                    onApprove={approve}
                    onDismiss={dismiss}
                  />
                ))}
                {open.length === 0 && (
                  <div className="rounded-2xl border border-secondary bg-primary p-6 text-center">
                    <p className="paragraph-sm text-tertiary">
                      Every campaign is running inside its normal range. Mia will check again on
                      Monday.
                    </p>
                  </div>
                )}
              </div>

              {handled.length > 0 && (
                <div className="flex flex-col gap-3">
                  <h2 className="label-bg text-secondary">Already handled</h2>
                  {handled.map((rec) => (
                    <MemoRecCard
                      key={rec.id}
                      rec={rec}
                      canManage={canManage}
                      busy={busyRecId === rec.id}
                      currency={currency}
                      onApprove={approve}
                      onDismiss={dismiss}
                    />
                  ))}
                </div>
              )}

              {heldBack.length > 0 && (
                <div className="flex flex-col gap-1">
                  {heldBack.map((line) => (
                    <p key={line} className="paragraph-xs text-quaternary">
                      {line}
                    </p>
                  ))}
                </div>
              )}

              <p className="paragraph-xs text-quaternary">
                Mia only acts after you approve, and anything paused can be switched back on.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
