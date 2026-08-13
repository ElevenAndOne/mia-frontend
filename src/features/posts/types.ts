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
