import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSession } from '../../../contexts/session-context'
import type { MetaAccountSelectionItem } from '../types'

interface UseMetaAccountSelectionParams {
  onAccountSelected: () => void
}

export const useMetaAccountSelection = ({ onAccountSelected }: UseMetaAccountSelectionParams) => {
  const {
    availableAccounts,
    selectAccount,
    isLoading,
    error,
    clearError,
    metaUser,
    refreshAccounts,
  } = useSession()
  const [selectingAccountId, setSelectingAccountId] = useState<string | null>(null)
  const [isFetchingAccounts, setIsFetchingAccounts] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const hasFetchedRef = useRef(false)

  const metaAccounts = useMemo(() => {
    return availableAccounts.filter((account) =>
      account.id.startsWith('meta_') || (account.meta_ads_id && !account.google_ads_id)
    )
  }, [availableAccounts])

  const metaAccountItems = useMemo<MetaAccountSelectionItem[]>(() => {
    return metaAccounts.map((account) => ({
      id: account.id,
      name: account.name,
      metaAdsId: account.meta_ads_id,
      isSelecting: selectingAccountId === account.id,
      disabled: Boolean(selectingAccountId && selectingAccountId !== account.id),
    }))
  }, [metaAccounts, selectingAccountId])

  const fetchAccounts = useCallback(async () => {
    try {
      setIsFetchingAccounts(true)
      setFetchError(null)
      await refreshAccounts()
    } catch (err) {
      console.error('[META-ACCOUNT-SELECTION] Error fetching accounts:', err)
      setFetchError('Failed to load accounts. Please try again.')
      setIsFetchingAccounts(false)
    }
  }, [refreshAccounts])

  useEffect(() => {
    if (hasFetchedRef.current) return
    hasFetchedRef.current = true
    fetchAccounts()
  }, [fetchAccounts])

  useEffect(() => {
    if (availableAccounts.length > 0 && isFetchingAccounts) {
      setIsFetchingAccounts(false)
    }
  }, [availableAccounts.length, isFetchingAccounts])

  const handleAccountSelect = useCallback(async (accountId: string) => {
    if (selectingAccountId) return

    setSelectingAccountId(accountId)
    clearError()

    try {
      const success = await selectAccount(accountId)
      if (success) {
        onAccountSelected()
      } else {
        throw new Error('Failed to select account')
      }
    } catch (err) {
      console.error('[META-ACCOUNT-SELECTION] Error selecting account:', err)
      setFetchError(err instanceof Error ? err.message : 'Failed to select account')
    } finally {
      setSelectingAccountId(null)
    }
  }, [selectingAccountId, clearError, selectAccount, onAccountSelected])

  const errorMessage = error || fetchError
  const isPageLoading = isFetchingAccounts || (isLoading && metaAccounts.length === 0)

  return {
    metaUser,
    metaAccountItems,
    errorMessage,
    isPageLoading,
    handleAccountSelect,
  }
}
