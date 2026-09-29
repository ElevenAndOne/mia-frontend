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
  /** 11&1 staff (user_profiles.is_staff). Only they see the experience switcher and the
   *  feature switches; the server refuses everyone else regardless (29 Sep 2026). */
  is_staff?: boolean
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
