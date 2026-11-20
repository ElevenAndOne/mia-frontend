import { lazy, Suspense, useMemo } from 'react'
import { Skeleton } from '../../../components/skeleton'
import type { WorkspaceAlertSettings } from '../../whatsapp-alerts/types'
import { Card, Disclosure, FadeIn, Row, Section, Switch } from './settings-ui'

const MiaStyleTab = lazy(() => import('./mia-style-tab').then((m) => ({ default: m.MiaStyleTab })))
const NotesPanel = lazy(() =>
  import('../../notes/components/notes-panel').then((m) => ({ default: m.NotesPanel }))
)

/**
 * Settings → Mia, agency (UI polish, 19 Nov 2026): how she replies, the rules she always follows,
 * WhatsApp alerts (one switch and your number), and, for owners and admins, who has them on.
 */
interface Props {
  sessionId: string | null
  tenantId: string
  canManage: boolean
  alerts: WorkspaceAlertSettings | null
  alertsLoading: boolean
  alertsError: string | null
  myNumber: string
  onMyNumberChange: (v: string) => void
  mySubscribed: boolean
  onMySubscribedChange: (v: boolean) => void
  onSaveMine: () => void
  savingMine: boolean
  savedMine: boolean
  onToggleWorkspace: (on: boolean) => void
  togglingWorkspace: boolean
  onSendTest: () => void
  sendingTest: boolean
  testSentTo: string | null
}

// Placeholder blocks in the shape of what's coming, not a spinner (20 Nov 2026).
const Fallback = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 animate-pulse" aria-hidden="true">
    {[0, 1].map((i) => (
      <div key={i} className="rounded-xl border border-secondary bg-secondary p-4 space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-48" />
      </div>
    ))}
  </div>
)

const SaveMine = ({
  saving,
  saved,
  disabled,
  onSave,
}: {
  saving: boolean
  saved: boolean
  disabled: boolean
  onSave: () => void
}) => (
  <span className="inline-flex items-center gap-3">
    {saved && <span className="paragraph-xs text-success">Saved</span>}
    <button
      type="button"
      onClick={onSave}
      disabled={disabled}
      className="px-3.5 py-1.5 rounded-lg bg-brand-solid text-primary-onbrand subheading-md hover:bg-brand-solid-hover disabled:opacity-50 active:scale-[0.98] transition"
    >
      {saving ? 'Saving…' : 'Save'}
    </button>
  </span>
)

export const AgencyMiaTab = (p: Props) => {
  // A to Z; people with no name or email (no profile yet) last.
  const members = useMemo(
    () =>
      [...(p.alerts?.members ?? [])].sort((a, b) => {
        const an = a.name || a.email || ''
        const bn = b.name || b.email || ''
        return (an ? 0 : 1) - (bn ? 0 : 1) || an.localeCompare(bn, undefined, { sensitivity: 'base' })
      }),
    [p.alerts]
  )
  const on = members.filter((m) => m.whatsapp_alerts_subscribed).length
  const workspaceOn = !!p.alerts?.whatsapp_alerts_enabled

  return (
    <div className="flex flex-col gap-8">
      <FadeIn>
        <Section title="How Mia replies" hint="Her tone and length for you. Never her numbers.">
          <Suspense fallback={<Fallback />}>
            <MiaStyleTab sessionId={p.sessionId} tenantId={p.tenantId} canManage={p.canManage} />
          </Suspense>
        </Section>
      </FadeIn>

      <FadeIn delay={0.05}>
        <Section title="Rules" hint="Mia follows these in every chat and campaign here.">
          <Suspense fallback={<Fallback />}>
            <NotesPanel
              sessionId={p.sessionId}
              tenantId={p.tenantId}
              scope="workspace"
              title=""
              description=""
              placeholder="e.g. Every caption ends with the 18+ line."
            />
          </Suspense>
        </Section>
      </FadeIn>

      <FadeIn delay={0.1}>
        <Section title="WhatsApp alerts" hint="A message when a live campaign falls behind.">
          {p.alertsError && <p className="paragraph-xs text-error">{p.alertsError}</p>}
          {p.alertsLoading && !p.alerts ? (
            <Fallback />
          ) : (
            <Card>
              {/* Save sits beside what it saves, not alone in an empty strip (fresh-eyes pass, 20 Nov 2026). */}
              <Row title="Send me alerts">
                {!p.mySubscribed && <SaveMine saving={p.savingMine} saved={p.savedMine} disabled={p.savingMine || (p.mySubscribed && !p.myNumber.trim())} onSave={p.onSaveMine} />}
                <Switch label="Send me alerts" checked={p.mySubscribed} onChange={p.onMySubscribedChange} />
              </Row>
              {p.mySubscribed && (
                <div className="px-4 py-3 flex flex-wrap items-center gap-2">
                  <input
                    type="tel"
                    value={p.myNumber}
                    onChange={(e) => p.onMyNumberChange(e.target.value)}
                    placeholder="+27 82 123 4567"
                    aria-label="Your WhatsApp number"
                    className="flex-1 min-w-[12rem] px-3 py-2 bg-primary border border-primary rounded-lg paragraph-sm text-primary placeholder:text-quaternary focus:outline-none focus:border-brand-solid"
                  />
                  {p.myNumber && (
                    <button
                      type="button"
                      onClick={p.onSendTest}
                      disabled={p.sendingTest}
                      className="paragraph-xs text-tertiary hover:text-primary underline-offset-2 hover:underline disabled:opacity-50"
                    >
                      {p.sendingTest ? 'Sending…' : p.testSentTo ? `Sent to ${p.testSentTo}` : 'Send a test'}
                    </button>
                  )}
                  <span className="ml-auto"><SaveMine saving={p.savingMine} saved={p.savedMine} disabled={p.savingMine || (p.mySubscribed && !p.myNumber.trim())} onSave={p.onSaveMine} /></span>
                </div>
              )}
              {p.canManage && p.alerts && (
                <Row title="Alerts for this workspace" hint="Off stops them for everyone here.">
                  <Switch
                    label="Alerts for this workspace"
                    checked={p.alerts.whatsapp_alerts_enabled}
                    disabled={p.togglingWorkspace}
                    onChange={p.onToggleWorkspace}
                  />
                </Row>
              )}
              {p.canManage && members.length > 0 && (
                <Disclosure
                  id={`alerts-who:${p.tenantId}`}
                  title="Who gets them"
                  meta={workspaceOn ? `${on} of ${members.length} on` : 'Paused: alerts are off for this workspace'}
                >
                  <ul className="flex flex-col divide-y divide-tertiary">
                    {members.map((m) => (
                      <li key={m.user_id} className="flex items-center justify-between gap-3 py-2">
                        <span className="min-w-0">
                          <span className="block paragraph-sm text-primary truncate">
                            {m.is_current_user ? 'You' : m.name || m.email || 'Unnamed member'}
                          </span>
                          {m.whatsapp_number ? (
                            <span className="block paragraph-xs text-quaternary">{m.whatsapp_number}</span>
                          ) : null}
                        </span>
                        {/* Off for the whole workspace: nobody gets them, whatever their own switch says. */}
                        <span
                          className={`shrink-0 paragraph-xs px-2 py-0.5 rounded-full ${
                            m.whatsapp_alerts_subscribed && workspaceOn ? 'bg-success-primary text-success' : 'text-quaternary'
                          }`}
                        >
                          {!m.whatsapp_alerts_subscribed ? 'Off' : workspaceOn ? 'On' : 'Paused'}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Disclosure>
              )}
            </Card>
          )}
        </Section>
      </FadeIn>
    </div>
  )
}
