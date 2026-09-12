import { useSession } from '../../../contexts/session-context'
import type { Experience } from '../feature-keys'

/**
 * The experience this person gets in the active workspace: 'basic' | 'team' | 'agency'.
 *
 * `experience` is what the backend resolved for the caller (staff are always 'agency');
 * `profile` is the workspace's own setting. Fail-open to 'team' (today's UI), never to
 * 'basic'. Prefer gating on a feature flag (useFeatures) — this is for copy and vocabulary,
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
