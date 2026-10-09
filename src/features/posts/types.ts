// Quick Posts — campaign-less scheduled organic posts (backend: models/scheduled_post.py).

export type PostStatus =
  | 'draft'
  | 'scheduled'
  | 'publishing'
  | 'published'
  | 'failed'
  | 'canceled'
  | 'reminded'

export type PublishMode = 'native_fb' | 'mia' | 'manual'

export interface ScheduledPost {
  post_id: string
  tenant_id: string
  campaign_id: string | null
  source_document_id: string | null
  source_conversation_id: string | null
  platform: 'facebook' | 'instagram' | 'linkedin'
  target_ref: Record<string, string>
  target_name: string | null
  title: string | null
  copy: string
  media_urls: string[]
  scheduled_at: string
  timezone: string
  status: PostStatus
  publish_mode: PublishMode
  platform_post_id: string | null
  permalink: string | null
  /** Set when the owner removed a published Instagram post in Mia. Meta's API cannot delete
   *  Instagram media, so the row waits here until they confirm it is gone from Instagram. */
  manual_delete_at: string | null
  error: string | null
  retry_count: number
  created_by: string | null
  confirmed_at: string | null
  published_at: string | null
  created_at: string | null
}

export interface PostListResponse {
  posts: ScheduledPost[]
  counts: Partial<Record<PostStatus, number>>
}

// ── Team ideas (backend: models/post_item.py, routes/post_items_api.py) ──────────────────

export type PostItemStatus = 'received' | 'idea' | 'waiting' | 'approved' | 'not_used' | 'live' | 'dropped'

export interface PostItemDraft {
  index: number
  copy: string | null
  hashtags: string | null
  platform: 'facebook' | 'instagram' | string
  media_url: string | null
  card_url: string | null
  scheduled_at: string | null
  document_id: string | null
  title: string | null
}

export interface PostItemDecision {
  index: number
  decision: 'pending' | 'approved' | 'not_used'
  by?: string | null
  by_name?: string | null
  at?: string | null
  reason?: string | null
  post_id?: string | null
  scheduled_at?: string | null
  platform?: string | null
}

export interface PostItem {
  id: string
  status: PostItemStatus
  source: string
  submitted_by: string | null
  sender_name: string | null
  note: string | null
  photo_urls: string[]
  conversation_id: string | null
  chosen: { indexes?: number[]; platforms?: string[] }
  decisions: PostItemDecision[]
  drafts: PostItemDraft[]
  reason: string | null
  decided_by_name: string | null
  decided_at: string | null
  posts: Array<{ post_id: string; status: PostStatus; platform: string; scheduled_at: string | null; permalink: string | null }>
  created_at: string | null
  updated_at: string | null
}

export interface PostItemListResponse {
  items: PostItem[]
  counts: Partial<Record<PostItemStatus, number>>
}
