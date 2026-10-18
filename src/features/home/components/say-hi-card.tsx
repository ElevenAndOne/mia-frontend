import { useEffect, useState } from 'react'
import { useSession } from '../../../contexts/session-context'
import { fetchWhatsAppNumber } from '../../workspace/services/whatsapp-number-service'
import { openWhatsAppChat } from '../../../utils/whatsapp-share'

/**
 * "Say hi to Mia" on the Basic home, for an owner who skipped the Say hi step at sign-up: the
 * first posts are made on WhatsApp, so the way there stays one tap away until they've said hi
 * (phone test, 18 Oct 2026). Gone once the first chat has started.
 */
export const SayHiCard = () => {
  const { sessionId, activeWorkspace } = useSession()
  const tenantId = activeWorkspace?.tenant_id ?? null
  const [urls, setUrls] = useState<{ web: string; app: string | null } | null>(null)

  useEffect(() => {
    if (!sessionId || !tenantId) return
    let live = true
    fetchWhatsAppNumber(sessionId)
      .then((state) => {
        if (!live || state.unavailable || state.first_run !== 'not_started') return
        const web = state.say_hi_url || state.start_chat_url
        if (web) setUrls({ web, app: state.say_hi_app_url || null })
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [sessionId, tenantId])

  if (!urls) return null
  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-secondary p-4">
      <p className="paragraph-sm text-primary">Your first three posts are made on WhatsApp.</p>
      <p className="paragraph-xs text-tertiary">Say hi to Mia and she'll ask a quick question or two, then make them.</p>
      <a
        className="rounded-lg bg-brand-solid px-4 py-2.5 text-center paragraph-sm font-semibold text-white"
        href={urls.web}
        target="_blank"
        rel="noreferrer"
        onClick={(e) => {
          if (openWhatsAppChat(urls.app, urls.web)) e.preventDefault()
        }}
      >
        Say hi to Mia on WhatsApp
      </a>
    </div>
  )
}
