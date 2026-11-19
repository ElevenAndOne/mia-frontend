// Site guides: a brand guide for a business's first website (mia-backend services/site_guide).

export type GuideStatus = 'none' | 'building' | 'draft' | 'checked' | 'approved' | 'failed'

export interface WorkspaceRow {
  tenant_id: string
  name: string
  experience: string
  website: string
  page_read: boolean
  photos?: number
  workspace_created?: string | null
  status: GuideStatus | null
  step: string | null
  built_at: string | null
  version: number | null
  error: string | null
}

export interface NamedColour {
  hex: string
  name: string
  from: string
}

export interface PhotoPick {
  n: number
  use: string
  file: string
}

export interface DomainRow {
  name: string
  why: string
  problem: string | null
  free: Record<string, boolean | null>
}

export interface Guide {
  name: string
  built_at: string
  logo: { found: boolean; use: 'full' | 'simple'; has_simple: boolean; says?: string }
  colours: {
    roles: Record<string, string>
    named: Record<string, NamedColour>
    measured: { hex: string; sources: string[] }[]
  }
  fonts: {
    heading: { family: string; candidates: string[] }
    body: { family: string; candidates: string[] }
  }
  device: { kind: string }
  photos: { hero_n: number | null; picks: PhotoPick[]; full_size: number[]; missing: string[] }
  voice: { taglines: { line: string; from: 'theirs' | 'suggested' }[] }
  domain: { rows: DomainRow[]; choice: { name: string; buy: string[]; cost_zar: number } | null; endings?: string[] }
  questions_for_pitch: string[]
  designer_note?: string
  edited?: string[]
}

export interface GuideFile {
  name: string
  kind: string
  size: number
}

export interface GuideResponse {
  tenant_id: string
  name: string
  status: GuideStatus
  step?: string | null
  error?: string | null
  version?: number
  built_at?: string | null
  built_by?: string | null
  status_by?: string | null
  status_at?: string | null
  guide?: Guide | null
  edits?: Record<string, unknown>
  files?: GuideFile[]
  pages?: number
}

export interface Edits {
  colours?: Record<string, string>
  heading_font?: string
  body_font?: string
  hero_n?: number
  tagline?: string
  device?: string
  domain?: string
  logo?: 'full' | 'simple'
  note?: string
  reset?: boolean
}
