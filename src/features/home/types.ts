/**
 * Home brief — what the Basic home screen renders. Mirrors services/home_brief_service.py.
 * One brief per workspace per day: the best recent post (canvas), "Do this next" cards
 * and three "Ask Mia" chips, all built from the workspace's own data.
 */

export type CardSeverity = 'blocker' | 'action' | 'info'
export type CardState = 'open' | 'scheduled' | 'done' | 'dismissed'

export interface CardCta {
  label: string
  type: 'route' | 'chat_prompt' | 'action'
  route?: string
  prompt?: string
  post_id?: string | null
  permalink?: string | null
  opens_canvas?: boolean
}

export interface BriefCard {
  id: string
  kind: string
  severity: CardSeverity
  title: string
  sub: string
  cta: CardCta
  dismissible: boolean
  state: CardState
  primary?: boolean
  updated_at?: string
}

export interface BriefChip {
  id: string
  text: string
  prompt: string
  write_action: boolean
}

export interface BestPostTile {
  head: string
  body: string
}

export interface BestPost {
  post_id: string | null
  platform: 'facebook' | 'instagram' | string
  permalink: string | null
  image_url: string | null
  /** creative_assets id of the re-hosted photo (media library), when we have it. */
  asset_id?: string | null
  photo_description?: string | null
  text: string
  published_at: string | null
  weekday: string | null
  time: string | null
  format: string | null
  lead_metric: 'reactions' | 'reach' | string
  lead_value: number
  typical_value: number
  lift: number
  metrics: {
    likes: number
    comments: number
    shares: number
    views: number
    reach: number
    saves: number | null
    link_clicks: number | null
  }
  tiles: BestPostTile[]
  compared_against: number
  window_days: number
}

export interface HomeBrief {
  tenant_id: string
  date: string
  generated_at: string | null
  status: 'ok' | 'no_posts' | 'failed'
  window_days: number | null
  window_label: string
  posts_analysed: number | null
  best_post: BestPost | null
  cards: BriefCard[]
  chips: BriefChip[]
  meta: Record<string, unknown>
}

/** Fired by the schedule flow when a post is queued, so Home can turn its card over. */
export interface PostScheduledEvent {
  platform: string
  scheduled_at: string
  title?: string
}
