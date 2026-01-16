import { useState } from 'react'

export const useOAuthHandler = () => {
  // Track OAuth loading state (shows LoadingScreen at App level when popup closes)
  const [oauthLoadingPlatform, setOauthLoadingPlatform] = useState<'google' | 'meta' | null>(null)

  const isOAuthLoading = oauthLoadingPlatform !== null

  const setOAuthLoading = (platform: 'google' | 'meta' | null) => {
    setOauthLoadingPlatform(platform)
  }

  const clearOAuthLoading = () => {
    setOauthLoadingPlatform(null)
  }

  return {
    oauthLoadingPlatform,
    isOAuthLoading,
    setOAuthLoading,
    clearOAuthLoading
  }
}
