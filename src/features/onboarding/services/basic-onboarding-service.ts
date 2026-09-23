import { apiFetch } from '../../../utils/api'

/** One thing that either is or is not in place, in words a client would use. */
export interface ReadinessStep {
  key: 'page' | 'history' | 'brand' | 'website'
  done: boolean
  label: string
  detail: string
}

export interface Readiness {
  experience: 'basic' | 'team' | 'agency'
  /** `linked: false` means we found it at sign-up but it is not attached to this workspace
   *  yet — confirming on the first screen is what attaches it. */
  page: { id: string; name: string; linked: boolean } | null
  /** `publishable: false` means no Business Instagram is linked to the Page — which is also
   *  what a personal account looks like from here, and no permission can post to one. */
  instagram: { id: string | null; username: string | null; publishable: boolean } | null
  steps: ReadinessStep[]
  can_make_posts: boolean
  /** Enough in place to move on — only a Page is required. */
  well_grounded: boolean
  /** Everything, including the optional reads. */
  fully_grounded?: boolean
  /** What they probably are, from what they connected — no ad accounts means basic. */
  suggested_experience?: 'basic' | 'team' | 'agency'
  /** Which onboarding to show: the suggestion until they finish, the stored value after. */
  effective_experience?: 'basic' | 'team' | 'agency'
  platforms_connected?: string[]
}

/**
 * What this workspace still needs before Mia can write well.
 *
 * Not a progress bar over screens — a report on whether the grounding the photo flow depends
 * on actually exists. Never throws for a reason the caller can do nothing about: a workspace
 * we cannot read reads as "nothing in place yet", which is what the screens should show.
 */
export const fetchReadiness = async (sessionId: string): Promise<Readiness | null> => {
  try {
    const r = await apiFetch(`/api/onboarding/basic/readiness?session_id=${encodeURIComponent(sessionId)}`)
    if (!r.ok) return null
    return (await r.json()) as Readiness
  } catch {
    return null
  }
}

/**
 * Start the read: their posts, a voice, and the website if they gave one.
 *
 * Returns as soon as the work is queued — it takes about a minute, and the readiness poll is
 * how the screen follows it. Waiting on a task id would be the same wait wearing a spinner.
 */
export const startReading = async (
  sessionId: string,
  website: string
): Promise<boolean> => {
  try {
    const r = await apiFetch('/api/onboarding/basic/read-pages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, website: website.trim() || null }),
    })
    return r.ok
  } catch {
    return false
  }
}

/**
 * Attach the Page we found at sign-up to this workspace.
 *
 * Signing up with Facebook already granted everything needed to read a Page, so by the time
 * this screen renders Mia is usually holding one. This is the client saying yes to it —
 * nothing is written to a workspace until they do.
 *
 * It posts to the same endpoint the Integrations picker uses rather than a second one: the
 * Page token is read back from the sign-up cache server-side, so there is nothing to pass.
 */
export const linkFoundPage = async (
  sessionId: string,
  page: { id: string; name: string },
  instagram?: { id: string | null; username: string | null } | null
): Promise<boolean> => {
  try {
    const r = await apiFetch('/api/oauth/meta/organic/link-page', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Session-ID': sessionId },
      body: JSON.stringify({
        page_id: page.id,
        page_name: page.name,
        instagram_account_id: instagram?.id ?? null,
        instagram_username: instagram?.username ?? null,
      }),
    })
    return r.ok
  } catch {
    return false
  }
}

/**
 * Finish, and settle which experience this workspace is.
 *
 * Nothing used to write it down. The column defaults to "team" for every new workspace, the
 * suggestion was computed only for the life of a readiness call, and "Take me in" just
 * navigated — so a sole owner who had been through the Basic flow landed on a home page
 * with Campaigns, Scheduler and a Budget Tracker in the sidebar.
 *
 * Returns the experience that was applied, so the caller knows whether the shell it is
 * about to show is the right one.
 */
export const completeBasicOnboarding = async (
  sessionId: string
): Promise<{ experience: string } | null> => {
  try {
    const r = await apiFetch('/api/onboarding/basic/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId }),
    })
    if (!r.ok) return null
    return await r.json()
  } catch {
    return null
  }
}
