/**
 * Authentication types
 */

export interface UserProfile {
  name: string
  email: string
  picture_url: string
  google_user_id: string
  meta_user_id?: string
  onboarding_completed?: boolean
}

export interface MetaUser {
  id: string
  name: string
  email?: string
}

export interface MetaAuthState {
  isMetaAuthenticated: boolean
  metaUser: MetaUser | null
}
