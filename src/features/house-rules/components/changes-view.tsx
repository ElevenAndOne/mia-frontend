import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '../../../components/button'
import { SegmentedControl } from '../../../components/segmented-control'
import { Spinner } from '../../../components/spinner'
import { useBenchmarks, useClientNotes, useNews, useNewsDecision, useRunJob } from '../hooks/use-house-rules'
import type { NewsCard as Card } from '../types'
import { ClientTrends } from './client-trends'
import { ago } from './format'
import { NewsCard } from './news-card'

type Filter = 'new' | 'mia' | 'kept' | 'ignored'

/** Mia closed it herself (the morning run), and nobody has decided it since. One she did her part on that still holds
 * something for a person stays in New until they decide it, then sits in Kept or Ignored as theirs. */
const byMia = (c: Card) => (c.mia_did?.length ?? 0) > 0 && c.decided_by === 'Mia' && c.status !== 'ignored'

const IN_FILTER: Record<Filter, (c: Card) => boolean> = {
  new: (c) => c.status === 'new',
  mia: (c) => byMia(c),
  kept: (c) => (c.status === 'kept' || c.status === 'made_rule') && !byMia(c),
  ignored: (c) => c.status === 'ignored',
}

const EMPTY: Record<Filter, string> = {
  new: 'Nothing new. Mia checks Meta, Google and the trade press every morning.',
  mia: 'Mia hasn’t handled anything herself yet.',
  kept: 'Nothing kept yet.',
  ignored: 'Nothing ignored.',
}

/** The "What's changing" tab: our clients' numbers, then the platform news cards. */
export function ChangesView({ sessionId }: { sessionId: string | null }) {
  const qc = useQueryClient()
  const [filter, setFilter] = useState<Filter>('new')
  const news = useNews(sessionId, true)
  const bench = useBenchmarks(sessionId, true)
  const decide = useNewsDecision(sessionId)
  const notes = useClientNotes(sessionId)
  const run = useRunJob(sessionId)
  const jobs = news.data?.jobs
  const newsRunning = !!jobs?.platform_news.running || (run.isPending && run.variables === 'platform_news')
  const benchRunning = !!jobs?.platform_benchmarks.running || (run.isPending && run.variables === 'platform_benchmarks')

  // When a background check finishes, the numbers table and the rules may have changed too.
  const wasRunning = useRef(false)
  const anyRunning = Object.values(jobs ?? {}).some((j) => j.running)
  useEffect(() => {
    if (wasRunning.current && !anyRunning) qc.invalidateQueries({ queryKey: ['house-rules'] })
    wasRunning.current = anyRunning
  }, [anyRunning, qc])

  if (news.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="md" />
      </div>
    )
  }
  if (news.isError) {
    return (
      <div className="flex flex-col items-start gap-3 py-8">
        <span className="paragraph-md text-secondary">
          {news.error instanceof Error ? news.error.message : 'The news didn’t load.'}
        </span>
        <Button variant="secondary" onClick={() => news.refetch()}>
          Try again
        </Button>
      </div>
    )
  }

  const cards = news.data?.cards ?? []
  const count = (f: Filter) => cards.filter(IN_FILTER[f]).length
  // Our clients' moves first: they're ours alone. Then the most important news, newest first.
  const shown = cards
    .filter(IN_FILTER[filter])
    .sort((a, b) => Number(b.kind === 'trend') - Number(a.kind === 'trend') || Number(b.importance === 'high') - Number(a.importance === 'high'))
  const lastNews = ago(jobs?.platform_news.last_ok_at ?? null)

  return (
    <div className="flex flex-col gap-6">
      <ClientTrends
        weeks={bench.data?.weeks ?? []}
        lastRun={jobs?.platform_benchmarks.last_ok_at ?? null}
        running={benchRunning}
        onRefresh={() => run.mutate('platform_benchmarks')}
      />

      <div className="flex flex-col gap-4">
        <h2 className="m-0 title-h6 text-primary">What the platforms changed</h2>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SegmentedControl<Filter>
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'new', label: `New ${count('new')}` },
              // Only there once she has done something: one less tab to read until then.
              ...(count('mia') > 0 || filter === 'mia' ? [{ value: 'mia' as Filter, label: `Mia did ${count('mia')}` }] : []),
              { value: 'kept', label: `Kept ${count('kept')}` },
              { value: 'ignored', label: `Ignored ${count('ignored')}` },
            ]}
          />
          <div className="flex items-center gap-3">
            {lastNews && !newsRunning && <span className="paragraph-sm text-tertiary">Updated {lastNews}</span>}
            <Button variant="secondary" size="sm" loading={newsRunning} onClick={() => run.mutate('platform_news')}>
              {newsRunning ? 'Updating…' : 'Update now'}
            </Button>
          </div>
        </div>

        {shown.length === 0 ? (
          <p className="m-0 py-6 paragraph-md text-tertiary">{EMPTY[filter]}</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {shown.map((c) => (
              <NewsCard
                key={c.id}
                card={c}
                busy={decide.isPending && decide.variables?.id === c.id}
                notesBusy={notes.isPending && notes.variables?.id === c.id}
                onDecide={(decision, ruleText) => decide.mutate({ id: c.id, decision, ruleText })}
                onClientNotes={(takeBack, text) => notes.mutate({ id: c.id, takeBack, text })}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
