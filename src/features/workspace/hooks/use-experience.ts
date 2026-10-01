import { useSession } from '../../../contexts/session-context'
import type { Experience } from '../feature-keys'

/**
 * The experience this person gets in the active workspace: 'basic' | 'team' | 'agency'.
 *
 * `experience` is the workspace's experience, the same for every member of it, staff
 * included (30 Sep 2026); `profile` is the stored column. Missing (not loaded yet) reads
 * as 'team', which renders the same app as Agency. Prefer gating on a feature flag (useFeatures) — this is for copy and vocabulary,
 * e.g. never saying "campaign" to a Basic owner.
 */
export function useExperience() {
  const { activeWorkspace } = useSession()
  const experience: Experience = activeWorkspace?.experience ?? 'team'
  const profile: Experience = activeWorkspace?.experience_profile ?? 'team'
  return {
    experience,
    profile,
    isBasic: experience === 'basic',
    isTeam: experience === 'team',
    isAgency: experience === 'agency',
  }
}
