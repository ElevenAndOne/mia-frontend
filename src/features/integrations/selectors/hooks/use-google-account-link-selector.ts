import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSession } from '../../../../contexts/session-context'
import { useSelectorState } from './use-selector-state'
import { fetchGoogleAdAccounts, fetchGoogleAuthStatus, linkGoogleAdsAccount } from '../../services/google-account-link-service'
import type { GoogleAccount } from '../../types'

interface UseGoogleAccountLinkSelectorParams {
  isOpen: boolean
  onClose: () => void
  onSuccess: (linkedAccountId: string) => void
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const useGoogleAccountLinkSelector = ({
  isOpen,
  onClose,
  onSuccess,
}: UseGoogleAccountLinkSelectorParams) => {
  const { sessionId, selectedAccount, refreshAccounts, user } = useSession()
  const [googleAccounts, setGoogleAccounts] = useState<GoogleAccount[]>([])
  const [state, actions] = useSelectorState<string>({ onClose })
  const { selectedId, isLoading, isSubmitting, error, success } = state
  const { setSelectedId, setIsLoading, setError, handleClose, resetState, withSubmitting } = actions

  const resolveGoogleUserId = useCallback(async () => {
    if (user?.google_user_id) return user.google_user_id
    if (!sessionId) return null

    for (let i = 0; i < 10; i += 1) {
      await delay(500)
      try {
        const status = await fetchGoogleAuthStatus(sessionId)
        const userId = status?.user_info?.id || status?.user_id
        if (status?.authenticated && userId) {
          return userId
        }
      } catch {
        // continue polling
      }
    }

    return null
  }, [user?.google_user_id, sessionId])

  const loadAccounts = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      if (!sessionId) {
        setError('Missing session. Please try again.')
        return
      }

      await refreshAccounts()
      const userId = await resolveGoogleUserId()
      if (!userId) {
        setError('User not authenticated with Google. Please try again.')
        return
      }

      const accounts = await fetchGoogleAdAccounts(sessionId, userId)
      setGoogleAccounts(accounts)
      if (accounts.length === 1) {
        setSelectedId(accounts[0].customer_id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Google Ads accounts')
    } finally {
      setIsLoading(false)
    }
  }, [sessionId, refreshAccounts, resolveGoogleUserId, setError, setIsLoading, setSelectedId])

  useEffect(() => {
    if (!isOpen) return
    resetState()
    loadAccounts()
  }, [isOpen, resetState, loadAccounts])

  const handleLinkAccount = useCallback(async () => {
    if (!sessionId || !selectedAccount) {
      setError('Please select a Google Ads account')
      return
    }

    if (!selectedId) {
      setError('Please select a Google Ads account')
      return
    }

    const selectedGoogle = googleAccounts.find((account) => account.customer_id === selectedId)

    await withSubmitting(async () => {
      await linkGoogleAdsAccount({
        sessionId,
        targetAccountId: selectedAccount.id,
        googleAdsCustomerId: selectedId,
        loginCustomerId: selectedGoogle?.login_customer_id,
      })
      await refreshAccounts()
      onSuccess(selectedId)
      handleClose()
    })
  }, [sessionId, selectedAccount, selectedId, googleAccounts, refreshAccounts, onSuccess, handleClose, setError, withSubmitting])

  const accountItems = useMemo(() => {
    return googleAccounts.map((account) => ({
      id: account.customer_id,
      title: account.descriptive_name || `Account ${account.customer_id}`,
      subtitle: `ID: ${account.customer_id}${account.manager ? ' (Manager Account)' : ''}`,
    }))
  }, [googleAccounts])

  return {
    isLoading,
    isSubmitting,
    error,
    success,
    selectedId,
    accountItems,
    isEmpty: googleAccounts.length === 0,
    subtitle: `Link to your ${selectedAccount?.name || 'account'}`,
    setSelectedId,
    handleLinkAccount,
    handleClose,
  }
}
