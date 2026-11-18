import { useMemo, useState } from 'react'
import { Button } from '../../components/button'
import { ConfirmDialog } from '../../components/confirm-dialog'
import { SegmentedControl } from '../../components/segmented-control'
import { Spinner } from '../../components/spinner'
import { useSession } from '../../contexts/session-context'
import { RuleRow } from './components/rule-row'
import { TestPost } from './components/test-post'
import { useDecisions, useMe, useRules } from './hooks/use-house-rules'
import { HouseRulesError } from './services/house-rules-service'
import type { HouseRule, RuleKind } from './types'

type Filter = 'waiting' | 'live' | 'off'

const IN_FILTER: Record<Filter, (r: HouseRule) => boolean> = {
  waiting: (r) => r.status === 'proposed',
  live: (r) => r.status === 'active',
  off: (r) => r.status === 'rejected' || r.status === 'retired',
}

const INTRO: Record<RuleKind, string> = {
  slop: 'Lines any post could start with, whatever it’s about. Approve one and Mia stops writing it. A client’s own posts are never flagged.',
  platform_fact:
    'How each platform works right now, each with its source. Mia checks every 90 days and brings changes here. Nothing changes until you approve it.',
}

const EMPTY: Record<RuleKind, Record<Filter, string>> = {
  slop: {
    waiting: 'Nothing waiting. New lines show up here when someone suggests one.',
    live: 'No lines are live yet.',
    off: 'Nothing rejected or stopped.',
  },
  platform_fact: {
    waiting: 'No platform facts yet. Mia’s first check of the platforms brings them here for you to approve.',
    live: 'No platform facts are live yet.',
    off: 'Nothing rejected or stopped.',
  },
}

function RuleList({ kind, sessionId }: { kind: RuleKind; sessionId: string | null }) {
  const [filter, setFilter] = useState<Filter>('waiting')
  const [confirmAll, setConfirmAll] = useState(false)
  const rules = useRules(sessionId, kind, true)
  const { one, many } = useDecisions(sessionId)
  const all = useMemo(() => rules.data?.rules ?? [], [rules.data])
  const count = (f: Filter) => all.filter(IN_FILTER[f]).length
  const shown = all.filter(IN_FILTER[filter])
  const waitingIds = all.filter(IN_FILTER.waiting).map((r) => r.id)
  const busyId = one.isPending ? one.variables?.id : undefined
  const noun = kind === 'slop' ? 'line' : 'fact'

  if (rules.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="md" />
      </div>
    )
  }
  if (rules.isError) {
    return (
      <div className="flex flex-col items-start gap-3 py-8">
        <span className="paragraph-md text-secondary">
          {rules.error instanceof Error ? rules.error.message : 'The list didn’t load.'}
        </span>
        <Button variant="secondary" onClick={() => rules.refetch()}>
          Try again
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="m-0 max-w-2xl paragraph-md text-secondary">{INTRO[kind]}</p>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'waiting', label: `Waiting ${count('waiting')}` },
            { value: 'live', label: `Live ${count('live')}` },
            { value: 'off', label: `Turned off ${count('off')}` },
          ]}
        />
        {filter === 'waiting' && waitingIds.length > 1 && (
          <Button variant="primary" loading={many.isPending} onClick={() => setConfirmAll(true)}>
            Approve all {waitingIds.length}
          </Button>
        )}
      </div>

      {shown.length === 0 ? (
        <p className="m-0 py-6 paragraph-md text-tertiary">{EMPTY[kind][filter]}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {shown.map((r) => (
            <RuleRow
              key={r.id}
              rule={r}
              busy={busyId === r.id || many.isPending}
              onDecide={(decision, note) => one.mutate({ id: r.id, decision, note })}
            />
          ))}
        </ul>
      )}

      <ConfirmDialog
        isOpen={confirmAll}
        message={`Approve all ${waitingIds.length} waiting ${noun}s? ${
          kind === 'slop' ? 'Mia will stop writing every one of them.' : 'Mia will follow every one of them.'
        } You can stop using any of them later.`}
        confirmLabel={`Approve all ${waitingIds.length}`}
        confirmVariant="primary"
        onCancel={() => setConfirmAll(false)}
        onConfirm={() => {
          setConfirmAll(false)
          // exactly the rows on screen: a line suggested after the page loaded is never approved unseen
          many.mutate({ ids: waitingIds, decision: 'approve' })
        }}
      />
    </div>
  )
}

export default function HouseRulesView() {
  const { sessionId } = useSession()
  const [tab, setTab] = useState<RuleKind>('slop')
  const me = useMe(sessionId)
  const facts = useRules(sessionId, 'platform_fact', me.isSuccess)
  const newFacts = (facts.data?.rules ?? []).filter((r) => r.status === 'proposed').length

  let body
  if (me.isLoading) {
    body = (
      <div className="flex justify-center py-24">
        <Spinner size="md" />
      </div>
    )
  } else if (me.isError) {
    const denied = me.error instanceof HouseRulesError && me.error.status === 403
    body = (
      <div className="flex flex-col gap-2 py-16">
        <span className="title-h5 text-primary">{denied ? 'This page isn’t open to you' : 'This page didn’t load'}</span>
        <span className="paragraph-md text-secondary">
          {denied
            ? 'It’s only for the people who approve Mia’s house rules. Ask Josh if you need it.'
            : me.error instanceof Error
              ? me.error.message
              : 'Try again in a moment.'}
        </span>
      </div>
    )
  } else {
    body = (
      <>
        <SegmentedControl<RuleKind>
          size="md"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'slop', label: 'Lines to avoid' },
            { value: 'platform_fact', label: newFacts ? `Platform facts · ${newFacts} new` : 'Platform facts' },
          ]}
        />
        <RuleList key={tab} kind={tab} sessionId={sessionId} />
        {tab === 'slop' && <TestPost sessionId={sessionId} />}
      </>
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-secondary">
      <div className="mx-auto flex max-w-3xl flex-col gap-7 px-4 pt-8 pb-16 sm:px-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <span className="label-xs uppercase tracking-wider text-tertiary">Mia · House rules</span>
            <h1 className="m-0 title-h3 text-primary">What Mia never writes</h1>
          </div>
          {me.data?.email && <span className="paragraph-sm text-tertiary">Signed in as {me.data.name || me.data.email}</span>}
        </header>
        {body}
      </div>
    </div>
  )
}
