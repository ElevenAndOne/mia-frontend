import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { Spinner } from '../../../components/spinner'
import { TopBar } from '../../../components/top-bar'
import { MemoCanvasDrawer, type MemoCanvasTarget } from '../components/memo-canvas-drawer'
import { MemoRecCard } from '../components/memo-rec-card'
import { useMemoPage } from '../hooks/use-memo'
import { useSession } from '../../../contexts/session-context'
import { switchWorkspace } from '../../workspace/services/workspace-service'
import { heldBackLines, money, summariseReviewed } from '../utils/memo-format'

interface MemoViewProps {
  onBack?: () => void
}

export const MemoView = ({ onBack }: MemoViewProps) => {
  const { memo, open, handled, isLoading, error, canManage, busyRecId, approve, dismiss, scheduleDraft, redraft } =
    useMemoPage()
  const currency = memo?.memo?.currency ?? 'ZAR'
  const heldBack = heldBackLines(memo?.memo?.disclosure, currency)
  const impact = memo?.memo?.impact_zar ?? null
  const reviewed = summariseReviewed(memo?.memo, currency)
  const [canvasTarget, setCanvasTarget] = useState<MemoCanvasTarget | null>(null)
  // Email deep link: /memo?ws=<tenant_id> must land on THAT workspace's memo, not
  // whichever one happens to be active (found 2026-08-31 — a Dutoit email opened
  // on Humewood). Switch, then reload this page with the param consumed.
  const { sessionId: memoSessionId, activeWorkspace: currentWs, availableWorkspaces } = useSession()
  const [searchParams] = useSearchParams()
  const switching = useRef(false)
  useEffect(() => {
    const ws = searchParams.get('ws')
    if (!ws || !memoSessionId || switching.current) return
    if (currentWs?.tenant_id === ws) {
      window.history.replaceState(null, '', '/memo')
      return
    }
    if (!availableWorkspaces.some((w) => w.tenant_id === ws)) return
    switching.current = true
    void switchWorkspace(memoSessionId, ws)
      .then(() => window.location.replace('/memo'))
      .catch(() => {
        switching.current = false
      })
  }, [searchParams, memoSessionId, currentWs?.tenant_id, availableWorkspaces])
  const openDraft = (conversationId: string, documentId?: string) =>
    setCanvasTarget({ conversationId, documentId })

  return (
    <div className="w-full h-dvh bg-primary flex flex-col overflow-hidden">
      <TopBar title="Weekly Memo" onBack={onBack} className="border-b border-secondary" />
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-10 flex flex-col gap-8">
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
              <div className="flex items-start justify-between gap-6 flex-wrap">
                <div className="flex flex-col gap-2 min-w-0">
                  <p className="label-xs uppercase tracking-wider text-quaternary">
                    Week of {memo.week_of}
                  </p>
                  <h1 className="label-lg text-primary">
                    {open.length > 0
                      ? `${open.length} decision${open.length === 1 ? '' : 's'} waiting`
                      : handled.length > 0
                        ? "You've handled everything in this week's memo"
                        : 'Nothing needs your attention this week'}
                  </h1>
                  {reviewed && <p className="paragraph-sm text-tertiary">{reviewed}</p>}
                </div>
                {impact !== null && open.length > 0 && (
                  <div className="text-right shrink-0">
                    <p className="label-xs uppercase tracking-wider text-quaternary">
                      If you approve all
                    </p>
                    <p className="label-lg text-success tabular-nums">
                      +{money(impact, currency)}
                      <span className="paragraph-sm text-tertiary font-normal">/mo</span>
                    </p>
                  </div>
                )}
              </div>

              {memo.memo?.narrative && open.length > 1 && (
                <p className="paragraph-md text-secondary -mt-3 max-w-3xl">
                  {memo.memo.narrative.replaceAll('**', '')}
                </p>
              )}

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
                    onScheduleDraft={scheduleDraft}
                    onOpenDraft={openDraft}
                    onRedraft={redraft}
                  />
                ))}
                {open.length === 0 && (
                  <div className="rounded-2xl border border-secondary bg-primary p-6 text-center">
                    <p className="paragraph-sm text-tertiary">
                      {handled.length > 0
                        ? 'Everything Mia raised this week has been dealt with. She checks again on Monday.'
                        : 'Every campaign is running inside its normal range. Mia will check again on Monday.'}
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
                    onScheduleDraft={scheduleDraft}
                    onOpenDraft={openDraft}
                    onRedraft={redraft}
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
      <MemoCanvasDrawer target={canvasTarget} onClose={() => setCanvasTarget(null)} />
    </div>
  )
}
